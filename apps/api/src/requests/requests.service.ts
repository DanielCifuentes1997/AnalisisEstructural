import { randomUUID } from "node:crypto";
import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import type {
  CreatePropertyRequestInput,
  HeatmapQuery,
} from "@proyecto/shared-types";
import { PrismaService } from "../prisma/prisma.service";
import { RequestStateMachine } from "../workflow/request-state-machine.service";
import { fuzzCoordinates } from "./geo-fuzzing.util";

interface PropertyRequestRow {
  id: string;
  citizen_id: string;
  reporter_name: string;
  address_text: string;
  housing_type: string;
  damages_json: unknown;
  priority_score: number;
  state: string;
  created_at: Date;
  updated_at: Date;
  latitude: number;
  longitude: number;
}

interface HeatmapRow {
  id: string;
  housing_type: string;
  state: string;
  created_at: Date;
  latitude: number;
  longitude: number;
}

@Injectable()
export class RequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stateMachine: RequestStateMachine,
  ) {}

  async create(citizenId: string, input: CreatePropertyRequestInput) {
    const id = randomUUID();
    const { latitude, longitude } = input.location;

    // Prisma no puede escribir el tipo geography(Point) via su query
    // builder normal (queda como "Unsupported" en el schema), asi que
    // insertamos con SQL crudo. photo_urls no tiene columna propia todavia,
    // se guarda dentro del JSONB flexible de damages_json.
    const damagesJsonWithPhotos = {
      ...input.damages_json,
      photo_urls: input.photo_urls,
    };

    const rows = await this.prisma.$queryRaw<PropertyRequestRow[]>`
      INSERT INTO "PropertyRequests"
        (id, citizen_id, geom, reporter_name, address_text, housing_type, damages_json, state, created_at, updated_at)
      VALUES (
        ${id},
        ${citizenId},
        ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
        ${input.reporter_name},
        ${input.address_text},
        ${input.housing_type}::"HousingType",
        ${JSON.stringify(damagesJsonWithPhotos)}::jsonb,
        'REQUESTED',
        now(),
        now()
      )
      RETURNING
        id, citizen_id, reporter_name, address_text, housing_type, damages_json, priority_score, state,
        created_at, updated_at,
        ST_Y(geom::geometry) AS latitude,
        ST_X(geom::geometry) AS longitude;
    `;

    const row = rows[0];
    if (!row) {
      throw new InternalServerErrorException("No se pudo crear la solicitud");
    }

    // Todavia no existe verificacion espacial automatizada (Emergency
    // polygons, Seccion 42), asi que la solicitud pasa de inmediato al
    // pool de asignacion en cuanto queda registrada.
    this.stateMachine.assertTransition("REQUESTED", "WAITING_VOLUNTEER");
    await this.prisma.propertyRequests.update({
      where: { id: row.id },
      data: { state: "WAITING_VOLUNTEER" },
    });

    return { ...row, state: "WAITING_VOLUNTEER" };
  }

  findAllForCitizen(citizenId: string) {
    return this.prisma.propertyRequests.findMany({
      where: { citizen_id: citizenId },
      orderBy: { created_at: "desc" },
    });
  }

  // Estados en los que ya existe una visita asignada, por lo tanto es
  // seguro revelarle al ciudadano quien es el voluntario que la atiende.
  private static readonly VOLUNTEER_REVEALED_STATES = [
    "ASSIGNED",
    "SCHEDULED",
    "IN_PROGRESS",
    "VERIFICATION_PENDING",
    "NOTE_PENDING",
    "COMPLETED",
  ];

  async findOneForCitizen(citizenId: string, requestId: string) {
    const request = await this.prisma.propertyRequests.findUnique({
      where: { id: requestId },
      include: {
        visits: {
          orderBy: { created_at: "desc" },
          take: 1,
          include: {
            volunteer: { include: { user: true } },
            visit_note: { include: { zones: true } },
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException("Solicitud no encontrada");
    }

    if (request.citizen_id !== citizenId) {
      throw new ForbiddenException("Esta solicitud no te pertenece");
    }

    const { visits, ...rest } = request;
    const visit = visits[0];
    const assigned_volunteer =
      visit && RequestsService.VOLUNTEER_REVEALED_STATES.includes(request.state)
        ? {
            full_name: visit.volunteer.full_name,
            photo_url: visit.volunteer.photo_url,
            phone_number: visit.volunteer.user.phone_number,
          }
        : null;

    // El PIN solo tiene sentido (y solo debe existir en pantalla) mientras
    // el voluntario esta en la puerta esperando que se lo dicten.
    const verification_pin =
      visit && request.state === "VERIFICATION_PENDING" ? visit.pin_code : null;

    const visit_note = visit?.visit_note
      ? {
          general_comments: visit.visit_note.general_comments,
          created_at: visit.visit_note.created_at,
          zones: visit.visit_note.zones.map((zone) => ({
            zone_name: zone.zone_name,
            status: zone.status,
            comment: zone.comment,
          })),
        }
      : null;

    return { ...rest, assigned_volunteer, verification_pin, visit_note };
  }

  async cancelForCitizen(citizenId: string, requestId: string) {
    const request = await this.prisma.propertyRequests.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException("Solicitud no encontrada");
    }
    if (request.citizen_id !== citizenId) {
      throw new ForbiddenException("Esta solicitud no te pertenece");
    }

    this.stateMachine.assertTransition(request.state, "CANCELLED");

    return this.prisma.propertyRequests.update({
      where: { id: requestId },
      data: { state: "CANCELLED" },
    });
  }

  async getHeatmap(bbox: HeatmapQuery["bbox"]) {
    const rows = await this.prisma.$queryRaw<HeatmapRow[]>`
      SELECT id, housing_type, state, created_at,
             ST_Y(geom::geometry) AS latitude,
             ST_X(geom::geometry) AS longitude
      FROM "PropertyRequests"
      WHERE state = 'WAITING_VOLUNTEER'
        AND ST_Intersects(
          geom,
          ST_MakeEnvelope(${bbox.minLon}, ${bbox.minLat}, ${bbox.maxLon}, ${bbox.maxLat}, 4326)::geography
        )
    `;

    // Privacidad tactica (Seccion 17 y 27): los voluntarios no
    // asignados nunca reciben la coordenada exacta, solo un punto
    // desplazado aleatoriamente entre 150 y 250 metros.
    return rows.map(({ latitude, longitude, ...rest }) => ({
      ...rest,
      ...fuzzCoordinates(latitude, longitude),
    }));
  }
}
