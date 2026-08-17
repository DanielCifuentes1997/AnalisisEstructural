import type {
  AdminRequestActionInput,
  AdminRequestsQuery,
  AdminVolunteersQuery,
  CheckinInput,
  CreatePropertyRequestInput,
  RegisterVolunteerInput,
  RequestOtpInput,
  ReviewVolunteerInput,
  Role,
  SignedUploadUrlInput,
  SubmitVisitNoteInput,
  UpdateUserStatusInput,
  VerifyOtpInput,
  VerifyPinInput,
} from "@proyecto/shared-types";
import type {
  AdminAuditLog,
  AdminMetrics,
  AdminRequest,
  AdminVolunteer,
  HeatmapItem,
  PropertyRequestCreated,
  PropertyRequestDetail,
  PropertyRequestListItem,
  VisitDetail,
  VisitListItem,
} from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

interface ZodIssueLike {
  path: (string | number)[];
  message: string;
}

interface NestErrorBody {
  message: string | ZodIssueLike[];
  error: string;
  statusCode: number;
}

export class ApiError extends Error {
  statusCode: number;
  fieldErrors: { path: string; message: string }[];

  constructor(body: NestErrorBody) {
    const isValidationError = Array.isArray(body.message);
    super(
      isValidationError
        ? (body.message as ZodIssueLike[]).map((i) => i.message).join(", ")
        : (body.message as string),
    );
    this.name = "ApiError";
    this.statusCode = body.statusCode;
    this.fieldErrors = isValidationError
      ? (body.message as ZodIssueLike[]).map((i) => ({
          path: i.path.join("."),
          message: i.message,
        }))
      : [];
  }
}

export interface SessionUser {
  id: string;
  phone_number: string;
  role: Role;
}

// Se inyecta desde auth-store para evitar un import circular: el cliente
// necesita poder refrescar la sesion, y el store necesita al cliente.
let onSessionRefreshed: ((accessToken: string, user: SessionUser) => void) | null =
  null;
let onSessionExpired: (() => void) | null = null;

export function registerSessionHandlers(handlers: {
  onRefreshed: (accessToken: string, user: SessionUser) => void;
  onExpired: () => void;
}) {
  onSessionRefreshed = handlers.onRefreshed;
  onSessionExpired = handlers.onExpired;
}

async function rawFetch(
  path: string,
  options: RequestInit & { accessToken?: string | null },
): Promise<Response> {
  const { accessToken, headers, ...rest } = options;

  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...headers,
      },
    });
  } catch {
    throw new ApiError({
      message: "No hay conexion con el servidor",
      error: "NetworkError",
      statusCode: 0,
    });
  }
}

// Una sola renovacion en vuelo, aunque varias queries fallen con 401 a la
// vez: todas esperan la misma promesa en lugar de pedir tokens en paralelo.
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  refreshInFlight ??= (async () => {
    try {
      const res = await rawFetch("/v1/auth/refresh", { method: "POST" });
      if (!res.ok) return null;
      const body = (await res.json()) as {
        accessToken: string;
        user: SessionUser;
      };
      onSessionRefreshed?.(body.accessToken, body.user);
      return body.accessToken;
    } catch {
      return null;
    } finally {
      // Se libera en el microtask siguiente para que las llamadas que
      // llegaron durante la renovacion reusen este mismo resultado.
      queueMicrotask(() => {
        refreshInFlight = null;
      });
    }
  })();

  return refreshInFlight;
}

async function request<TResponse>(
  path: string,
  options: RequestInit & { accessToken?: string | null } = {},
): Promise<TResponse> {
  let res = await rawFetch(path, options);

  // Sesion vencida: renovamos con la cookie httpOnly y reintentamos una
  // sola vez, para que el usuario nunca vea la pantalla de login a media
  // tarea. El propio /refresh no se reintenta a si mismo.
  if (res.status === 401 && !path.startsWith("/v1/auth/")) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      res = await rawFetch(path, { ...options, accessToken: newToken });
    } else {
      onSessionExpired?.();
    }
  }

  if (res.status === 204) return undefined as TResponse;

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(
      body ?? { message: res.statusText, error: "Error", statusCode: res.status },
    );
  }
  return body as TResponse;
}

export const apiClient = {
  requestOtp: (input: RequestOtpInput) =>
    request<{ message: string }>("/v1/auth/request-otp", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  verifyOtp: (input: VerifyOtpInput) =>
    request<{
      accessToken: string;
      user: { id: string; phone_number: string; role: Role };
    }>("/v1/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  createRequest: (accessToken: string, input: CreatePropertyRequestInput) =>
    request<PropertyRequestCreated>("/v1/requests", {
      method: "POST",
      accessToken,
      body: JSON.stringify(input),
    }),

  listMyRequests: (accessToken: string) =>
    request<PropertyRequestListItem[]>("/v1/requests", { accessToken }),

  getRequest: (accessToken: string, id: string) =>
    request<PropertyRequestDetail>(`/v1/requests/${id}`, { accessToken }),

  cancelRequest: (accessToken: string, id: string) =>
    request<PropertyRequestListItem>(`/v1/requests/${id}/cancel`, {
      method: "POST",
      accessToken,
    }),

  registerVolunteer: (accessToken: string, input: RegisterVolunteerInput) =>
    request<{ profile: unknown; accessToken: string }>("/v1/volunteers", {
      method: "POST",
      accessToken,
      body: JSON.stringify(input),
    }),

  getHeatmap: (accessToken: string, bbox: string) =>
    request<HeatmapItem[]>(
      `/v1/requests/heatmap?bbox=${encodeURIComponent(bbox)}`,
      { accessToken },
    ),

  acceptRequest: (accessToken: string, requestId: string) =>
    request<VisitDetail>(`/v1/requests/${requestId}/accept`, {
      method: "POST",
      accessToken,
    }),

  listMyVisits: (accessToken: string) =>
    request<VisitListItem[]>("/v1/visits", { accessToken }),

  getVisit: (accessToken: string, visitId: string) =>
    request<VisitDetail>(`/v1/visits/${visitId}`, { accessToken }),

  checkinVisit: (accessToken: string, visitId: string, input: CheckinInput) =>
    request<{ message: string; distance_meters: number }>(
      `/v1/visits/${visitId}/checkin`,
      { method: "POST", accessToken, body: JSON.stringify(input) },
    ),

  verifyVisitPin: (accessToken: string, visitId: string, input: VerifyPinInput) =>
    request<{ message: string }>(`/v1/visits/${visitId}/verify-pin`, {
      method: "POST",
      accessToken,
      body: JSON.stringify(input),
    }),

  getSignedUploadUrl: (accessToken: string, input: SignedUploadUrlInput) =>
    request<{ uploadUrl: string; path: string; publicUrl: string }>(
      "/v1/uploads/signed-url",
      { method: "POST", accessToken, body: JSON.stringify(input) },
    ),

  // ---------- Panel de administracion ----------

  getAdminMetrics: (accessToken: string) =>
    request<AdminMetrics>("/v1/admin/metrics", { accessToken }),

  listAdminVolunteers: (accessToken: string, query: AdminVolunteersQuery = {}) =>
    request<AdminVolunteer[]>(
      `/v1/admin/volunteers${query.verification_status ? `?verification_status=${query.verification_status}` : ""}`,
      { accessToken },
    ),

  reviewVolunteer: (
    accessToken: string,
    volunteerId: string,
    input: ReviewVolunteerInput,
  ) =>
    request<AdminVolunteer>(`/v1/admin/volunteers/${volunteerId}`, {
      method: "PATCH",
      accessToken,
      body: JSON.stringify(input),
    }),

  listAdminRequests: (accessToken: string, query: AdminRequestsQuery = {}) =>
    request<AdminRequest[]>(
      `/v1/admin/requests${query.state ? `?state=${query.state}` : ""}`,
      { accessToken },
    ),

  returnRequestToPool: (
    accessToken: string,
    requestId: string,
    input: AdminRequestActionInput = {},
  ) =>
    request<unknown>(`/v1/admin/requests/${requestId}/return-to-pool`, {
      method: "POST",
      accessToken,
      body: JSON.stringify(input),
    }),

  adminCancelRequest: (
    accessToken: string,
    requestId: string,
    input: AdminRequestActionInput = {},
  ) =>
    request<unknown>(`/v1/admin/requests/${requestId}/cancel`, {
      method: "POST",
      accessToken,
      body: JSON.stringify(input),
    }),

  updateUserStatus: (
    accessToken: string,
    userId: string,
    input: UpdateUserStatusInput,
  ) =>
    request<{ id: string; status: string }>(
      `/v1/admin/users/${userId}/status`,
      { method: "PATCH", accessToken, body: JSON.stringify(input) },
    ),

  listAuditLogs: (accessToken: string) =>
    request<AdminAuditLog[]>("/v1/admin/audit-logs", { accessToken }),

  submitVisitNote: (
    accessToken: string,
    visitId: string,
    input: SubmitVisitNoteInput,
  ) =>
    request<unknown>(`/v1/visits/${visitId}/note`, {
      method: "POST",
      accessToken,
      body: JSON.stringify(input),
    }),
};
