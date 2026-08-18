import type { PrismaService } from "../prisma/prisma.service";
import { createPrismaMock, type PrismaMock } from "../test-utils/prisma-mock";
import { AuditService } from "./audit.service";

describe("AuditService", () => {
  let prisma: PrismaMock;
  let service: AuditService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new AuditService(prisma as unknown as PrismaService);
  });

  it("guarda la accion con actor, recurso y motivo", async () => {
    prisma.auditLogs.create.mockResolvedValue({ id: "log-1" });

    await service.record({
      actorId: "admin-1",
      action: "USER_SUSPENDED",
      resourceId: "user-9",
      priorState: "ACTIVE",
      newState: "SUSPENDED",
      notes: "Denunciado por pedir dinero",
    });

    expect(prisma.auditLogs.create).toHaveBeenCalledWith({
      data: {
        actor_id: "admin-1",
        action: "USER_SUSPENDED",
        resource_id: "user-9",
        prior_state: "ACTIVE",
        new_state: "SUSPENDED",
        notes: "Denunciado por pedir dinero",
        ip_address: null,
      },
    });
  });

  it("normaliza a null los campos que no se enviaron", async () => {
    prisma.auditLogs.create.mockResolvedValue({ id: "log-1" });

    await service.record({
      actorId: "admin-1",
      action: "VOLUNTEER_VERIFIED",
      resourceId: "vol-1",
    });

    const data = prisma.auditLogs.create.mock.calls[0][0].data;
    expect(data.prior_state).toBeNull();
    expect(data.new_state).toBeNull();
    expect(data.notes).toBeNull();
  });

  /**
   * La operacion administrativa ya se aplico cuando se llama a la
   * bitacora: si el registro falla, tumbar la peticion dejaria al admin
   * creyendo que su accion no surtio efecto cuando si lo hizo.
   */
  it("no propaga el error si la bitacora falla", async () => {
    prisma.auditLogs.create.mockRejectedValue(new Error("db caida"));
    const errorSpy = jest
      .spyOn(service["logger"], "error")
      .mockImplementation(() => undefined);

    await expect(
      service.record({
        actorId: "admin-1",
        action: "VOLUNTEER_VERIFIED",
        resourceId: "vol-1",
      }),
    ).resolves.toBeUndefined();

    // Pero si deja ruido, para que se note que se perdio un registro.
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("lista las entradas mas recientes primero", async () => {
    prisma.auditLogs.findMany.mockResolvedValue([]);

    await service.list();

    expect(prisma.auditLogs.findMany).toHaveBeenCalledWith({
      orderBy: { timestamp: "desc" },
      take: 100,
    });
  });
});
