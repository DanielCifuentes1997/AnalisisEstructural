import { Injectable, NotFoundException } from "@nestjs/common";
import type {
  AdminRequestActionInput,
  AdminRequestsQuery,
  AdminVolunteersQuery,
  ReviewVolunteerInput,
  UpdateUserStatusInput,
} from "@proyecto/shared-types";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { RequestStateMachine } from "../workflow/request-state-machine.service";

// Una solicitud en estos estados ya tiene analista asignado; si el
// analista desaparece, es aqui donde queda trabada para siempre sin
// intervencion del admin.
const STUCK_CANDIDATE_STATES = [
  "ASSIGNED",
  "SCHEDULED",
  "IN_PROGRESS",
  "VERIFICATION_PENDING",
] as const;

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly stateMachine: RequestStateMachine,
  ) {}

  async getMetrics() {
    const [byState, volunteersByStatus, activeVolunteers, totalUsers, suspended] =
      await Promise.all([
        this.prisma.propertyRequests.groupBy({
          by: ["state"],
          _count: { _all: true },
        }),
        this.prisma.volunteerProfiles.groupBy({
          by: ["verification_status"],
          _count: { _all: true },
        }),
        this.prisma.volunteerProfiles.count({ where: { is_active: true } }),
        this.prisma.users.count(),
        this.prisma.users.count({ where: { status: "SUSPENDED" } }),
      ]);

    return {
      requests_by_state: Object.fromEntries(
        byState.map((row) => [row.state, row._count._all]),
      ),
      requests_total: byState.reduce((sum, row) => sum + row._count._all, 0),
      volunteers_by_verification: Object.fromEntries(
        volunteersByStatus.map((row) => [
          row.verification_status,
          row._count._all,
        ]),
      ),
      volunteers_active: activeVolunteers,
      users_total: totalUsers,
      users_suspended: suspended,
    };
  }

  async listVolunteers(query: AdminVolunteersQuery) {
    const volunteers = await this.prisma.volunteerProfiles.findMany({
      where: query.verification_status
        ? { verification_status: query.verification_status }
        : undefined,
      orderBy: [{ verification_status: "asc" }, { created_at: "desc" }],
      include: {
        user: true,
        _count: { select: { visits: true } },
      },
    });

    // Es la unica respuesta del sistema que expone la matricula y la
    // cedula: existe para que el admin pueda verificarlas a mano.
    return volunteers.map((volunteer) => ({
      id: volunteer.id,
      user_id: volunteer.user_id,
      full_name: volunteer.full_name,
      id_document_number: volunteer.id_document_number,
      declared_profession: volunteer.declared_profession,
      professional_license: volunteer.professional_license,
      photo_url: volunteer.photo_url,
      phone_number: volunteer.user.phone_number,
      user_status: volunteer.user.status,
      is_active: volunteer.is_active,
      verification_status: volunteer.verification_status,
      verified_at: volunteer.verified_at,
      review_notes: volunteer.review_notes,
      visits_count: volunteer._count.visits,
      created_at: volunteer.created_at,
    }));
  }

  async reviewVolunteer(
    adminId: string,
    volunteerId: string,
    input: ReviewVolunteerInput,
  ) {
    const volunteer = await this.prisma.volunteerProfiles.findUnique({
      where: { id: volunteerId },
    });
    if (!volunteer) {
      throw new NotFoundException("Analista no encontrado");
    }

    const updated = await this.prisma.volunteerProfiles.update({
      where: { id: volunteerId },
      data: {
        ...(input.verification_status !== undefined && {
          verification_status: input.verification_status,
          verified_at:
            input.verification_status === "VERIFIED" ? new Date() : null,
          reviewed_by: adminId,
        }),
        ...(input.is_active !== undefined && { is_active: input.is_active }),
        ...(input.review_notes !== undefined && {
          review_notes: input.review_notes,
        }),
      },
    });

    if (
      input.verification_status !== undefined &&
      input.verification_status !== volunteer.verification_status
    ) {
      await this.audit.record({
        actorId: adminId,
        action:
          input.verification_status === "VERIFIED"
            ? "VOLUNTEER_VERIFIED"
            : input.verification_status === "REJECTED"
              ? "VOLUNTEER_REJECTED"
              : "VOLUNTEER_REVIEW_RESET",
        resourceId: volunteerId,
        priorState: volunteer.verification_status,
        newState: input.verification_status,
        notes: input.review_notes ?? null,
      });
    }

    if (input.is_active !== undefined && input.is_active !== volunteer.is_active) {
      await this.audit.record({
        actorId: adminId,
        action: input.is_active
          ? "VOLUNTEER_REACTIVATED"
          : "VOLUNTEER_DEACTIVATED",
        resourceId: volunteerId,
        priorState: String(volunteer.is_active),
        newState: String(input.is_active),
      });
    }

    return updated;
  }

  async listRequests(query: AdminRequestsQuery) {
    const requests = await this.prisma.propertyRequests.findMany({
      where: query.state ? { state: query.state } : undefined,
      orderBy: { created_at: "desc" },
      take: 200,
      include: {
        citizen: true,
        visits: {
          orderBy: { created_at: "desc" },
          take: 1,
          include: { volunteer: true },
        },
      },
    });

    return requests.map((request) => {
      const visit = request.visits[0];
      return {
        id: request.id,
        reporter_name: request.reporter_name,
        address_text: request.address_text,
        address_complement: request.address_complement,
        housing_type: request.housing_type,
        state: request.state,
        created_at: request.created_at,
        updated_at: request.updated_at,
        citizen_phone: request.citizen.phone_number,
        assigned_volunteer_name: visit?.volunteer.full_name ?? null,
        // Cuantas horas lleva sin cambiar de estado: es la senal que
        // delata a una solicitud atascada.
        hours_since_update: Math.floor(
          (Date.now() - request.updated_at.getTime()) / 3_600_000,
        ),
        is_stuck_candidate: (
          STUCK_CANDIDATE_STATES as readonly string[]
        ).includes(request.state),
      };
    });
  }

  /**
   * Devuelve al pool una solicitud cuyo analista abandono. Es el unico
   * camino que dispara REASSIGNMENT_REQUIRED: sin esto, el estado existia
   * en la maquina pero era inalcanzable, y la solicitud quedaba trabada.
   */
  async returnRequestToPool(
    adminId: string,
    requestId: string,
    input: AdminRequestActionInput,
  ) {
    const request = await this.prisma.propertyRequests.findUnique({
      where: { id: requestId },
    });
    if (!request) {
      throw new NotFoundException("Solicitud no encontrada");
    }

    this.stateMachine.assertTransition(request.state, "REASSIGNMENT_REQUIRED");
    this.stateMachine.assertTransition(
      "REASSIGNMENT_REQUIRED",
      "WAITING_VOLUNTEER",
    );

    const updated = await this.prisma.propertyRequests.update({
      where: { id: requestId },
      data: { state: "WAITING_VOLUNTEER" },
    });

    await this.audit.record({
      actorId: adminId,
      action: "REQUEST_RETURNED_TO_POOL",
      resourceId: requestId,
      priorState: request.state,
      newState: "WAITING_VOLUNTEER",
      notes: input.reason ?? null,
    });

    return updated;
  }

  async cancelRequest(
    adminId: string,
    requestId: string,
    input: AdminRequestActionInput,
  ) {
    const request = await this.prisma.propertyRequests.findUnique({
      where: { id: requestId },
    });
    if (!request) {
      throw new NotFoundException("Solicitud no encontrada");
    }

    this.stateMachine.assertTransition(request.state, "CANCELLED");

    const updated = await this.prisma.propertyRequests.update({
      where: { id: requestId },
      data: { state: "CANCELLED" },
    });

    await this.audit.record({
      actorId: adminId,
      action: "REQUEST_CANCELLED_BY_ADMIN",
      resourceId: requestId,
      priorState: request.state,
      newState: "CANCELLED",
      notes: input.reason ?? null,
    });

    return updated;
  }

  async updateUserStatus(
    adminId: string,
    userId: string,
    input: UpdateUserStatusInput,
  ) {
    const user = await this.prisma.users.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("Usuario no encontrado");
    }

    const updated = await this.prisma.users.update({
      where: { id: userId },
      data: { status: input.status },
    });

    if (user.status !== input.status) {
      await this.audit.record({
        actorId: adminId,
        action:
          input.status === "SUSPENDED" ? "USER_SUSPENDED" : "USER_REACTIVATED",
        resourceId: userId,
        priorState: user.status,
        newState: input.status,
        notes: input.reason ?? null,
      });
    }

    return { id: updated.id, status: updated.status };
  }

  async listAuditLogs() {
    const logs = await this.audit.list();
    const actorIds = [...new Set(logs.map((log) => log.actor_id))];
    const actors = await this.prisma.users.findMany({
      where: { id: { in: actorIds } },
      select: { id: true, phone_number: true },
    });
    const phoneById = new Map(actors.map((a) => [a.id, a.phone_number]));

    return logs.map((log) => ({
      ...log,
      actor_phone: phoneById.get(log.actor_id) ?? null,
    }));
  }
}
