import { NotFoundException } from "@nestjs/common";
import type { AuditService } from "../audit/audit.service";
import type { PrismaService } from "../prisma/prisma.service";
import { RequestStateMachine } from "../workflow/request-state-machine.service";
import {
  createAuditMock,
  createPrismaMock,
  type PrismaMock,
} from "../test-utils/prisma-mock";
import type { ChatService } from "../chat/chat.service";
import type { StorageService } from "../storage/storage.service";
import { AdminService } from "./admin.service";


/** StorageService simulado: las fotos privadas se firman, no se leen. */
const createStorageMock = () => ({
  resolveVolunteerPhotoUrl: jest
    .fn()
    .mockImplementation(async (stored: string | null) =>
      stored ? `https://firmada.example/${stored}?token=abc` : null,
    ),
  createSignedUploadUrl: jest.fn(),
});

const ADMIN_ID = "user-admin";
const VOLUNTEER_ID = "vol-1";

/** Una visita como la lee listVolunteers para calcular cumplimiento. */
const visit = (state: string, released?: { by: "VOLUNTEER" | "ADMIN" }) => ({
  id: `v-${state}-${released?.by ?? "open"}-${Math.random()}`,
  released_at: released ? new Date() : null,
  released_by_role: released?.by ?? null,
  request: { state },
  abuse_reports: [] as { id: string }[],
});

const volunteerRow = (visits: unknown[]) => ({
  id: VOLUNTEER_ID,
  user_id: "user-vol",
  full_name: "Elena Vargas",
  id_document_number: "1094563882",
  declared_profession: "INGENIERO_CIVIL",
  professional_license: "COPNIA-123",
  photo_url: "https://example.com/e.jpg",
  is_active: true,
  verification_status: "PENDING",
  verified_at: null,
  review_notes: null,
  created_at: new Date(),
  user: { phone_number: "+573001112233", status: "ACTIVE" },
  admin_notices: [],
  visits,
});

describe("AdminService", () => {
  let prisma: PrismaMock;
  let audit: ReturnType<typeof createAuditMock>;
  let chat: { getConversationForAdmin: jest.Mock };
  let service: AdminService;

  beforeEach(() => {
    prisma = createPrismaMock();
    audit = createAuditMock();
    chat = { getConversationForAdmin: jest.fn() };
    service = new AdminService(
      prisma as unknown as PrismaService,
      audit as unknown as AuditService,
      new RequestStateMachine(),
      chat as unknown as ChatService,
      createStorageMock() as unknown as StorageService,
    );
  });

  describe("metricas de cumplimiento", () => {
    const listOne = async (visits: unknown[]) => {
      prisma.volunteerProfiles.findMany.mockResolvedValue([
        volunteerRow(visits),
      ]);
      const [result] = await service.listVolunteers({});
      return result;
    };

    it("separa lo que libero el analista de lo que rescato el admin", async () => {
      const result = await listOne([
        visit("COMPLETED"),
        visit("WAITING_VOLUNTEER", { by: "VOLUNTEER" }),
        visit("WAITING_VOLUNTEER", { by: "ADMIN" }),
      ]);

      expect(result.visits_count).toBe(3);
      expect(result.completed_count).toBe(1);
      expect(result.released_by_self_count).toBe(1);
      expect(result.released_by_admin_count).toBe(1);
    });

    it("no calcula porcentaje con menos de 3 casos cerrados", async () => {
      const result = await listOne([visit("COMPLETED"), visit("ASSIGNED")]);

      expect(result.completion_rate).toBeNull();
      expect(result.is_underperforming).toBe(false);
    });

    it("calcula el porcentaje cuando ya hay muestra suficiente", async () => {
      const result = await listOne([
        visit("COMPLETED"),
        visit("COMPLETED"),
        visit("WAITING_VOLUNTEER", { by: "VOLUNTEER" }),
        visit("WAITING_VOLUNTEER", { by: "ADMIN" }),
      ]);

      expect(result.completion_rate).toBe(50);
    });

    // El perfil del saboteador: acepta, no hace nada, y toca rescatarle.
    it("marca como incumplido a quien no completa y hay que rescatarle", async () => {
      const result = await listOne([
        visit("WAITING_VOLUNTEER", { by: "ADMIN" }),
        visit("WAITING_VOLUNTEER", { by: "ADMIN" }),
        visit("WAITING_VOLUNTEER", { by: "ADMIN" }),
      ]);

      expect(result.completion_rate).toBe(0);
      expect(result.is_underperforming).toBe(true);
    });

    it("no marca a quien completa mas de lo que le rescatan", async () => {
      const result = await listOne([
        visit("COMPLETED"),
        visit("COMPLETED"),
        visit("COMPLETED"),
        visit("WAITING_VOLUNTEER", { by: "ADMIN" }),
      ]);

      expect(result.is_underperforming).toBe(false);
    });

    it("los casos liberados dejan de contar como abiertos", async () => {
      const result = await listOne([
        visit("ASSIGNED"),
        visit("WAITING_VOLUNTEER", { by: "ADMIN" }),
        visit("COMPLETED"),
      ]);

      expect(result.active_visits_count).toBe(1);
    });

    it("suma las denuncias recibidas", async () => {
      const withReports = visit("ASSIGNED");
      withReports.abuse_reports = [{ id: "r1" }, { id: "r2" }];
      const result = await listOne([withReports]);

      expect(result.abuse_reports_count).toBe(2);
    });
  });

  describe("returnRequestToPool", () => {
    beforeEach(() => {
      prisma.propertyRequests.findUnique.mockResolvedValue({
        id: "req-1",
        state: "ASSIGNED",
      });
      prisma.visits.findFirst.mockResolvedValue({ id: "visit-1" });
      prisma.propertyRequests.update.mockResolvedValue({ id: "req-1" });
    });

    // Bug encontrado en pruebas: devolver al mapa dejaba la visita
    // abierta, ocupando cupo del analista y con el chat vivo.
    it("cierra tambien la visita, no solo la solicitud", async () => {
      await service.returnRequestToPool(ADMIN_ID, "req-1", {});

      expect(prisma.visits.update).toHaveBeenCalledWith({
        where: { id: "visit-1" },
        data: { released_at: expect.any(Date), released_by_role: "ADMIN" },
      });
    });

    it("deja el motivo en la bitacora", async () => {
      await service.returnRequestToPool(ADMIN_ID, "req-1", {
        reason: "Nunca fue",
      });

      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "REQUEST_RETURNED_TO_POOL",
          notes: "Nunca fue",
        }),
      );
    });

    it("funciona aunque no quede ninguna visita abierta", async () => {
      prisma.visits.findFirst.mockResolvedValue(null);

      await service.returnRequestToPool(ADMIN_ID, "req-1", {});

      expect(prisma.visits.update).not.toHaveBeenCalled();
    });

    it("404 si la solicitud no existe", async () => {
      prisma.propertyRequests.findUnique.mockResolvedValue(null);

      await expect(
        service.returnRequestToPool(ADMIN_ID, "req-x", {}),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("reviewVolunteer", () => {
    beforeEach(() => {
      prisma.volunteerProfiles.findUnique.mockResolvedValue({
        id: VOLUNTEER_ID,
        verification_status: "PENDING",
        is_active: true,
      });
      prisma.volunteerProfiles.update.mockResolvedValue({ id: VOLUNTEER_ID });
      prisma.visits.findMany.mockResolvedValue([]);
    });

    it("al verificar guarda la fecha y quien reviso", async () => {
      await service.reviewVolunteer(ADMIN_ID, VOLUNTEER_ID, {
        verification_status: "VERIFIED",
      });

      expect(prisma.volunteerProfiles.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            verification_status: "VERIFIED",
            verified_at: expect.any(Date),
            reviewed_by: ADMIN_ID,
          }),
        }),
      );
    });

    it("registra el rechazo en la bitacora con su motivo", async () => {
      await service.reviewVolunteer(ADMIN_ID, VOLUNTEER_ID, {
        verification_status: "REJECTED",
        review_notes: "La matricula no aparece en COPNIA",
      });

      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "VOLUNTEER_REJECTED",
          notes: "La matricula no aparece en COPNIA",
        }),
      );
    });

    // Si se desactiva a alguien y sus casos quedaran suyos, esas
    // solicitudes se congelan para siempre.
    it("al desactivar libera los casos que tenia abiertos", async () => {
      prisma.visits.findMany.mockResolvedValue([
        { id: "visit-1", request_id: "req-1", request: { state: "ASSIGNED" } },
      ]);

      await service.reviewVolunteer(ADMIN_ID, VOLUNTEER_ID, {
        is_active: false,
      });

      expect(prisma.visits.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ released_by_role: "ADMIN" }),
        }),
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: "VISIT_RELEASED_BY_ADMIN" }),
      );
    });

    it("no libera nada al reactivar", async () => {
      prisma.volunteerProfiles.findUnique.mockResolvedValue({
        id: VOLUNTEER_ID,
        verification_status: "VERIFIED",
        is_active: false,
      });

      await service.reviewVolunteer(ADMIN_ID, VOLUNTEER_ID, {
        is_active: true,
      });

      expect(prisma.visits.update).not.toHaveBeenCalled();
    });

    it("404 si el analista no existe", async () => {
      prisma.volunteerProfiles.findUnique.mockResolvedValue(null);

      await expect(
        service.reviewVolunteer(ADMIN_ID, "vol-x", { is_active: false }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("updateUserStatus", () => {
    it("registra la suspension en la bitacora", async () => {
      prisma.users.findUnique.mockResolvedValue({
        id: "user-1",
        status: "ACTIVE",
      });
      prisma.users.update.mockResolvedValue({
        id: "user-1",
        status: "SUSPENDED",
      });
      prisma.volunteerProfiles.findUnique.mockResolvedValue(null);

      await service.updateUserStatus(ADMIN_ID, "user-1", {
        status: "SUSPENDED",
        reason: "Denunciado por pedir dinero",
      });

      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "USER_SUSPENDED",
          notes: "Denunciado por pedir dinero",
        }),
      );
    });

    it("404 si el usuario no existe", async () => {
      prisma.users.findUnique.mockResolvedValue(null);

      await expect(
        service.updateUserStatus(ADMIN_ID, "user-x", { status: "SUSPENDED" }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("listAbuseReports", () => {
    it("expone contra quien va cada denuncia", async () => {
      prisma.abuseReports.findMany.mockResolvedValue([
        {
          id: "rep-1",
          visit_id: "visit-1",
          reason: "PIDIO_DINERO",
          details: "Me pidio consignar",
          created_at: new Date(),
          reviewed_at: null,
          visit: {
            volunteer: { id: VOLUNTEER_ID, full_name: "Elena Vargas" },
            request: { reporter_name: "Rosa", state: "ASSIGNED" },
          },
        },
      ]);

      const [report] = await service.listAbuseReports();

      expect(report.volunteer_name).toBe("Elena Vargas");
      expect(report.citizen_name).toBe("Rosa");
      expect(report.reviewed_at).toBeNull();
    });
  });

  describe("getMetrics", () => {
    it("agrupa las solicitudes por estado y suma el total", async () => {
      prisma.propertyRequests.groupBy.mockResolvedValue([
        { state: "WAITING_VOLUNTEER", _count: { _all: 4 } },
        { state: "COMPLETED", _count: { _all: 6 } },
      ]);
      prisma.volunteerProfiles.groupBy.mockResolvedValue([
        { verification_status: "PENDING", _count: { _all: 2 } },
      ]);
      prisma.volunteerProfiles.count.mockResolvedValue(3);
      prisma.users.count.mockResolvedValue(11);

      const metrics = await service.getMetrics();

      expect(metrics.requests_by_state).toEqual({
        WAITING_VOLUNTEER: 4,
        COMPLETED: 6,
      });
      expect(metrics.requests_total).toBe(10);
      expect(metrics.volunteers_by_verification).toEqual({ PENDING: 2 });
      expect(metrics.volunteers_active).toBe(3);
    });

    it("devuelve ceros cuando no hay nada registrado", async () => {
      prisma.propertyRequests.groupBy.mockResolvedValue([]);
      prisma.volunteerProfiles.groupBy.mockResolvedValue([]);
      prisma.volunteerProfiles.count.mockResolvedValue(0);
      prisma.users.count.mockResolvedValue(0);

      const metrics = await service.getMetrics();

      expect(metrics.requests_total).toBe(0);
      expect(metrics.requests_by_state).toEqual({});
    });
  });

  describe("createNotice", () => {
    it("guarda el aviso y lo registra en la bitacora", async () => {
      prisma.volunteerProfiles.findUnique.mockResolvedValue({ id: VOLUNTEER_ID });
      prisma.adminNotices.create.mockResolvedValue({ id: "n1" });

      await service.createNotice(ADMIN_ID, VOLUNTEER_ID, {
        body: "Tu foto de perfil no parece ser tuya",
      });

      expect(prisma.adminNotices.create).toHaveBeenCalledWith({
        data: {
          volunteer_id: VOLUNTEER_ID,
          admin_id: ADMIN_ID,
          body: "Tu foto de perfil no parece ser tuya",
        },
      });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: "ADMIN_NOTICE_SENT" }),
      );
    });

    it("404 si el analista no existe", async () => {
      prisma.volunteerProfiles.findUnique.mockResolvedValue(null);

      await expect(
        service.createNotice(ADMIN_ID, "vol-x", { body: "Corrige tus datos" }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("listRequests", () => {
    const row = (state: string, hoursAgo: number) => ({
      id: "req-1",
      reporter_name: "Rosa",
      address_text: "Calle 1",
      address_complement: null,
      housing_type: "CASA",
      state,
      created_at: new Date(),
      updated_at: new Date(Date.now() - hoursAgo * 3_600_000),
      citizen: { phone_number: "+573001112233" },
      visits: [{ volunteer: { full_name: "Elena Vargas" } }],
    });

    it("calcula las horas sin avanzar", async () => {
      prisma.propertyRequests.findMany.mockResolvedValue([row("ASSIGNED", 30)]);

      const [result] = await service.listRequests({});

      expect(result.hours_since_update).toBe(30);
      expect(result.is_stuck_candidate).toBe(true);
    });

    it("una solicitud sin analista no puede estar atascada", async () => {
      prisma.propertyRequests.findMany.mockResolvedValue([
        { ...row("WAITING_VOLUNTEER", 50), visits: [] },
      ]);

      const [result] = await service.listRequests({});

      expect(result.is_stuck_candidate).toBe(false);
      expect(result.assigned_volunteer_name).toBeNull();
    });

    it("una completada tampoco", async () => {
      prisma.propertyRequests.findMany.mockResolvedValue([
        row("COMPLETED", 200),
      ]);

      const [result] = await service.listRequests({});

      expect(result.is_stuck_candidate).toBe(false);
    });
  });

  describe("reviewAbuseReport", () => {
    it("marca la denuncia como revisada y deja rastro", async () => {
      prisma.abuseReports.findUnique.mockResolvedValue({
        id: "rep-1",
        reason: "PIDIO_DINERO",
      });
      prisma.abuseReports.update.mockResolvedValue({ id: "rep-1" });

      await service.reviewAbuseReport(ADMIN_ID, "rep-1");

      expect(prisma.abuseReports.update).toHaveBeenCalledWith({
        where: { id: "rep-1" },
        data: { reviewed_at: expect.any(Date), reviewed_by: ADMIN_ID },
      });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: "ABUSE_REPORT_REVIEWED" }),
      );
    });

    it("404 si la denuncia no existe", async () => {
      prisma.abuseReports.findUnique.mockResolvedValue(null);

      await expect(
        service.reviewAbuseReport(ADMIN_ID, "rep-x"),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
