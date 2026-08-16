"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../api-client";
import { useAuthStore } from "../auth-store";

export function useHeatmap(bbox: string | null) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ["heatmap", bbox],
    queryFn: () => apiClient.getHeatmap(accessToken as string, bbox as string),
    enabled: Boolean(accessToken) && Boolean(bbox),
    // El voluntario mueve el mapa seguido; evita parpadeo de "cargando"
    // en cada bbox nuevo mientras conserva la respuesta anterior.
    placeholderData: (previous) => previous,
  });
}
