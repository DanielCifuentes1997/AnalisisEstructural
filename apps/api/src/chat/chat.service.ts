import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  ProposeVisitDateInput,
  ReportAbuseInput,
  RespondToProposalInput,
  SendMessageInput,
} from "@proyecto/shared-types";
import { PrismaService } from "../prisma/prisma.service";
import { PushService } from "../push/push.service";
import { StorageService } from "../storage/storage.service";
import { RequestStateMachine } from "../workflow/request-state-machine.service";

// Estados en los que ya no tiene sentido seguir escribiendo.
const CLOSED_STATES = ["COMPLETED", "CANCELLED"];

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stateMachine: RequestStateMachine,
    private readonly storage: StorageService,
    private readonly push: PushService,
  ) {}

  /** A quien hay que avisarle: siempre al otro lado de la conversacion. */
  private counterpartUserId(
    visit: { request: { citizen_id: string }; volunteer: { user_id: string } },
    senderIsCitizen: boolean,
  ) {
    return senderIsCitizen ? visit.volunteer.user_id : visit.request.citizen_id;
  }

  // Proponer fecha solo tiene sentido antes de que el analista llegue.
  private static readonly SCHEDULABLE_STATES = ["ASSIGNED", "SCHEDULED"];

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

    // Enlace firmado y temporal: solo para el ciudadano de este caso.
    const counterpartPhoto = isCitizen
      ? await this.storage.resolveVolunteerPhotoUrl(visit.volunteer.photo_url)
      : null;

    return {
      visit_id: visit.id,
      request_state: visit.request.state,
      is_closed: isClosed,
      // Cada lado ve el nombre del otro, nada mas. El telefono del
      // ciudadano no viaja nunca hacia el analista: para evitar ese
      // intercambio existe este chat.
      counterpart: isCitizen
        ? { name: visit.volunteer.full_name, photo_url: counterpartPhoto }
        : { name: visit.request.reporter_name, photo_url: null },
      scheduled_at: visit.scheduled_at,
      can_propose_date:
        !isClosed &&
        ChatService.SCHEDULABLE_STATES.includes(visit.request.state),
      messages: messages.map((m) => ({
        id: m.id,
        body: m.body,
        sender_role: m.sender_role,
        is_mine: m.sender_id === userId,
        created_at: m.created_at,
        read_at: m.read_at,
        kind: m.kind,
        proposed_date: m.proposed_date,
        proposal_status: m.proposal_status,
        // Solo la otra parte puede responder una propuesta viva.
        can_respond:
          m.kind === "DATE_PROPOSAL" &&
          m.proposal_status === "PENDING" &&
          m.sender_id !== userId,
      })),
    };
  }

  /**
   * Propone una fecha para la visita. Cualquiera de los dos puede
   * hacerlo: la negociacion sigue siendo por chat y esto solo captura el
   * acuerdo. Si ya habia propuestas sin responder, quedan sin vigencia.
   */
  async proposeVisitDate(
    userId: string,
    visitId: string,
    input: ProposeVisitDateInput,
  ) {
    const { visit, isCitizen } = await this.getParticipantContext(
      userId,
      visitId,
    );

    if (visit.released_at) {
      throw new ForbiddenException("Este caso fue liberado");
    }
    if (!ChatService.SCHEDULABLE_STATES.includes(visit.request.state)) {
      throw new ForbiddenException(
        "Ya no se puede acordar fecha para esta visita",
      );
    }

    const [, proposal] = await this.prisma.$transaction([
      this.prisma.messages.updateMany({
        where: {
          visit_id: visitId,
          kind: "DATE_PROPOSAL",
          proposal_status: "PENDING",
        },
        data: { proposal_status: "SUPERSEDED" },
      }),
      this.prisma.messages.create({
        data: {
          visit_id: visitId,
          sender_id: userId,
          sender_role: isCitizen ? "CITIZEN" : "VOLUNTEER",
          kind: "DATE_PROPOSAL",
          proposed_date: new Date(input.proposed_date),
          proposal_status: "PENDING",
          body: input.note?.trim() || "",
        },
      }),
    ]);

    const proposerName = isCitizen
      ? visit.request.reporter_name
      : visit.volunteer.full_name;
    await this.push.sendToUser(this.counterpartUserId(visit, isCitizen), {
      title: "Te proponen una fecha",
      body: `${proposerName} propuso una fecha para la visita. Responde si te sirve.`,
      url: isCitizen
        ? `/volunteer/visits/${visitId}`
        : `/requests/${visit.request_id}`,
      tag: `chat-${visitId}`,
    });

    return proposal;
  }

  /**
   * "Me sirve" / "No puedo". Aceptar fija la fecha y pasa la solicitud a
   * SCHEDULED; rechazar no rompe nada, la conversacion sigue y cualquiera
   * puede proponer otra.
   */
  async respondToProposal(
    userId: string,
    visitId: string,
    proposalId: string,
    input: RespondToProposalInput,
  ) {
    const { visit } = await this.getParticipantContext(userId, visitId);

    const proposal = await this.prisma.messages.findUnique({
      where: { id: proposalId },
    });
    if (!proposal || proposal.visit_id !== visitId || proposal.kind !== "DATE_PROPOSAL") {
      throw new NotFoundException("Propuesta no encontrada");
    }
    if (proposal.proposal_status !== "PENDING") {
      throw new ForbiddenException("Esta propuesta ya no esta vigente");
    }
    // Quien propone no puede aceptarse a si mismo.
    if (proposal.sender_id === userId) {
      throw new ForbiddenException("Debe responder la otra persona");
    }

    const notifyProposer = async (accepted: boolean) => {
      await this.push.sendToUser(proposal.sender_id, {
        title: accepted ? "Fecha acordada" : "No le sirvió la fecha",
        body: accepted
          ? "La otra persona aceptó la fecha que propusiste."
          : "Propón otra fecha desde el chat.",
        url: `/visits/${visitId}`,
        tag: `chat-${visitId}`,
      });
    };

    if (!input.accept) {
      const declined = await this.prisma.messages.update({
        where: { id: proposalId },
        data: { proposal_status: "DECLINED" },
      });
      await notifyProposer(false);
      return declined;
    }

    // Si la solicitud ya estaba SCHEDULED solo cambia la fecha: la
    // maquina de estados no admite SCHEDULED -> SCHEDULED.
    const needsTransition = visit.request.state === "ASSIGNED";
    if (needsTransition) {
      this.stateMachine.assertTransition(visit.request.state, "SCHEDULED");
    }

    const [accepted] = await this.prisma.$transaction([
      this.prisma.messages.update({
        where: { id: proposalId },
        data: { proposal_status: "ACCEPTED" },
      }),
      this.prisma.visits.update({
        where: { id: visitId },
        data: { scheduled_at: proposal.proposed_date },
      }),
      ...(needsTransition
        ? [
            this.prisma.propertyRequests.update({
              where: { id: visit.request_id },
              data: { state: "SCHEDULED" },
            }),
          ]
        : []),
    ]);

    return accepted;
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

    const message = await this.prisma.messages.create({
      data: {
        visit_id: visitId,
        sender_id: userId,
        sender_role: isCitizen ? "CITIZEN" : "VOLUNTEER",
        body: input.body,
      },
    });

    const senderName = isCitizen
      ? visit.request.reporter_name
      : visit.volunteer.full_name;
    await this.push.sendToUser(this.counterpartUserId(visit, isCitizen), {
      title: `Mensaje de ${senderName}`,
      // El tag agrupa: diez mensajes seguidos no producen diez avisos.
      body: input.body.slice(0, 120),
      url: isCitizen
        ? `/volunteer/visits/${visitId}`
        : `/requests/${visit.request_id}`,
      tag: `chat-${visitId}`,
    });

    return message;
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

  /**
   * Denuncia del ciudadano sobre el comportamiento del analista. Solo la
   * puede poner el ciudadano: el analista no ve datos suyos que pueda
   * usar en su contra, y quien esta expuesto en su casa es el.
   */
  async reportAbuse(userId: string, visitId: string, input: ReportAbuseInput) {
    const { isCitizen } = await this.getParticipantContext(userId, visitId);
    if (!isCitizen) {
      throw new ForbiddenException(
        "Solo quien recibe la visita puede reportar al analista",
      );
    }

    return this.prisma.abuseReports.create({
      data: {
        visit_id: visitId,
        reporter_id: userId,
        reason: input.reason,
        details: input.details?.trim() || null,
      },
    });
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
      scheduled_at: visit.scheduled_at,
      messages: messages.map((m) => ({
        id: m.id,
        body: m.body,
        sender_role: m.sender_role,
        kind: m.kind,
        proposed_date: m.proposed_date,
        proposal_status: m.proposal_status,
        author:
          m.sender_role === "CITIZEN"
            ? visit.request.reporter_name
            : visit.volunteer.full_name,
        created_at: m.created_at,
      })),
    };
  }
}
