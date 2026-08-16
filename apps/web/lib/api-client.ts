import type {
  CheckinInput,
  CreatePropertyRequestInput,
  RegisterVolunteerInput,
  RequestOtpInput,
  Role,
  SignedUploadUrlInput,
  SubmitVisitNoteInput,
  VerifyOtpInput,
  VerifyPinInput,
} from "@proyecto/shared-types";
import type {
  HeatmapItem,
  PropertyRequestCreated,
  PropertyRequestDetail,
  PropertyRequestListItem,
  VisitDetail,
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

async function request<TResponse>(
  path: string,
  options: RequestInit & { accessToken?: string | null } = {},
): Promise<TResponse> {
  const { accessToken, headers, ...rest } = options;

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
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
