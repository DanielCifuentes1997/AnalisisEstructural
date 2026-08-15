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
  structural_type: string;
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
  structural_type: string;
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
        (id, citizen_id, geom, structural_type, damages_json, state, created_at, updated_at)
      VALUES (
        ${id},
        ${citizenId},
        ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
        ${input.structural_type},
        ${JSON.stringify(damagesJsonWithPhotos)}::jsonb,
        'REQUESTED',
        now(),
        now()
      )
      RETURNING
        id, citizen_id, structural_type, damages_json, priority_score, state,
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
    this.stateMachine.assertTransition("REQUESTED", "WAITING_PROFESSIONAL");
    await this.prisma.propertyRequests.update({
      where: { id: row.id },
      data: { state: "WAITING_PROFESSIONAL" },
    });

    return { ...row, state: "WAITING_PROFESSIONAL" };
  }

  findAllForCitizen(citizenId: string) {
    return this.prisma.propertyRequests.findMany({
      where: { citizen_id: citizenId },
      orderBy: { created_at: "desc" },
    });
  }

  async findOneForCitizen(citizenId: string, requestId: string) {
    const request = await this.prisma.propertyRequests.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException("Solicitud no encontrada");
    }

    if (request.citizen_id !== citizenId) {
      throw new ForbiddenException("Esta solicitud no te pertenece");
    }

    return request;
  }

  async getHeatmap(bbox: HeatmapQuery["bbox"]) {
    const rows = await this.prisma.$queryRaw<HeatmapRow[]>`
      SELECT id, structural_type, state, created_at,
             ST_Y(geom::geometry) AS latitude,
             ST_X(geom::geometry) AS longitude
      FROM "PropertyRequests"
      WHERE state = 'WAITING_PROFESSIONAL'
        AND ST_Intersects(
          geom,
          ST_MakeEnvelope(${bbox.minLon}, ${bbox.minLat}, ${bbox.maxLon}, ${bbox.maxLat}, 4326)::geography
        )
    `;

    // Privacidad tactica (Seccion 17 y 27): los profesionales no
    // asignados nunca reciben la coordenada exacta, solo un punto
    // desplazado aleatoriamente entre 150 y 250 metros.
    return rows.map(({ latitude, longitude, ...rest }) => ({
      ...rest,
      ...fuzzCoordinates(latitude, longitude),
    }));
  }
}
