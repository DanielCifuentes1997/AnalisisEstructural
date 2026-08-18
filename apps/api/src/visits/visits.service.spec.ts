import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { MAX_ACTIVE_VISITS } from "@proyecto/shared-types";
import type { PrismaService } from "../prisma/prisma.service";
import type { AuditService } from "../audit/audit.service";
import { RequestStateMachine } from "../workflow/request-state-machine.service";
import {
  createAuditMock,
  createPrismaMock,
  type PrismaMock,
} from "../test-utils/prisma-mock";
import { hashPin } from "./pin.util";
import type { PushService } from "../push/push.service";
import { VisitsService } from "./visits.service";


/** PushService simulado: los avisos no deben tumbar nada si fallan. */
const createPushMock = () => ({
  sendToUser: jest.fn().mockResolvedValue(1),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
  getPublicKey: jest.fn(),
});

const VOLUNTEER = { id: "vol-1", user_id: "user-vol", is_active: true };
const REQUEST_ID = "req-1";

describe("VisitsService", () => {
  let prisma: PrismaMock;
  let audit: ReturnType<typeof createAuditMock>;
  let push: ReturnType<typeof createPushMock>;
  let service: VisitsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    audit = createAuditMock();
    push = createPushMock();
    service = new VisitsService(
      prisma as unknown as PrismaService,
      new RequestStateMachine(),
      audit as unknown as AuditService,
      push as unknown as PushService,
    );
    prisma.$queryRaw.mockResolvedValue([
      { id: REQUEST_ID, latitude: 4.5, longitude: -75.6 },
    ]);
  });

  describe("acceptRequest", () => {
    beforeEach(() => {
      prisma.volunteerProfiles.findUnique.mockResolvedValue(VOLUNTEER);
      prisma.propertyRequests.findUnique.mockResolvedValue({
        id: REQUEST_ID,
        state: "WAITING_VOLUNTEER",
      });
      prisma.visits.count.mockResolvedValue(0);
      prisma.propertyRequests.updateMany.mockResolvedValue({ count: 1 });
      prisma.visits.create.mockResolvedValue({ id: "visit-1" });
    });

    it("acepta un caso disponible y devuelve el id de la visita", async () => {
      const result = await service.acceptRequest("user-vol", REQUEST_ID);

      expect(result.visit_id).toBe("visit-1");
      expect(prisma.propertyRequests.updateMany).toHaveBeenCalledWith({
        where: { id: REQUEST_ID, state: "WAITING_VOLUNTEER" },
        data: { state: "ASSIGNED" },
      });
    });

    it("guarda el PIN en claro y su hash, nunca lo devuelve al analista", async () => {
      const result = await service.acceptRequest("user-vol", REQUEST_ID);

      const data = prisma.visits.create.mock.calls[0][0].data;
      expect(data.pin_code).toMatch(/^\d{6}$/);
      expect(data.otp_hash).toBe(hashPin(data.pin_code));
      expect(JSON.stringify(result)).not.toContain(data.pin_code);
    });

    // El caso que motivo el UPDATE condicional: dos analistas tocando
    // "aceptar" a la vez sobre la misma solicitud.
    it("rechaza al segundo analista cuando otro ya reclamo el caso", async () => {
      prisma.propertyRequests.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.acceptRequest("user-vol", REQUEST_ID),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.visits.create).not.toHaveBeenCalled();
    });

    // Sin esto el ciudadano tendria que estar revisando la app para
    // saber si alguien lo tomo.
    it("avisa al ciudadano que ya tiene analista", async () => {
      prisma.volunteerProfiles.findUnique.mockResolvedValue({
        ...VOLUNTEER,
        full_name: "Elena Vargas",
      });
      prisma.propertyRequests.findUnique.mockResolvedValue({
        id: REQUEST_ID,
        state: "WAITING_VOLUNTEER",
        citizen_id: "user-citizen",
      });

      await service.acceptRequest("user-vol", REQUEST_ID);

      expect(push.sendToUser).toHaveBeenCalledWith(
        "user-citizen",
        expect.objectContaining({ title: "Ya tienes analista" }),
      );
    });

    it("no deja aceptar mas de los casos permitidos a la vez", async () => {
      prisma.visits.count.mockResolvedValue(MAX_ACTIVE_VISITS);

      await expect(
        service.acceptRequest("user-vol", REQUEST_ID),
      ).rejects.toThrow(/casos abiertos/);
      expect(prisma.propertyRequests.updateMany).not.toHaveBeenCalled();
    });

    it("solo cuenta como activos los casos ni cerrados ni liberados", async () => {
      await service.acceptRequest("user-vol", REQUEST_ID);

      expect(prisma.visits.count).toHaveBeenCalledWith({
        where: {
          volunteer_id: VOLUNTEER.id,
          released_at: null,
          request: { state: { notIn: ["COMPLETED", "CANCELLED"] } },
        },
      });
    });

    it("rechaza a quien no tiene perfil de analista", async () => {
      prisma.volunteerProfiles.findUnique.mockResolvedValue(null);

      await expect(
        service.acceptRequest("user-x", REQUEST_ID),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("rechaza a un analista desactivado", async () => {
      prisma.volunteerProfiles.findUnique.mockResolvedValue({
        ...VOLUNTEER,
        is_active: false,
      });

      await expect(
        service.acceptRequest("user-vol", REQUEST_ID),
      ).rejects.toThrow(/inactivo/);
    });

    it("rechaza una solicitud que ya esta completada", async () => {
      prisma.propertyRequests.findUnique.mockResolvedValue({
        id: REQUEST_ID,
        state: "COMPLETED",
      });

      await expect(
        service.acceptRequest("user-vol", REQUEST_ID),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("releaseVisit", () => {
    beforeEach(() => {
      prisma.volunteerProfiles.findUnique.mockResolvedValue(VOLUNTEER);
      prisma.visits.findUnique.mockResolvedValue({
        id: "visit-1",
        volunteer_id: VOLUNTEER.id,
        request_id: REQUEST_ID,
        released_at: null,
        request: { state: "ASSIGNED" },
      });
    });

    it("devuelve el caso al mapa y lo marca como liberado por el analista", async () => {
      await service.releaseVisit("user-vol", "visit-1", { reason: "No puedo" });

      expect(prisma.visits.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ released_by_role: "VOLUNTEER" }),
        }),
      );
      expect(prisma.propertyRequests.update).toHaveBeenCalledWith({
        where: { id: REQUEST_ID },
        data: { state: "WAITING_VOLUNTEER" },
      });
    });

    it("deja el motivo en la bitacora", async () => {
      await service.releaseVisit("user-vol", "visit-1", { reason: "Me enferme" });

      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "VISIT_RELEASED_BY_VOLUNTEER",
          notes: "Me enferme",
        }),
      );
    });

    it("no permite liberar dos veces el mismo caso", async () => {
      prisma.visits.findUnique.mockResolvedValue({
        id: "visit-1",
        volunteer_id: VOLUNTEER.id,
        request_id: REQUEST_ID,
        released_at: new Date(),
        request: { state: "WAITING_VOLUNTEER" },
      });

      await expect(
        service.releaseVisit("user-vol", "visit-1", {}),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("no deja liberar la visita de otro analista", async () => {
      prisma.visits.findUnique.mockResolvedValue({
        id: "visit-1",
        volunteer_id: "otro-vol",
        request_id: REQUEST_ID,
        released_at: null,
        request: { state: "ASSIGNED" },
      });

      await expect(
        service.releaseVisit("user-vol", "visit-1", {}),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe("checkin", () => {
    beforeEach(() => {
      prisma.volunteerProfiles.findUnique.mockResolvedValue(VOLUNTEER);
      prisma.visits.findUnique.mockResolvedValue({
        id: "visit-1",
        volunteer_id: VOLUNTEER.id,
        request_id: REQUEST_ID,
        request: { state: "ASSIGNED" },
      });
    });

    it("acepta el check-in cuando el analista esta en la puerta", async () => {
      prisma.$queryRaw.mockResolvedValue([{ distance_meters: 12.4 }]);

      const result = await service.checkin("user-vol", "visit-1", {
        latitude: 4.5,
        longitude: -75.6,
      });

      expect(result.distance_meters).toBe(12);
      expect(prisma.propertyRequests.update).toHaveBeenCalledWith({
        where: { id: REQUEST_ID },
        data: { state: "VERIFICATION_PENDING" },
      });
    });

    it("rechaza el check-in desde lejos y dice a cuanto esta", async () => {
      prisma.$queryRaw.mockResolvedValue([{ distance_meters: 850 }]);

      await expect(
        service.checkin("user-vol", "visit-1", { latitude: 4.6, longitude: -75.7 }),
      ).rejects.toThrow(/850m/);
      expect(prisma.propertyRequests.update).not.toHaveBeenCalled();
    });

    it("rechaza el check-in si no se pudo calcular la distancia", async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      await expect(
        service.checkin("user-vol", "visit-1", { latitude: 4.5, longitude: -75.6 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("verifyPin", () => {
    const PIN = "123456";

    beforeEach(() => {
      prisma.volunteerProfiles.findUnique.mockResolvedValue(VOLUNTEER);
      prisma.visits.findUnique.mockResolvedValue({
        id: "visit-1",
        volunteer_id: VOLUNTEER.id,
        request_id: REQUEST_ID,
        otp_hash: hashPin(PIN),
        request: { state: "VERIFICATION_PENDING" },
      });
    });

    it("avanza la visita cuando el PIN coincide", async () => {
      await service.verifyPin("user-vol", "visit-1", { pin: PIN });

      expect(prisma.propertyRequests.update).toHaveBeenCalledWith({
        where: { id: REQUEST_ID },
        data: { state: "NOTE_PENDING" },
      });
    });

    it("rechaza un PIN incorrecto sin cambiar el estado", async () => {
      await expect(
        service.verifyPin("user-vol", "visit-1", { pin: "999999" }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.propertyRequests.update).not.toHaveBeenCalled();
    });
  });

  describe("listMyVisits", () => {
    it("falla si quien pregunta no es analista", async () => {
      prisma.volunteerProfiles.findUnique.mockResolvedValue(null);

      await expect(service.listMyVisits("user-x")).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it("no expone el telefono del ciudadano al analista", async () => {
      prisma.volunteerProfiles.findUnique.mockResolvedValue(VOLUNTEER);
      prisma.visits.findMany.mockResolvedValue([
        {
          id: "visit-1",
          released_at: null,
          created_at: new Date(),
          request_id: REQUEST_ID,
          request: {
            reporter_name: "Rosa",
            address_text: "Calle 1",
            address_complement: "Apto 2",
            housing_type: "APARTAMENTO",
            state: "ASSIGNED",
          },
        },
      ]);

      const visits = await service.listMyVisits("user-vol");

      expect(visits[0]).not.toHaveProperty("citizen_phone");
      expect(JSON.stringify(visits)).not.toMatch(/\+57/);
    });
  });

  describe("getOwnedVisit (a traves de verifyPin)", () => {
    it("404 si la visita no existe", async () => {
      prisma.volunteerProfiles.findUnique.mockResolvedValue(VOLUNTEER);
      prisma.visits.findUnique.mockResolvedValue(null);

      await expect(
        service.verifyPin("user-vol", "visit-x", { pin: "123456" }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("submitNote", () => {
    beforeEach(() => {
      prisma.volunteerProfiles.findUnique.mockResolvedValue(VOLUNTEER);
      prisma.visits.findUnique.mockResolvedValue({
        id: "visit-1",
        volunteer_id: VOLUNTEER.id,
        request_id: REQUEST_ID,
        request: { state: "NOTE_PENDING" },
      });
      prisma.visitNotes.create.mockResolvedValue({ id: "note-1", zones: [] });
    });

    it("guarda las zonas con su estado y cierra la visita", async () => {
      await service.submitNote("user-vol", "visit-1", {
        zones: [
          { zone_name: "Sala", status: "CAUTION", comment: "Grieta" },
          { zone_name: "Cocina", status: "SAFE" },
        ],
        general_comments: "Revisar en un mes",
      });

      const data = prisma.visitNotes.create.mock.calls[0][0].data;
      expect(data.zones.create).toHaveLength(2);
      expect(data.general_comments).toBe("Revisar en un mes");
      expect(prisma.propertyRequests.update).toHaveBeenCalledWith({
        where: { id: REQUEST_ID },
        data: { state: "COMPLETED" },
      });
    });

    // La nota es lo ultimo del flujo: solo cabe tras verificar el PIN.
    it("no deja registrar la nota antes de verificar el PIN", async () => {
      prisma.visits.findUnique.mockResolvedValue({
        id: "visit-1",
        volunteer_id: VOLUNTEER.id,
        request_id: REQUEST_ID,
        request: { state: "ASSIGNED" },
      });

      await expect(
        service.submitNote("user-vol", "visit-1", {
          zones: [{ zone_name: "Sala", status: "SAFE" }],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.visitNotes.create).not.toHaveBeenCalled();
    });
  });
});
