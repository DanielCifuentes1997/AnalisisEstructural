import { ForbiddenException, NotFoundException } from "@nestjs/common";
import type { PrismaService } from "../prisma/prisma.service";
import { createPrismaMock, type PrismaMock } from "../test-utils/prisma-mock";
import { ChatService } from "./chat.service";

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
  let service: ChatService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new ChatService(prisma as unknown as PrismaService);
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
      expect(conversation.counterpart.photo_url).toContain("elena.jpg");
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
});
