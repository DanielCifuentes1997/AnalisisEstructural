import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { SendMessageInput } from "@proyecto/shared-types";
import { PrismaService } from "../prisma/prisma.service";

// Estados en los que ya no tiene sentido seguir escribiendo.
const CLOSED_STATES = ["COMPLETED", "CANCELLED"];

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Solo el ciudadano dueño de la solicitud y el analista asignado
   * pueden entrar a una conversacion. Devuelve tambien quien es el
   * interlocutor para poder pintar el encabezado.
   */
  private async getParticipantContext(userId: string, visitId: string) {
    const visit = await this.prisma.visits.findUnique({
      where: { id: visitId },
      include: { request: true, volunteer: true },
    });

    if (!visit) {
      throw new NotFoundException("Conversacion no encontrada");
    }

    const isCitizen = visit.request.citizen_id === userId;
    const isVolunteer = visit.volunteer.user_id === userId;

    if (!isCitizen && !isVolunteer) {
      throw new ForbiddenException("Esta conversacion no te pertenece");
    }

    return { visit, isCitizen, isVolunteer };
  }

  async getConversation(userId: string, visitId: string) {
    const { visit, isCitizen } = await this.getParticipantContext(
      userId,
      visitId,
    );

    const messages = await this.prisma.messages.findMany({
      where: { visit_id: visitId },
      orderBy: { created_at: "asc" },
    });

    // Lo que llega del otro lado se marca leido al abrir el chat.
    const myRole = isCitizen ? "CITIZEN" : "VOLUNTEER";
    await this.prisma.messages.updateMany({
      where: { visit_id: visitId, sender_role: { not: myRole }, read_at: null },
      data: { read_at: new Date() },
    });

    const isClosed =
      CLOSED_STATES.includes(visit.request.state) || visit.released_at !== null;

    return {
      visit_id: visit.id,
      request_state: visit.request.state,
      is_closed: isClosed,
      // Cada lado ve el nombre del otro, nada mas. El telefono del
      // ciudadano no viaja nunca hacia el analista: para evitar ese
      // intercambio existe este chat.
      counterpart: isCitizen
        ? {
            name: visit.volunteer.full_name,
            photo_url: visit.volunteer.photo_url as string | null,
          }
        : { name: visit.request.reporter_name, photo_url: null },
      messages: messages.map((m) => ({
        id: m.id,
        body: m.body,
        sender_role: m.sender_role,
        is_mine: m.sender_id === userId,
        created_at: m.created_at,
        read_at: m.read_at,
      })),
    };
  }

  async sendMessage(userId: string, visitId: string, input: SendMessageInput) {
    const { visit, isCitizen } = await this.getParticipantContext(
      userId,
      visitId,
    );

    if (CLOSED_STATES.includes(visit.request.state)) {
      throw new ForbiddenException(
        "Esta visita ya termino, no se pueden enviar mas mensajes",
      );
    }
    if (visit.released_at) {
      throw new ForbiddenException(
        "Este caso fue liberado, la conversacion esta cerrada",
      );
    }

    return this.prisma.messages.create({
      data: {
        visit_id: visitId,
        sender_id: userId,
        sender_role: isCitizen ? "CITIZEN" : "VOLUNTEER",
        body: input.body,
      },
    });
  }

  /**
   * Cuantos mensajes sin leer tiene el usuario, agrupados por visita.
   * Alimenta la campanita: sin esto nadie se entera de que le escribieron.
   */
  async getUnreadSummary(userId: string) {
    const user = await this.prisma.users.findUnique({ where: { id: userId } });
    if (!user) return { total: 0, by_visit: {} as Record<string, number> };

    const isVolunteer = user.role === "VOLUNTEER";
    const visits = await this.prisma.visits.findMany({
      where: isVolunteer
        ? { volunteer: { user_id: userId }, released_at: null }
        : { request: { citizen_id: userId } },
      select: { id: true },
    });
    const visitIds = visits.map((v) => v.id);
    if (visitIds.length === 0) return { total: 0, by_visit: {} };

    const grouped = await this.prisma.messages.groupBy({
      by: ["visit_id"],
      where: {
        visit_id: { in: visitIds },
        read_at: null,
        sender_role: { not: isVolunteer ? "VOLUNTEER" : "CITIZEN" },
      },
      _count: { _all: true },
    });

    const byVisit = Object.fromEntries(
      grouped.map((g) => [g.visit_id, g._count._all]),
    );

    return {
      total: grouped.reduce((sum, g) => sum + g._count._all, 0),
      by_visit: byVisit,
    };
  }

  // Lectura para moderacion: el admin ve la conversacion completa, con
  // los nombres reales de ambas partes.
  async getConversationForAdmin(visitId: string) {
    const visit = await this.prisma.visits.findUnique({
      where: { id: visitId },
      include: { request: true, volunteer: true },
    });
    if (!visit) {
      throw new NotFoundException("Conversacion no encontrada");
    }

    const messages = await this.prisma.messages.findMany({
      where: { visit_id: visitId },
      orderBy: { created_at: "asc" },
    });

    return {
      visit_id: visit.id,
      citizen_name: visit.request.reporter_name,
      volunteer_name: visit.volunteer.full_name,
      request_state: visit.request.state,
      released_at: visit.released_at,
      messages: messages.map((m) => ({
        id: m.id,
        body: m.body,
        sender_role: m.sender_role,
        author:
          m.sender_role === "CITIZEN"
            ? visit.request.reporter_name
            : visit.volunteer.full_name,
        created_at: m.created_at,
      })),
    };
  }
}
