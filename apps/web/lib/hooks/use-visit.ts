"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CheckinInput,
  SubmitVisitNoteInput,
  VerifyPinInput,
} from "@proyecto/shared-types";
import { apiClient } from "../api-client";
import { useAuthStore } from "../auth-store";

export function useAcceptRequest() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: string) =>
      apiClient.acceptRequest(accessToken as string, requestId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["heatmap"] });
      void queryClient.invalidateQueries({ queryKey: ["visits"] });
    },
  });
}

export function useMyVisits() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ["visits", "mine"],
    queryFn: () => apiClient.listMyVisits(accessToken as string),
    enabled: Boolean(accessToken),
  });
}

export function useVisitDetail(visitId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ["visits", visitId],
    queryFn: () => apiClient.getVisit(accessToken as string, visitId),
    enabled: Boolean(accessToken) && Boolean(visitId),
  });
}

export function useCheckinVisit(visitId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CheckinInput) =>
      apiClient.checkinVisit(accessToken as string, visitId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["visits"] });
    },
  });
}

export function useVerifyVisitPin(visitId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: VerifyPinInput) =>
      apiClient.verifyVisitPin(accessToken as string, visitId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["visits"] });
    },
  });
}

export function useSubmitVisitNote(visitId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SubmitVisitNoteInput) =>
      apiClient.submitVisitNote(accessToken as string, visitId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["visits"] });
    },
  });
}
