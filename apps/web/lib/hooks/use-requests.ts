"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreatePropertyRequestInput } from "@proyecto/shared-types";
import { apiClient } from "../api-client";
import { useAuthStore } from "../auth-store";

export function useMyRequests() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ["requests", "mine"],
    queryFn: () => apiClient.listMyRequests(accessToken as string),
    enabled: Boolean(accessToken),
  });
}

export function useRequestDetail(id: string) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ["requests", id],
    queryFn: () => apiClient.getRequest(accessToken as string, id),
    enabled: Boolean(accessToken) && Boolean(id),
  });
}

export function useCreateRequest() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreatePropertyRequestInput) =>
      apiClient.createRequest(accessToken as string, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["requests", "mine"] });
    },
  });
}
