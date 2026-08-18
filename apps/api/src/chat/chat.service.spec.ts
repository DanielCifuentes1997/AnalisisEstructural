import { ForbiddenException, NotFoundException } from "@nestjs/common";
import type { PrismaService } from "../prisma/prisma.service";
import { createPrismaMock, type PrismaMock } from "../test-utils/prisma-mock";
import { RequestStateMachine } from "../workflow/request-state-machine.service";
import type { StorageService } from "../storage/storage.service";
import type { PushService } from "../push/push.service";
import { ChatService } from "./chat.service";


/** StorageService simulado: las fotos privadas se firman, no se leen. */
const createStorageMock = () => ({
  resolveVolunteerPhotoUrl: jest
    .fn()
    .mockImplementation(async (stored: string | null) =>
      stored ? `https://firmada.example/${stored}?token=abc` : null,
    ),
  createSignedUploadUrl: jest.fn(),
});


/** PushService simulado: los avisos no deben tumbar nada si fallan. */
const createPushMock = () => ({
  sendToUser: jest.fn().mockResolvedValue(1),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
  getPublicKey: jest.fn(),
});

const CITIZEN_ID = "user-citizen";
const VOLUNTEER_USER_ID = "user-vol";
const VISIT_ID = "visit-1";

const visitFixture = (overrides: Record<string, unknown> = {}) => ({
  id: VISIT_ID,
  released_at: null,
  request: {
    citizen_id: CITIZEN_ID,
    reporter_name: "Rosa Delgado",
    state: "ASSIGNED",
  },
  volunteer: {
    user_id: VOLUNTEER_USER_ID,
    full_name: "Elena Vargas",
    photo_url: "https://example.com/elena.jpg",
  },
  ...overrides,
});

describe("ChatService", () => {
  let prisma: PrismaMock;
  let storage: ReturnType<typeof createStorageMock>;
  let push: ReturnType<typeof createPushMock>;
  let service: ChatService;

  beforeEach(() => {
    prisma = createPrismaMock();
    storage = createStorageMock();
    push = createPushMock();
    service = new ChatService(
      prisma as unknown as PrismaService,
      new RequestStateMachine(),
      storage as unknown as StorageService,
      push as unknown as PushService,
    );
    prisma.visits.findUnique.mockResolvedValue(visitFixture());
    prisma.messages.findMany.mockResolvedValue([]);
    prisma.messages.updateMany.mockResolvedValue({ count: 0 });
  });

  describe("control de acceso", () => {
    it("deja entrar al ciudadano dueño de la solicitud", async () => {
      const conversation = await service.getConversation(CITIZEN_ID, VISIT_ID);
      expect(conversation.visit_id).toBe(VISIT_ID);
    });

    it("deja entrar al analista asignado", async () => {
      const conversation = await service.getConversation(
        VOLUNTEER_USER_ID,
        VISIT_ID,
      );
      expect(conversation.visit_id).toBe(VISIT_ID);
    });

    it("bloquea a cualquier tercero", async () => {
      await expect(
        service.getConversation("user-intruso", VISIT_ID),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("404 si la conversacion no existe", async () => {
      prisma.visits.findUnique.mockResolvedValue(null);

      await expect(
        service.getConversation(CITIZEN_ID, VISIT_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("privacidad del telefono", () => {
    // La razon de ser del chat: que el analista no reciba el numero.
    it("el analista solo ve el nombre del ciudadano, sin telefono", async () => {
      const conversation = await service.getConversation(
        VOLUNTEER_USER_ID,
        VISIT_ID,
      );

      expect(conversation.counterpart).toEqual({
        name: "Rosa Delgado",
        photo_url: null,
      });
      expect(JSON.stringify(conversation)).not.toMatch(/\+57/);
    });

    it("el ciudadano ve nombre y foto del analista", async () => {
      const conversation = await service.getConversation(CITIZEN_ID, VISIT_ID);

      expect(conversation.counterpart.name).toBe("Elena Vargas");
      // Llega firmada, no como URL directa del bucket.
      expect(conversation.counterpart.photo_url).toContain("firmada.example");
      expect(storage.resolveVolunteerPhotoUrl).toHaveBeenCalledWith(
        "https://example.com/elena.jpg",
      );
    });
  });

  describe("enviar mensajes", () => {
    it("guarda el mensaje con el rol de quien escribe", async () => {
      prisma.messages.create.mockResolvedValue({ id: "msg-1" });

      await service.sendMessage(CITIZEN_ID, VISIT_ID, { body: "Buenas tardes" });

      expect(prisma.messages.create).toHaveBeenCalledWith({
        data: {
          visit_id: VISIT_ID,
          sender_id: CITIZEN_ID,
          sender_role: "CITIZEN",
          body: "Buenas tardes",
        },
      });
    });

    it("avisa al otro lado que le escribieron", async () => {
      prisma.messages.create.mockResolvedValue({ id: "msg-1" });

      await service.sendMessage(CITIZEN_ID, VISIT_ID, { body: "Buenas tardes" });

      expect(push.sendToUser).toHaveBeenCalledWith(
        VOLUNTEER_USER_ID,
        expect.objectContaining({
          title: "Mensaje de Rosa Delgado",
          body: "Buenas tardes",
        }),
      );
    });

    it("el analista que escribe avisa al ciudadano", async () => {
      prisma.messages.create.mockResolvedValue({ id: "msg-1" });

      await service.sendMessage(VOLUNTEER_USER_ID, VISIT_ID, { body: "Voy" });

      expect(push.sendToUser).toHaveBeenCalledWith(
        CITIZEN_ID,
        expect.objectContaining({ title: "Mensaje de Elena Vargas" }),
      );
    });

    it("cierra el chat cuando la visita ya termino", async () => {
      prisma.visits.findUnique.mockResolvedValue(
        visitFixture({
          request: { citizen_id: CITIZEN_ID, reporter_name: "Rosa", state: "COMPLETED" },
        }),
      );

      await expect(
        service.sendMessage(CITIZEN_ID, VISIT_ID, { body: "Hola" }),
      ).rejects.toThrow(/ya termino/);
    });

    it("cierra el chat cuando el caso fue liberado", async () => {
      prisma.visits.findUnique.mockResolvedValue(
        visitFixture({ released_at: new Date() }),
      );

      await expect(
        service.sendMessage(VOLUNTEER_USER_ID, VISIT_ID, { body: "Hola" }),
      ).rejects.toThrow(/liberado/);
    });
  });

  describe("mensajes sin leer", () => {
    it("marca como leidos solo los del otro lado al abrir el chat", async () => {
      await service.getConversation(CITIZEN_ID, VISIT_ID);

      expect(prisma.messages.updateMany).toHaveBeenCalledWith({
        where: {
          visit_id: VISIT_ID,
          sender_role: { not: "CITIZEN" },
          read_at: null,
        },
        data: { read_at: expect.any(Date) },
      });
    });

    it("suma los no leidos del ciudadano por visita", async () => {
      prisma.users.findUnique.mockResolvedValue({ role: "CITIZEN" });
      prisma.visits.findMany.mockResolvedValue([{ id: "v1" }, { id: "v2" }]);
      prisma.messages.groupBy.mockResolvedValue([
        { visit_id: "v1", _count: { _all: 2 } },
        { visit_id: "v2", _count: { _all: 3 } },
      ]);

      const summary = await service.getUnreadSummary(CITIZEN_ID);

      expect(summary.total).toBe(5);
      expect(summary.by_visit).toEqual({ v1: 2, v2: 3 });
    });

    it("devuelve cero cuando no hay visitas", async () => {
      prisma.users.findUnique.mockResolvedValue({ role: "CITIZEN" });
      prisma.visits.findMany.mockResolvedValue([]);

      const summary = await service.getUnreadSummary(CITIZEN_ID);

      expect(summary).toEqual({ total: 0, by_visit: {} });
      expect(prisma.messages.groupBy).not.toHaveBeenCalled();
    });

    it("al analista no le cuentan los casos que ya libero", async () => {
      prisma.users.findUnique.mockResolvedValue({ role: "VOLUNTEER" });
      prisma.visits.findMany.mockResolvedValue([]);

      await service.getUnreadSummary(VOLUNTEER_USER_ID);

      expect(prisma.visits.findMany).toHaveBeenCalledWith({
        where: { volunteer: { user_id: VOLUNTEER_USER_ID }, released_at: null },
        select: { id: true },
      });
    });
  });

  describe("denuncias", () => {
    it("el ciudadano puede denunciar al analista", async () => {
      prisma.abuseReports.create.mockResolvedValue({ id: "rep-1" });

      await service.reportAbuse(CITIZEN_ID, VISIT_ID, {
        reason: "PIDIO_DINERO",
        details: "Me pidio consignar",
      });

      expect(prisma.abuseReports.create).toHaveBeenCalledWith({
        data: {
          visit_id: VISIT_ID,
          reporter_id: CITIZEN_ID,
          reason: "PIDIO_DINERO",
          details: "Me pidio consignar",
        },
      });
    });

    // Quien abre su casa es el ciudadano: la denuncia va en un solo sentido.
    it("el analista NO puede denunciar al ciudadano", async () => {
      await expect(
        service.reportAbuse(VOLUNTEER_USER_ID, VISIT_ID, {
          reason: "SOSPECHOSO",
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.abuseReports.create).not.toHaveBeenCalled();
    });

    it("guarda null cuando no se escribio detalle", async () => {
      prisma.abuseReports.create.mockResolvedValue({ id: "rep-1" });

      await service.reportAbuse(CITIZEN_ID, VISIT_ID, { reason: "NO_LLEGO" });

      expect(prisma.abuseReports.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ details: null }),
      });
    });
  });

  describe("moderacion del admin", () => {
    it("muestra la conversacion con el autor de cada mensaje", async () => {
      prisma.messages.findMany.mockResolvedValue([
        { id: "m1", body: "Hola", sender_role: "CITIZEN", created_at: new Date() },
        { id: "m2", body: "Voy", sender_role: "VOLUNTEER", created_at: new Date() },
      ]);

      const conversation = await service.getConversationForAdmin(VISIT_ID);

      expect(conversation.messages[0].author).toBe("Rosa Delgado");
      expect(conversation.messages[1].author).toBe("Elena Vargas");
    });

    it("404 si la visita no existe", async () => {
      prisma.visits.findUnique.mockResolvedValue(null);

      await expect(
        service.getConversationForAdmin(VISIT_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("agendar la visita", () => {
    const FUTURE = new Date(Date.now() + 3 * 24 * 3600_000).toISOString();

    beforeEach(() => {
      prisma.messages.create.mockResolvedValue({ id: "prop-1" });
      prisma.messages.updateMany.mockResolvedValue({ count: 0 });
      prisma.messages.update.mockResolvedValue({ id: "prop-1" });
      prisma.visits.update.mockResolvedValue({ id: VISIT_ID });
    });

    it("cualquiera de los dos puede proponer una fecha", async () => {
      await service.proposeVisitDate(CITIZEN_ID, VISIT_ID, {
        proposed_date: FUTURE,
      });
      await service.proposeVisitDate(VOLUNTEER_USER_ID, VISIT_ID, {
        proposed_date: FUTURE,
      });

      const roles = prisma.messages.create.mock.calls.map(
        (c) => c[0].data.sender_role,
      );
      expect(roles).toEqual(["CITIZEN", "VOLUNTEER"]);
    });

    // Si alguien propone otra fecha sin responder la anterior, la vieja
    // deja de estar vigente: si no, quedarian dos acuerdos posibles.
    it("una propuesta nueva deja sin vigencia las anteriores", async () => {
      await service.proposeVisitDate(CITIZEN_ID, VISIT_ID, {
        proposed_date: FUTURE,
      });

      expect(prisma.messages.updateMany).toHaveBeenCalledWith({
        where: {
          visit_id: VISIT_ID,
          kind: "DATE_PROPOSAL",
          proposal_status: "PENDING",
        },
        data: { proposal_status: "SUPERSEDED" },
      });
    });

    it("no se puede proponer despues del check-in", async () => {
      prisma.visits.findUnique.mockResolvedValue(
        visitFixture({
          request: {
            citizen_id: CITIZEN_ID,
            reporter_name: "Rosa",
            state: "VERIFICATION_PENDING",
          },
        }),
      );

      await expect(
        service.proposeVisitDate(CITIZEN_ID, VISIT_ID, { proposed_date: FUTURE }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("aceptar fija la fecha y pasa la solicitud a SCHEDULED", async () => {
      prisma.messages.findUnique.mockResolvedValue({
        id: "prop-1",
        visit_id: VISIT_ID,
        kind: "DATE_PROPOSAL",
        proposal_status: "PENDING",
        proposed_date: new Date(FUTURE),
        sender_id: VOLUNTEER_USER_ID,
      });

      await service.respondToProposal(CITIZEN_ID, VISIT_ID, "prop-1", {
        accept: true,
      });

      expect(prisma.visits.update).toHaveBeenCalledWith({
        where: { id: VISIT_ID },
        data: { scheduled_at: new Date(FUTURE) },
      });
      expect(prisma.propertyRequests.update).toHaveBeenCalledWith({
        where: { id: undefined },
        data: { state: "SCHEDULED" },
      });
    });

    it("rechazar no rompe nada: la conversacion sigue", async () => {
      prisma.messages.findUnique.mockResolvedValue({
        id: "prop-1",
        visit_id: VISIT_ID,
        kind: "DATE_PROPOSAL",
        proposal_status: "PENDING",
        proposed_date: new Date(FUTURE),
        sender_id: VOLUNTEER_USER_ID,
      });

      await service.respondToProposal(CITIZEN_ID, VISIT_ID, "prop-1", {
        accept: false,
      });

      expect(prisma.messages.update).toHaveBeenCalledWith({
        where: { id: "prop-1" },
        data: { proposal_status: "DECLINED" },
      });
      expect(prisma.visits.update).not.toHaveBeenCalled();
      expect(prisma.propertyRequests.update).not.toHaveBeenCalled();
    });

    it("quien propone no puede aceptarse a si mismo", async () => {
      prisma.messages.findUnique.mockResolvedValue({
        id: "prop-1",
        visit_id: VISIT_ID,
        kind: "DATE_PROPOSAL",
        proposal_status: "PENDING",
        proposed_date: new Date(FUTURE),
        sender_id: CITIZEN_ID,
      });

      await expect(
        service.respondToProposal(CITIZEN_ID, VISIT_ID, "prop-1", {
          accept: true,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("no se puede responder una propuesta ya vencida", async () => {
      prisma.messages.findUnique.mockResolvedValue({
        id: "prop-1",
        visit_id: VISIT_ID,
        kind: "DATE_PROPOSAL",
        proposal_status: "SUPERSEDED",
        proposed_date: new Date(FUTURE),
        sender_id: VOLUNTEER_USER_ID,
      });

      await expect(
        service.respondToProposal(CITIZEN_ID, VISIT_ID, "prop-1", {
          accept: true,
        }),
      ).rejects.toThrow(/vigente/);
    });

    // SCHEDULED -> SCHEDULED no existe en la maquina de estados: al
    // reagendar solo cambia la fecha.
    it("reagendar sobre una visita ya agendada solo cambia la fecha", async () => {
      prisma.visits.findUnique.mockResolvedValue(
        visitFixture({
          request: {
            citizen_id: CITIZEN_ID,
            reporter_name: "Rosa",
            state: "SCHEDULED",
          },
        }),
      );
      prisma.messages.findUnique.mockResolvedValue({
        id: "prop-2",
        visit_id: VISIT_ID,
        kind: "DATE_PROPOSAL",
        proposal_status: "PENDING",
        proposed_date: new Date(FUTURE),
        sender_id: VOLUNTEER_USER_ID,
      });

      await service.respondToProposal(CITIZEN_ID, VISIT_ID, "prop-2", {
        accept: true,
      });

      expect(prisma.visits.update).toHaveBeenCalled();
      expect(prisma.propertyRequests.update).not.toHaveBeenCalled();
    });

    it("404 si la propuesta no pertenece a esta conversacion", async () => {
      prisma.messages.findUnique.mockResolvedValue({
        id: "prop-1",
        visit_id: "otra-visita",
        kind: "DATE_PROPOSAL",
        proposal_status: "PENDING",
        sender_id: VOLUNTEER_USER_ID,
      });

      await expect(
        service.respondToProposal(CITIZEN_ID, VISIT_ID, "prop-1", {
          accept: true,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
