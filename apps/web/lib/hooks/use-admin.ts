"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AdminRequestActionInput,
  RequestState,
  ReviewVolunteerInput,
  UpdateUserStatusInput,
  VerificationStatus,
} from "@proyecto/shared-types";
import { apiClient } from "../api-client";
import { useAuthStore } from "../auth-store";

export function useAdminMetrics() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ["admin", "metrics"],
    queryFn: () => apiClient.getAdminMetrics(accessToken as string),
    enabled: Boolean(accessToken),
  });
}

export function useAdminVolunteers(status?: VerificationStatus) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ["admin", "volunteers", status ?? "all"],
    queryFn: () =>
      apiClient.listAdminVolunteers(accessToken as string, {
        verification_status: status,
      }),
    enabled: Boolean(accessToken),
  });
}

export function useReviewVolunteer() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      volunteerId,
      input,
    }: {
      volunteerId: string;
      input: ReviewVolunteerInput;
    }) => apiClient.reviewVolunteer(accessToken as string, volunteerId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });
}

export function useAdminRequests(state?: RequestState) {
  const accessToken = useAuthStore((store) => store.accessToken);

  return useQuery({
    queryKey: ["admin", "requests", state ?? "all"],
    queryFn: () =>
      apiClient.listAdminRequests(accessToken as string, { state }),
    enabled: Boolean(accessToken),
  });
}

export function useReturnRequestToPool() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      requestId,
      input,
    }: {
      requestId: string;
      input?: AdminRequestActionInput;
    }) =>
      apiClient.returnRequestToPool(accessToken as string, requestId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });
}

export function useAdminCancelRequest() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      requestId,
      input,
    }: {
      requestId: string;
      input?: AdminRequestActionInput;
    }) => apiClient.adminCancelRequest(accessToken as string, requestId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });
}

export function useUpdateUserStatus() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      input,
    }: {
      userId: string;
      input: UpdateUserStatusInput;
    }) => apiClient.updateUserStatus(accessToken as string, userId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });
}

export function useAuditLogs() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ["admin", "audit-logs"],
    queryFn: () => apiClient.listAuditLogs(accessToken as string),
    enabled: Boolean(accessToken),
  });
}
