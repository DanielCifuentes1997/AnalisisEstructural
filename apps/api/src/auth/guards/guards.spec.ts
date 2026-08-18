/**
 * Los guards son la unica barrera entre una peticion cualquiera y los
 * datos: si fallan, ninguna regla de los servicios importa.
 */
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { JwtService } from "@nestjs/jwt";
import type { Role } from "@proyecto/shared-types";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { RolesGuard } from "./roles.guard";

const contextWith = (request: Record<string, unknown>) =>
  ({
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => undefined,
    getClass: () => undefined,
  }) as unknown as ExecutionContext;

describe("JwtAuthGuard", () => {
  let jwt: { verifyAsync: jest.Mock };
  let guard: JwtAuthGuard;

  beforeEach(() => {
    jwt = { verifyAsync: jest.fn() };
    guard = new JwtAuthGuard(jwt as unknown as JwtService);
  });

  it("deja pasar con un token valido y adjunta el usuario", async () => {
    jwt.verifyAsync.mockResolvedValue({ sub: "u1", role: "CITIZEN" });
    const request = { headers: { authorization: "Bearer token-ok" } };

    await expect(guard.canActivate(contextWith(request))).resolves.toBe(true);
    expect((request as { user?: unknown }).user).toEqual({
      sub: "u1",
      role: "CITIZEN",
    });
  });

  it("rechaza si no viene cabecera de autorizacion", async () => {
    await expect(
      guard.canActivate(contextWith({ headers: {} })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rechaza un esquema distinto de Bearer", async () => {
    await expect(
      guard.canActivate(
        contextWith({ headers: { authorization: "Basic abc123" } }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rechaza un token que no verifica", async () => {
    jwt.verifyAsync.mockRejectedValue(new Error("expired"));

    await expect(
      guard.canActivate(
        contextWith({ headers: { authorization: "Bearer vencido" } }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe("RolesGuard", () => {
  const guardFor = (required: Role[] | undefined) => {
    const reflector = new Reflector();
    jest
      .spyOn(reflector, "getAllAndOverride")
      .mockReturnValue(required as never);
    return new RolesGuard(reflector);
  };

  it("deja pasar cuando el rol coincide", () => {
    const guard = guardFor(["ADMIN"]);

    expect(
      guard.canActivate(contextWith({ user: { sub: "u1", role: "ADMIN" } })),
    ).toBe(true);
  });

  it("bloquea a un ciudadano en un endpoint de admin", () => {
    const guard = guardFor(["ADMIN"]);

    expect(() =>
      guard.canActivate(contextWith({ user: { sub: "u1", role: "CITIZEN" } })),
    ).toThrow(ForbiddenException);
  });

  it("bloquea a un analista en un endpoint de admin", () => {
    const guard = guardFor(["ADMIN"]);

    expect(() =>
      guard.canActivate(contextWith({ user: { sub: "u1", role: "VOLUNTEER" } })),
    ).toThrow(ForbiddenException);
  });

  it("acepta cualquiera de los roles listados", () => {
    const guard = guardFor(["CITIZEN", "VOLUNTEER"]);

    expect(
      guard.canActivate(contextWith({ user: { sub: "u1", role: "VOLUNTEER" } })),
    ).toBe(true);
  });

  // Sin @Roles el endpoint queda abierto a cualquier usuario autenticado
  // (el JwtAuthGuard ya corrio antes): es el caso del chat, donde el
  // servicio decide si el que llama es parte de la conversacion.
  it("no restringe si el endpoint no declara roles", () => {
    const guard = guardFor(undefined);

    expect(
      guard.canActivate(contextWith({ user: { sub: "u1", role: "CITIZEN" } })),
    ).toBe(true);
  });

  it("tampoco restringe si la lista viene vacia", () => {
    const guard = guardFor([]);

    expect(
      guard.canActivate(contextWith({ user: { sub: "u1", role: "CITIZEN" } })),
    ).toBe(true);
  });
});
