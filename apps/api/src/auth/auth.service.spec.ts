import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import type { JwtService } from "@nestjs/jwt";
import type { AuditService } from "../audit/audit.service";
import type { PrismaService } from "../prisma/prisma.service";
import {
  createAuditMock,
  createPrismaMock,
  type PrismaMock,
} from "../test-utils/prisma-mock";
import { AuthService } from "./auth.service";
import type { OtpProvider } from "./otp/otp-provider.interface";

const PHONE = "+573001112233";
const ADMIN_PHONE = "+573226358507";

describe("AuthService", () => {
  let prisma: PrismaMock;
  let audit: ReturnType<typeof createAuditMock>;
  let otp: { sendOtp: jest.Mock; verifyOtp: jest.Mock };
  let jwt: { signAsync: jest.Mock; verifyAsync: jest.Mock };
  let service: AuthService;
  const originalAdminPhones = process.env.ADMIN_PHONES;

  beforeEach(() => {
    prisma = createPrismaMock();
    audit = createAuditMock();
    otp = { sendOtp: jest.fn(), verifyOtp: jest.fn().mockResolvedValue(true) };
    jwt = {
      signAsync: jest.fn().mockResolvedValue("token"),
      verifyAsync: jest.fn(),
    };
    service = new AuthService(
      otp as unknown as OtpProvider,
      prisma as unknown as PrismaService,
      jwt as unknown as JwtService,
      audit as unknown as AuditService,
    );
    delete process.env.ADMIN_PHONES;
  });

  afterAll(() => {
    process.env.ADMIN_PHONES = originalAdminPhones;
  });

  describe("verifyOtp", () => {
    it("rechaza un codigo invalido", async () => {
      otp.verifyOtp.mockResolvedValue(false);

      await expect(
        service.verifyOtp({ phone_number: PHONE, otp_code: "000000" }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.users.upsert).not.toHaveBeenCalled();
    });

    it("bloquea a una cuenta suspendida", async () => {
      prisma.users.upsert.mockResolvedValue({
        id: "u1",
        phone_number: PHONE,
        role: "CITIZEN",
        status: "SUSPENDED",
      });

      await expect(
        service.verifyOtp({ phone_number: PHONE, otp_code: "123456" }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("crea la sesion de un usuario normal sin tocar su rol", async () => {
      prisma.users.upsert.mockResolvedValue({
        id: "u1",
        phone_number: PHONE,
        role: "CITIZEN",
        status: "ACTIVE",
      });

      const result = await service.verifyOtp({
        phone_number: PHONE,
        otp_code: "123456",
      });

      expect(result.user.role).toBe("CITIZEN");
      expect(prisma.users.update).not.toHaveBeenCalled();
    });
  });

  describe("ADMIN_PHONES", () => {
    beforeEach(() => {
      prisma.users.upsert.mockResolvedValue({
        id: "u1",
        phone_number: ADMIN_PHONE,
        role: "CITIZEN",
        status: "ACTIVE",
      });
      prisma.users.update.mockResolvedValue({
        id: "u1",
        phone_number: ADMIN_PHONE,
        role: "ADMIN",
        status: "ACTIVE",
      });
    });

    it("promueve al telefono configurado", async () => {
      process.env.ADMIN_PHONES = ADMIN_PHONE;

      const result = await service.verifyOtp({
        phone_number: ADMIN_PHONE,
        otp_code: "123456",
      });

      expect(result.user.role).toBe("ADMIN");
    });

    // Es una puerta permanente: tiene que quedar rastro de quien entro.
    it("deja constancia en la bitacora", async () => {
      process.env.ADMIN_PHONES = ADMIN_PHONE;

      await service.verifyOtp({ phone_number: ADMIN_PHONE, otp_code: "123456" });

      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "ADMIN_PROMOTED",
          priorState: "CITIZEN",
          newState: "ADMIN",
        }),
      );
    });

    it("acepta varios telefonos separados por coma y con espacios", async () => {
      process.env.ADMIN_PHONES = `+573000000000, ${ADMIN_PHONE} ,+573111111111`;

      const result = await service.verifyOtp({
        phone_number: ADMIN_PHONE,
        otp_code: "123456",
      });

      expect(result.user.role).toBe("ADMIN");
    });

    it("no promueve a un telefono que no esta en la lista", async () => {
      process.env.ADMIN_PHONES = "+573000000000";
      prisma.users.upsert.mockResolvedValue({
        id: "u2",
        phone_number: PHONE,
        role: "CITIZEN",
        status: "ACTIVE",
      });

      const result = await service.verifyOtp({
        phone_number: PHONE,
        otp_code: "123456",
      });

      expect(result.user.role).toBe("CITIZEN");
      expect(prisma.users.update).not.toHaveBeenCalled();
    });

    it("no vuelve a promover ni a registrar a quien ya es admin", async () => {
      process.env.ADMIN_PHONES = ADMIN_PHONE;
      prisma.users.upsert.mockResolvedValue({
        id: "u1",
        phone_number: ADMIN_PHONE,
        role: "ADMIN",
        status: "ACTIVE",
      });

      await service.verifyOtp({ phone_number: ADMIN_PHONE, otp_code: "123456" });

      expect(prisma.users.update).not.toHaveBeenCalled();
      expect(audit.record).not.toHaveBeenCalled();
    });

    it("con la variable vacia no promueve a nadie", async () => {
      process.env.ADMIN_PHONES = "";

      const result = await service.verifyOtp({
        phone_number: ADMIN_PHONE,
        otp_code: "123456",
      });

      expect(result.user.role).toBe("CITIZEN");
    });
  });

  describe("refresh", () => {
    it("rechaza un token que no es de refresco", async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: "u1", type: "access" });

      await expect(
        service.refresh({ refresh_token: "token-falso" }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("rechaza un token invalido", async () => {
      jwt.verifyAsync.mockRejectedValue(new Error("invalid"));

      await expect(
        service.refresh({ refresh_token: "roto" }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    // Quien se registro como analista despues de emitir el refresh debe
    // recibir su rol nuevo sin volver a iniciar sesion.
    it("relee el rol de la base al renovar", async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: "u1", type: "refresh" });
      prisma.users.findUnique.mockResolvedValue({
        id: "u1",
        phone_number: PHONE,
        role: "VOLUNTEER",
        status: "ACTIVE",
      });

      const result = await service.refresh({ refresh_token: "ok" });

      expect(result.user.role).toBe("VOLUNTEER");
      expect(jwt.signAsync).toHaveBeenCalledWith(
        { sub: "u1", role: "VOLUNTEER" },
        expect.anything(),
      );
    });

    it("bloquea la renovacion de una cuenta suspendida", async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: "u1", type: "refresh" });
      prisma.users.findUnique.mockResolvedValue({
        id: "u1",
        phone_number: PHONE,
        role: "CITIZEN",
        status: "SUSPENDED",
      });

      await expect(
        service.refresh({ refresh_token: "ok" }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("rechaza si el usuario ya no existe", async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: "u1", type: "refresh" });
      prisma.users.findUnique.mockResolvedValue(null);

      await expect(
        service.refresh({ refresh_token: "ok" }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
