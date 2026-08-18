"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ProposeVisitDateInput,
  ReleaseVisitInput,
  RespondToProposalInput,
  SendMessageInput,
} from "@proyecto/shared-types";
import { apiClient } from "../api-client";
import { useAuthStore } from "../auth-store";

// Sin websockets todavia: se refresca solo cada pocos segundos mientras
// el chat esta abierto. Alcanza para cuadrar una visita y evita montar
// infraestructura de tiempo real por ahora.
const CHAT_POLL_MS = 5000;
const UNREAD_POLL_MS = 20000;

export function useConversation(visitId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ["chat", visitId],
    queryFn: () => apiClient.getConversation(accessToken as string, visitId),
    enabled: Boolean(accessToken) && Boolean(visitId),
    refetchInterval: CHAT_POLL_MS,
  });
}

export function useSendMessage(visitId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SendMessageInput) =>
      apiClient.sendMessage(accessToken as string, visitId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["chat", visitId] });
      void queryClient.invalidateQueries({ queryKey: ["unread"] });
    },
  });
}

export function useProposeVisitDate(visitId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ProposeVisitDateInput) =>
      apiClient.proposeVisitDate(accessToken as string, visitId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["chat", visitId] });
    },
  });
}

export function useRespondToProposal(visitId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      proposalId,
      ...input
    }: RespondToProposalInput & { proposalId: string }) =>
      apiClient.respondToProposal(
        accessToken as string,
        visitId,
        proposalId,
        input,
      ),
    onSuccess: () => {
      // Aceptar cambia el estado de la solicitud y la visita, no solo el chat.
      void queryClient.invalidateQueries({ queryKey: ["chat", visitId] });
      void queryClient.invalidateQueries({ queryKey: ["requests"] });
      void queryClient.invalidateQueries({ queryKey: ["visits"] });
    },
  });
}

export function useUnreadSummary() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ["unread"],
    queryFn: () => apiClient.getUnreadSummary(accessToken as string),
    enabled: Boolean(accessToken),
    refetchInterval: UNREAD_POLL_MS,
  });
}

export function useReleaseVisit(visitId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ReleaseVisitInput) =>
      apiClient.releaseVisit(accessToken as string, visitId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["visits"] });
    },
  });
}
