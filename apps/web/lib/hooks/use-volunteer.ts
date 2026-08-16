"use client";

import { useMutation } from "@tanstack/react-query";
import type { RegisterVolunteerInput } from "@proyecto/shared-types";
import { apiClient } from "../api-client";
import { useAuthStore } from "../auth-store";

export function useRegisterVolunteer() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: (input: RegisterVolunteerInput) =>
      apiClient.registerVolunteer(accessToken as string, input),
    onSuccess: (data) => {
      if (user) {
        setSession(data.accessToken, { ...user, role: "VOLUNTEER" });
      }
    },
  });
}
