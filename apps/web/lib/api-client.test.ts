import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  ApiError,
  apiClient,
  registerSessionHandlers,
} from "./api-client";

/**
 * La renovacion silenciosa es la logica mas delicada del frontend: si se
 * rompe, la gente pierde la sesion a mitad de un reporte y no hay nada
 * en pantalla que lo explique.
 */
const fetchMock = vi.fn();
const onRefreshed = vi.fn();
const onExpired = vi.fn();

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

beforeEach(() => {
  fetchMock.mockReset();
  onRefreshed.mockReset();
  onExpired.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  registerSessionHandlers({ onRefreshed, onExpired });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("api-client: renovacion silenciosa", () => {
  it("con el token vigente no intenta renovar nada", async () => {
    fetchMock.mockResolvedValue(jsonResponse([{ id: "r1" }]));

    await apiClient.listMyRequests("token-bueno");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(onRefreshed).not.toHaveBeenCalled();
  });

  it("ante un 401 renueva y reintenta con el token nuevo", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ message: "expirado" }, 401))
      .mockResolvedValueOnce(
        jsonResponse({
          accessToken: "token-nuevo",
          user: { id: "u1", phone_number: "+573001112233", role: "CITIZEN" },
        }),
      )
      .mockResolvedValueOnce(jsonResponse([{ id: "r1" }]));

    const result = await apiClient.listMyRequests("token-viejo");

    expect(result).toEqual([{ id: "r1" }]);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    // El reintento va con el token nuevo, no con el vencido.
    const retryOptions = fetchMock.mock.calls[2]?.[1] as RequestInit & {
      headers: Record<string, string>;
    };
    expect(retryOptions.headers.Authorization).toBe("Bearer token-nuevo");
  });

  it("guarda la sesion renovada sin que el usuario haga nada", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ message: "expirado" }, 401))
      .mockResolvedValueOnce(
        jsonResponse({
          accessToken: "token-nuevo",
          user: { id: "u1", phone_number: "+573001112233", role: "VOLUNTEER" },
        }),
      )
      .mockResolvedValueOnce(jsonResponse([]));

    await apiClient.listMyRequests("token-viejo");

    expect(onRefreshed).toHaveBeenCalledWith("token-nuevo", {
      id: "u1",
      phone_number: "+573001112233",
      role: "VOLUNTEER",
    });
  });

  it("si la renovacion tambien falla, cierra la sesion", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ message: "expirado" }, 401))
      .mockResolvedValueOnce(jsonResponse({ message: "sesion expirada" }, 401));

    await expect(apiClient.listMyRequests("token-viejo")).rejects.toBeInstanceOf(
      ApiError,
    );
    expect(onExpired).toHaveBeenCalled();
  });

  // Sin esto, /refresh se llamaria a si mismo en un bucle infinito.
  it("el propio /refresh no se reintenta a si mismo", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: "no autorizado" }, 401));

    await expect(
      apiClient.verifyOtp({ phone_number: "+573001112233", otp_code: "123456" }),
    ).rejects.toBeInstanceOf(ApiError);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(onExpired).not.toHaveBeenCalled();
  });

  it("no renueva ante otros errores, solo ante el 401", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: "no encontrado" }, 404));

    await expect(
      apiClient.getRequest("token", "req-1"),
    ).rejects.toBeInstanceOf(ApiError);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(onRefreshed).not.toHaveBeenCalled();
  });
});

describe("api-client: una sola renovacion en vuelo", () => {
  // Si tres pantallas fallan a la vez, no pueden pedir tres tokens: el
  // servidor emitiria tres y solo el ultimo serviria.
  it("varias peticiones que fallan a la vez comparten una sola renovacion", async () => {
    let refreshCalls = 0;

    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes("/v1/auth/refresh")) {
        refreshCalls++;
        return jsonResponse({
          accessToken: "token-nuevo",
          user: { id: "u1", phone_number: "+573001112233", role: "CITIZEN" },
        });
      }
      const authHeader = fetchMock.mock.calls.at(-1)?.[1]?.headers?.Authorization;
      if (authHeader === "Bearer token-viejo") {
        return jsonResponse({ message: "expirado" }, 401);
      }
      return jsonResponse([]);
    });

    await Promise.all([
      apiClient.listMyRequests("token-viejo"),
      apiClient.listMyRequests("token-viejo"),
      apiClient.listMyRequests("token-viejo"),
    ]);

    expect(refreshCalls).toBe(1);
  });
});

describe("api-client: errores", () => {
  it("traduce los errores de validacion en mensajes por campo", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          message: [
            { path: ["reporter_name"], message: "Escribe el nombre" },
            { path: ["address_text"], message: "Escribe la direccion" },
          ],
          error: "Bad Request",
          statusCode: 400,
        },
        400,
      ),
    );

    try {
      await apiClient.getRequest("token", "req-1");
      expect.unreachable("deberia haber lanzado");
    } catch (err) {
      const apiError = err as ApiError;
      expect(apiError.fieldErrors).toEqual([
        { path: "reporter_name", message: "Escribe el nombre" },
        { path: "address_text", message: "Escribe la direccion" },
      ]);
      expect(apiError.message).toContain("Escribe el nombre");
    }
  });

  it("da un mensaje entendible cuando no hay conexion", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    try {
      await apiClient.getRequest("token", "req-1");
      expect.unreachable("deberia haber lanzado");
    } catch (err) {
      expect((err as ApiError).message).toBe("No hay conexion con el servidor");
      expect((err as ApiError).statusCode).toBe(0);
    }
  });

  it("maneja un 204 sin cuerpo", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(apiClient.getRequest("token", "req-1")).resolves.toBeUndefined();
  });
});

describe("api-client: cookies de sesion", () => {
  it("siempre manda las cookies (el refresh viaja en una httpOnly)", async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));

    await apiClient.listMyRequests("token");

    const options = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(options.credentials).toBe("include");
  });
});
