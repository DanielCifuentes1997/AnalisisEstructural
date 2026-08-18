import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import type { JwtService } from "@nestjs/jwt";
import type { AuditService } from "../audit/audit.service";
import type { PrismaService } from "../prisma/prisma.service";
import {
  createAuditMock,
  createPrismaMock,
  type PrismaMock,
} from "../test-utils/prisma-mock";
import { VolunteersService } from "./volunteers.service";

const USER_ID = "user-vol";

const profile = (overrides: Record<string, unknown> = {}) => ({
  id: "vol-1",
  user_id: USER_ID,
  full_name: "Elena Vargas",
  id_document_number: "1094563882",
  declared_profession: "INGENIERO_CIVIL",
  professional_license: "COPNIA-123",
  photo_url: "https://example.com/e.jpg",
  verification_status: "VERIFIED",
  is_active: true,
  review_notes: null,
  ...overrides,
});

const validInput = {
  full_name: "Elena Vargas",
  id_document_number: "1094563882",
  professional_license: "COPNIA-123",
  photo_url: "https://example.com/e.jpg",
};

describe("VolunteersService", () => {
  let prisma: PrismaMock;
  let audit: ReturnType<typeof createAuditMock>;
  let service: VolunteersService;

  beforeEach(() => {
    prisma = createPrismaMock();
    audit = createAuditMock();
    service = new VolunteersService(
      prisma as unknown as PrismaService,
      { signAsync: jest.fn().mockResolvedValue("token") } as unknown as JwtService,
      audit as unknown as AuditService,
    );
  });

  describe("getMyProfile", () => {
    it("entrega los avisos que el admin le dejo", async () => {
      prisma.volunteerProfiles.findUnique.mockResolvedValue({
        ...profile(),
        user: { phone_number: "+573001112233" },
        admin_notices: [
          {
            id: "n1",
            body: "Tu foto no parece real",
            created_at: new Date(),
            resolved_at: null,
          },
        ],
      });

      const result = await service.getMyProfile(USER_ID);

      expect(result.notices).toHaveLength(1);
      expect(result.notices[0].body).toBe("Tu foto no parece real");
    });

    it("404 si todavia no se ha registrado", async () => {
      prisma.volunteerProfiles.findUnique.mockResolvedValue(null);

      await expect(service.getMyProfile(USER_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe("updateMyProfile", () => {
    beforeEach(() => {
      prisma.volunteerProfiles.update.mockResolvedValue(profile());
    });

    it("guarda los cambios sin tocar la verificacion si nada cambio", async () => {
      prisma.volunteerProfiles.findUnique.mockResolvedValue(profile());

      await service.updateMyProfile(USER_ID, validInput);

      const data = prisma.volunteerProfiles.update.mock.calls[0][0].data;
      expect(data.verification_status).toBeUndefined();
      expect(audit.record).not.toHaveBeenCalled();
    });

    // Lo que el admin verifico dejo de ser lo publicado: hay que
    // revisarlo de nuevo, si no cualquiera cambia la foto despues.
    it("vuelve a PENDING si cambia la foto de un perfil ya verificado", async () => {
      prisma.volunteerProfiles.findUnique.mockResolvedValue(profile());
      prisma.volunteerProfiles.update.mockResolvedValue(
        profile({ verification_status: "PENDING" }),
      );

      await service.updateMyProfile(USER_ID, {
        ...validInput,
        photo_url: "https://example.com/otra.jpg",
      });

      const data = prisma.volunteerProfiles.update.mock.calls[0][0].data;
      expect(data.verification_status).toBe("PENDING");
      expect(data.verified_at).toBeNull();
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: "VOLUNTEER_PROFILE_UPDATED" }),
      );
    });

    it("tambien al cambiar el numero de documento", async () => {
      prisma.volunteerProfiles.findUnique.mockResolvedValue(profile());

      await service.updateMyProfile(USER_ID, {
        ...validInput,
        id_document_number: "9999999999",
      });

      const data = prisma.volunteerProfiles.update.mock.calls[0][0].data;
      expect(data.verification_status).toBe("PENDING");
    });

    it("no re-verifica a quien todavia estaba PENDING", async () => {
      prisma.volunteerProfiles.findUnique.mockResolvedValue(
        profile({ verification_status: "PENDING" }),
      );

      await service.updateMyProfile(USER_ID, {
        ...validInput,
        photo_url: "https://example.com/otra.jpg",
      });

      const data = prisma.volunteerProfiles.update.mock.calls[0][0].data;
      expect(data.verification_status).toBeUndefined();
    });

    it("marca los avisos del admin como atendidos al editar", async () => {
      prisma.volunteerProfiles.findUnique.mockResolvedValue(profile());

      await service.updateMyProfile(USER_ID, validInput);

      const data = prisma.volunteerProfiles.update.mock.calls[0][0].data;
      expect(data.admin_notices.updateMany.where).toEqual({ resolved_at: null });
    });

    it("exige matricula a una profesion que la requiere", async () => {
      prisma.volunteerProfiles.findUnique.mockResolvedValue(profile());

      await expect(
        service.updateMyProfile(USER_ID, {
          ...validInput,
          professional_license: "   ",
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("no la exige a un oficio que no la tiene", async () => {
      prisma.volunteerProfiles.findUnique.mockResolvedValue(
        profile({ declared_profession: "MAESTRO_DE_OBRA" }),
      );

      await service.updateMyProfile(USER_ID, {
        ...validInput,
        professional_license: undefined,
      });

      const data = prisma.volunteerProfiles.update.mock.calls[0][0].data;
      expect(data.professional_license).toBeNull();
    });

    it("404 si no tiene perfil", async () => {
      prisma.volunteerProfiles.findUnique.mockResolvedValue(null);

      await expect(
        service.updateMyProfile(USER_ID, validInput),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("register", () => {
    const input = {
      full_name: "Elena Vargas",
      id_document_number: "1094563882",
      declared_profession: "INGENIERO_CIVIL" as const,
      professional_license: "COPNIA-123",
      photo_url: "https://example.com/e.jpg",
    };

    it("no deja registrarse dos veces", async () => {
      prisma.volunteerProfiles.findUnique.mockResolvedValue(profile());

      await expect(service.register(USER_ID, input)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it("crea el perfil y devuelve un token con el rol nuevo", async () => {
      prisma.volunteerProfiles.findUnique.mockResolvedValue(null);
      prisma.volunteerProfiles.create.mockResolvedValue(profile());
      prisma.users.update.mockResolvedValue({ id: USER_ID, role: "VOLUNTEER" });

      const result = await service.register(USER_ID, input);

      expect(result.accessToken).toBe("token");
      expect(prisma.users.update).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: { role: "VOLUNTEER" },
      });
    });

    it("guarda null si el oficio no lleva matricula", async () => {
      prisma.volunteerProfiles.findUnique.mockResolvedValue(null);
      prisma.volunteerProfiles.create.mockResolvedValue(profile());
      prisma.users.update.mockResolvedValue({ id: USER_ID });

      await service.register(USER_ID, {
        ...input,
        declared_profession: "MAESTRO_DE_OBRA",
        professional_license: undefined,
      });

      const data = prisma.volunteerProfiles.create.mock.calls[0][0].data;
      expect(data.professional_license).toBeNull();
    });
  });
});
