import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import type { RequestState } from "@proyecto/shared-types";
import type { PrismaService } from "../prisma/prisma.service";
import { RequestStateMachine } from "../workflow/request-state-machine.service";
import { createPrismaMock, type PrismaMock } from "../test-utils/prisma-mock";
import type { StorageService } from "../storage/storage.service";
import { RequestsService } from "./requests.service";


/** StorageService simulado: las fotos privadas se firman, no se leen. */
const createStorageMock = () => ({
  resolveVolunteerPhotoUrl: jest
    .fn()
    .mockImplementation(async (stored: string | null) =>
      stored ? `https://firmada.example/${stored}?token=abc` : null,
    ),
  createSignedUploadUrl: jest.fn(),
});

const CITIZEN_ID = "user-citizen";
const REQUEST_ID = "req-1";
const PIN = "482913";

const requestWithVisit = (state: RequestState, visitOverrides = {}) => ({
  id: REQUEST_ID,
  citizen_id: CITIZEN_ID,
  state,
  reporter_name: "Rosa",
  address_text: "Calle 1",
  visits: [
    {
      id: "visit-1",
      pin_code: PIN,
      released_at: null,
      visit_note: null,
      volunteer: {
        full_name: "Elena Vargas",
        photo_url: "https://example.com/e.jpg",
        verification_status: "VERIFIED",
        professional_license: "COPNIA-123",
        id_document_number: "1094563882",
        user: { phone_number: "+573001112233" },
      },
      ...visitOverrides,
    },
  ],
});

describe("RequestsService", () => {
  let prisma: PrismaMock;
  let storage: ReturnType<typeof createStorageMock>;
  let service: RequestsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    storage = createStorageMock();
    service = new RequestsService(
      prisma as unknown as PrismaService,
      new RequestStateMachine(),
      storage as unknown as StorageService,
    );
  });

  describe("findOneForCitizen: el PIN", () => {
    it("se muestra solo mientras el analista espera en la puerta", async () => {
      prisma.propertyRequests.findUnique.mockResolvedValue(
        requestWithVisit("VERIFICATION_PENDING"),
      );

      const result = await service.findOneForCitizen(CITIZEN_ID, REQUEST_ID);

      expect(result.verification_pin).toBe(PIN);
    });

    it.each<RequestState>([
      "ASSIGNED",
      "SCHEDULED",
      "IN_PROGRESS",
      "NOTE_PENDING",
      "COMPLETED",
    ])("no se muestra en estado %s", async (state) => {
      prisma.propertyRequests.findUnique.mockResolvedValue(
        requestWithVisit(state),
      );

      const result = await service.findOneForCitizen(CITIZEN_ID, REQUEST_ID);

      expect(result.verification_pin).toBeNull();
      expect(JSON.stringify(result)).not.toContain(PIN);
    });
  });

  describe("findOneForCitizen: datos del analista", () => {
    it("se revelan cuando ya hay alguien asignado", async () => {
      prisma.propertyRequests.findUnique.mockResolvedValue(
        requestWithVisit("ASSIGNED"),
      );

      const result = await service.findOneForCitizen(CITIZEN_ID, REQUEST_ID);

      expect(result.assigned_volunteer).toEqual({
        full_name: "Elena Vargas",
        // Firmada y temporal: el bucket de fotos de analistas es privado.
        photo_url: "https://firmada.example/https://example.com/e.jpg?token=abc",
        phone_number: "+573001112233",
        is_verified: true,
      });
    });

    it("nunca incluyen la matricula ni la cedula del analista", async () => {
      prisma.propertyRequests.findUnique.mockResolvedValue(
        requestWithVisit("ASSIGNED"),
      );

      const result = await service.findOneForCitizen(CITIZEN_ID, REQUEST_ID);
      const serialized = JSON.stringify(result);

      expect(serialized).not.toContain("COPNIA-123");
      expect(serialized).not.toContain("1094563882");
    });

    it("no se revelan mientras la solicitud sigue buscando analista", async () => {
      prisma.propertyRequests.findUnique.mockResolvedValue(
        requestWithVisit("WAITING_VOLUNTEER"),
      );

      const result = await service.findOneForCitizen(CITIZEN_ID, REQUEST_ID);

      expect(result.assigned_volunteer).toBeNull();
      expect(result.active_visit_id).toBeNull();
    });

    it("marca is_verified en false si el admin todavia no lo reviso", async () => {
      const request = requestWithVisit("ASSIGNED");
      request.visits[0].volunteer.verification_status = "PENDING";
      prisma.propertyRequests.findUnique.mockResolvedValue(request);

      const result = await service.findOneForCitizen(CITIZEN_ID, REQUEST_ID);

      expect(result.assigned_volunteer?.is_verified).toBe(false);
    });
  });

  describe("findOneForCitizen: chat", () => {
    it("entrega el id de la visita para poder abrir el chat", async () => {
      prisma.propertyRequests.findUnique.mockResolvedValue(
        requestWithVisit("ASSIGNED"),
      );

      const result = await service.findOneForCitizen(CITIZEN_ID, REQUEST_ID);

      expect(result.active_visit_id).toBe("visit-1");
    });

    it("no lo entrega si el caso fue liberado", async () => {
      prisma.propertyRequests.findUnique.mockResolvedValue(
        requestWithVisit("ASSIGNED", { released_at: new Date() }),
      );

      const result = await service.findOneForCitizen(CITIZEN_ID, REQUEST_ID);

      expect(result.active_visit_id).toBeNull();
    });
  });

  describe("findOneForCitizen: pertenencia", () => {
    it("bloquea la solicitud de otra persona", async () => {
      prisma.propertyRequests.findUnique.mockResolvedValue(
        requestWithVisit("ASSIGNED"),
      );

      await expect(
        service.findOneForCitizen("otro-usuario", REQUEST_ID),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("404 si no existe", async () => {
      prisma.propertyRequests.findUnique.mockResolvedValue(null);

      await expect(
        service.findOneForCitizen(CITIZEN_ID, REQUEST_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("cancelForCitizen", () => {
    it("cancela mientras nadie ha llegado todavia", async () => {
      prisma.propertyRequests.findUnique.mockResolvedValue({
        id: REQUEST_ID,
        citizen_id: CITIZEN_ID,
        state: "WAITING_VOLUNTEER",
      });

      await service.cancelForCitizen(CITIZEN_ID, REQUEST_ID);

      expect(prisma.propertyRequests.update).toHaveBeenCalledWith({
        where: { id: REQUEST_ID },
        data: { state: "CANCELLED" },
      });
    });

    // La FSM no permite cancelar una vez el analista esta verificando su
    // llegada: ya esta fisicamente ahi.
    it("no deja cancelar cuando el analista ya hizo check-in", async () => {
      prisma.propertyRequests.findUnique.mockResolvedValue({
        id: REQUEST_ID,
        citizen_id: CITIZEN_ID,
        state: "VERIFICATION_PENDING",
      });

      await expect(
        service.cancelForCitizen(CITIZEN_ID, REQUEST_ID),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("no deja cancelar la solicitud de otra persona", async () => {
      prisma.propertyRequests.findUnique.mockResolvedValue({
        id: REQUEST_ID,
        citizen_id: "otro",
        state: "WAITING_VOLUNTEER",
      });

      await expect(
        service.cancelForCitizen(CITIZEN_ID, REQUEST_ID),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe("getHeatmap", () => {
    const bbox = { minLon: -76, minLat: 4, maxLon: -75, maxLat: 5 };

    it("devuelve los puntos tal cual, sin desplazarlos", async () => {
      const row = {
        id: REQUEST_ID,
        housing_type: "CASA",
        state: "WAITING_VOLUNTEER",
        created_at: new Date(),
        damages_json: { selected: ["fisuras_grietas"], description: "Grieta" },
        latitude: 4.5339,
        longitude: -75.6811,
      };
      prisma.$queryRaw.mockResolvedValue([row]);

      const result = await service.getHeatmap(bbox);

      expect(result[0].latitude).toBe(4.5339);
      expect(result[0].longitude).toBe(-75.6811);
    });

    it("incluye los daños y fotos para que el analista decida", async () => {
      prisma.$queryRaw.mockResolvedValue([
        {
          id: REQUEST_ID,
          housing_type: "CASA",
          state: "WAITING_VOLUNTEER",
          created_at: new Date(),
          damages_json: {
            selected: ["colapso_parcial"],
            description: "Se cayo el muro",
            photo_urls: ["https://example.com/1.jpg"],
          },
          latitude: 4.5,
          longitude: -75.6,
        },
      ]);

      const result = await service.getHeatmap(bbox);

      expect(result[0].damages_json).toMatchObject({
        selected: ["colapso_parcial"],
        photo_urls: ["https://example.com/1.jpg"],
      });
    });

    it("no expone identidad del ciudadano antes de aceptar", async () => {
      prisma.$queryRaw.mockResolvedValue([
        {
          id: REQUEST_ID,
          housing_type: "CASA",
          state: "WAITING_VOLUNTEER",
          created_at: new Date(),
          damages_json: { selected: [], description: "x" },
          latitude: 4.5,
          longitude: -75.6,
        },
      ]);

      const result = await service.getHeatmap(bbox);

      expect(result[0]).not.toHaveProperty("address_text");
      expect(result[0]).not.toHaveProperty("reporter_name");
      expect(result[0]).not.toHaveProperty("citizen_phone");
    });
  });
});
