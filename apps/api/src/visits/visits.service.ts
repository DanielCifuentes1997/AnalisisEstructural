import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import type {
  CheckinInput,
  ReleaseVisitInput,
  SubmitVisitNoteInput,
  VerifyPinInput,
} from "@proyecto/shared-types";
import { MAX_ACTIVE_VISITS } from "@proyecto/shared-types";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { PushService } from "../push/push.service";
import { RequestStateMachine } from "../workflow/request-state-machine.service";
import { generatePin, hashPin } from "./pin.util";

const CHECKIN_MAX_DISTANCE_METERS = 100;

interface RequestExactLocationRow {
  id: string;
  reporter_name: string;
  address_text: string;
  address_complement: string | null;
  housing_type: string;
  damages_json: unknown;
  state: string;
  latitude: number;
  longitude: number;
}

interface DistanceRow {
  distance_meters: number;
}

@Injectable()
export class VisitsService {
  private readonly logger = new Logger(VisitsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stateMachine: RequestStateMachine,
    private readonly audit: AuditService,
    private readonly push: PushService,
  ) {}

  // Un caso sigue "ocupando cupo" mientras no se haya cerrado ni
  // liberado. Es lo que impide que una cuenta falsa acapare el mapa.
  private countActiveVisits(volunteerId: string) {
    return this.prisma.visits.count({
      where: {
        volunteer_id: volunteerId,
        released_at: null,
        request: { state: { notIn: ["COMPLETED", "CANCELLED"] } },
      },
    });
  }

  async acceptRequest(userId: string, requestId: string) {
    const volunteer = await this.prisma.volunteerProfiles.findUnique({
      where: { user_id: userId },
    });

    if (!volunteer) {
      throw new ForbiddenException(
        "Debes registrarte como voluntario antes de aceptar visitas",
      );
    }
    if (!volunteer.is_active) {
      throw new ForbiddenException("Tu perfil de voluntario esta inactivo");
    }

    const request = await this.prisma.propertyRequests.findUnique({
      where: { id: requestId },
    });
    if (!request) {
      throw new NotFoundException("Solicitud no encontrada");
    }

    const activeVisits = await this.countActiveVisits(volunteer.id);
    if (activeVisits >= MAX_ACTIVE_VISITS) {
      throw new ForbiddenException(
        `Ya tienes ${MAX_ACTIVE_VISITS} casos abiertos. Termina o libera alguno antes de aceptar otro.`,
      );
    }

    // Valida contra la maquina de estados para dar un mensaje claro
    // cuando la solicitud esta en un estado que nunca podria aceptarse
    // (ya completada, cancelada...).
    this.stateMachine.assertTransition(request.state, "ASSIGNED");

    const pin = generatePin();

    // El reclamo del caso es un UPDATE condicional: la base solo deja
    // pasar al primero que llegue, porque el WHERE exige que siga en
    // WAITING_VOLUNTEER. Si dos analistas aceptan a la vez, el segundo
    // recibe count = 0 en vez de crear una visita duplicada.
    const visit = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.propertyRequests.updateMany({
        where: { id: requestId, state: "WAITING_VOLUNTEER" },
        data: { state: "ASSIGNED" },
      });

      if (claimed.count === 0) {
        throw new ConflictException(
          "Otro analista acaba de tomar este caso. Busca otro en el mapa.",
        );
      }

      return tx.visits.create({
        data: {
          request_id: requestId,
          volunteer_id: volunteer.id,
          otp_hash: hashPin(pin),
          pin_code: pin,
        },
      });
    });

    // El voluntario NUNCA debe conocer el PIN de antemano: lo custodia el
    // ciudadano, que lo ve en su propia pantalla (GET /v1/requests/:id) y
    // se lo dicta en persona al voluntario cuando este llega.
    this.logger.log(
      `Visita ${visit.id} creada para la solicitud ${requestId}; el PIN quedo visible para el ciudadano.`,
    );

    const location = await this.getRequestExactLocation(requestId);

    // El aviso es lo que evita que el ciudadano tenga que estar
    // revisando la app para saber si alguien lo tomo.
    await this.push.sendToUser(request.citizen_id, {
      title: "Ya tienes analista",
      body: `${volunteer.full_name} va a acompañarte. Abre la app para escribirle y cuadrar la visita.`,
      url: `/requests/${requestId}`,
      tag: `request-${requestId}`,
    });

    return { ...location, visit_id: visit.id };
  }

  async getVisitDetail(userId: string, visitId: string) {
    const visit = await this.getOwnedVisit(userId, visitId);
    const location = await this.getRequestExactLocation(visit.request_id);

    return { ...location, visit_id: visit.id };
  }

  // Sin esto, un voluntario que cerraba el navegador perdia el acceso a
  // los casos que ya habia aceptado: no habia forma de recuperar el id
  // de la visita.
  async listMyVisits(userId: string) {
    const volunteer = await this.prisma.volunteerProfiles.findUnique({
      where: { user_id: userId },
    });
    if (!volunteer) {
      throw new ForbiddenException("No tienes un perfil de voluntario");
    }

    const visits = await this.prisma.visits.findMany({
      where: { volunteer_id: volunteer.id },
      orderBy: { created_at: "desc" },
      include: { request: true },
    });

    return visits.map((visit) => ({
      visit_id: visit.id,
      released_at: visit.released_at,
      created_at: visit.created_at,
      request_id: visit.request_id,
      reporter_name: visit.request.reporter_name,
      address_text: visit.request.address_text,
      address_complement: visit.request.address_complement,
      housing_type: visit.request.housing_type,
      state: visit.request.state,
    }));
  }

  /**
   * El analista suelta un caso al que ya no puede ir. Sin esto, el
   * limite de casos activos lo dejaria atrapado: solo el admin podia
   * liberar, y la solicitud se quedaba esperando a alguien que no iba.
   */
  async releaseVisit(
    userId: string,
    visitId: string,
    input: ReleaseVisitInput,
  ) {
    const visit = await this.getOwnedVisit(userId, visitId);

    if (visit.released_at) {
      throw new BadRequestException("Este caso ya fue liberado");
    }

    this.stateMachine.assertTransition(
      visit.request.state,
      "REASSIGNMENT_REQUIRED",
    );
    this.stateMachine.assertTransition(
      "REASSIGNMENT_REQUIRED",
      "WAITING_VOLUNTEER",
    );

    await this.prisma.$transaction([
      this.prisma.visits.update({
        where: { id: visitId },
        data: { released_at: new Date(), released_by_role: "VOLUNTEER" },
      }),
      this.prisma.propertyRequests.update({
        where: { id: visit.request_id },
        data: { state: "WAITING_VOLUNTEER" },
      }),
    ]);

    await this.audit.record({
      actorId: userId,
      action: "VISIT_RELEASED_BY_VOLUNTEER",
      resourceId: visitId,
      priorState: visit.request.state,
      newState: "WAITING_VOLUNTEER",
      notes: input.reason ?? null,
    });

    return { message: "Caso liberado. Vuelve a estar disponible en el mapa." };
  }

  private async getRequestExactLocation(requestId: string) {
    const rows = await this.prisma.$queryRaw<RequestExactLocationRow[]>`
      SELECT pr.id, pr.reporter_name, pr.address_text, pr.address_complement,
             pr.housing_type, pr.damages_json, pr.state,
             ST_Y(pr.geom::geometry) AS latitude,
             ST_X(pr.geom::geometry) AS longitude
      FROM "PropertyRequests" pr
      WHERE pr.id = ${requestId}
    `;

    return rows[0];
  }

  async checkin(userId: string, visitId: string, input: CheckinInput) {
    const visit = await this.getOwnedVisit(userId, visitId);

    this.stateMachine.assertTransition(visit.request.state, "IN_PROGRESS");
    this.stateMachine.assertTransition("IN_PROGRESS", "VERIFICATION_PENDING");

    const distanceRows = await this.prisma.$queryRaw<DistanceRow[]>`
      SELECT ST_Distance(
        geom,
        ST_SetSRID(ST_MakePoint(${input.longitude}, ${input.latitude}), 4326)::geography
      ) AS distance_meters
      FROM "PropertyRequests"
      WHERE id = ${visit.request_id}
    `;
    const distance = distanceRows[0]?.distance_meters ?? Number.POSITIVE_INFINITY;

    if (distance > CHECKIN_MAX_DISTANCE_METERS) {
      throw new BadRequestException(
        `Estas a ${Math.round(distance)}m de la vivienda. Debes estar a menos de ${CHECKIN_MAX_DISTANCE_METERS}m para hacer check-in.`,
      );
    }

    await this.prisma.$executeRaw`
      UPDATE "Visits"
      SET checkin_location = ST_SetSRID(ST_MakePoint(${input.longitude}, ${input.latitude}), 4326)::geography
      WHERE id = ${visitId}
    `;

    await this.prisma.propertyRequests.update({
      where: { id: visit.request_id },
      data: { state: "VERIFICATION_PENDING" },
    });

    await this.push.sendToUser(visit.request.citizen_id, {
      title: "Tu analista llegó",
      body: "Abre la app para ver el código que debes dictarle en persona.",
      url: `/requests/${visit.request_id}`,
      tag: `request-${visit.request_id}`,
    });

    return {
      message: "Check-in exitoso. Solicita el PIN al ciudadano.",
      distance_meters: Math.round(distance),
    };
  }

  async verifyPin(userId: string, visitId: string, input: VerifyPinInput) {
    const visit = await this.getOwnedVisit(userId, visitId);

    this.stateMachine.assertTransition(visit.request.state, "NOTE_PENDING");

    if (hashPin(input.pin) !== visit.otp_hash) {
      throw new UnauthorizedException("PIN incorrecto");
    }

    await this.prisma.propertyRequests.update({
      where: { id: visit.request_id },
      data: { state: "NOTE_PENDING" },
    });

    return { message: "PIN verificado. Ya puedes registrar la nota de visita." };
  }

  async submitNote(
    userId: string,
    visitId: string,
    input: SubmitVisitNoteInput,
  ) {
    const visit = await this.getOwnedVisit(userId, visitId);

    this.stateMachine.assertTransition(visit.request.state, "COMPLETED");

    const note = await this.prisma.visitNotes.create({
      data: {
        visit_id: visitId,
        general_comments: input.general_comments,
        evidence_urls: [],
        zones: {
          create: input.zones.map((zone) => ({
            zone_name: zone.zone_name,
            status: zone.status,
            comment: zone.comment,
          })),
        },
      },
      include: { zones: true },
    });

    await this.prisma.propertyRequests.update({
      where: { id: visit.request_id },
      data: { state: "COMPLETED" },
    });

    await this.push.sendToUser(visit.request.citizen_id, {
      title: "Tu nota de visita está lista",
      body: "Ya puedes leer las observaciones de tu analista.",
      url: `/requests/${visit.request_id}`,
      tag: `request-${visit.request_id}`,
    });

    return note;
  }

  private async getOwnedVisit(userId: string, visitId: string) {
    const volunteer = await this.prisma.volunteerProfiles.findUnique({
      where: { user_id: userId },
    });
    if (!volunteer) {
      throw new ForbiddenException("No tienes un perfil de voluntario");
    }

    const visit = await this.prisma.visits.findUnique({
      where: { id: visitId },
      include: { request: true },
    });
    if (!visit) {
      throw new NotFoundException("Visita no encontrada");
    }
    if (visit.volunteer_id !== volunteer.id) {
      throw new ForbiddenException("Esta visita no te pertenece");
    }

    return visit;
  }
}
