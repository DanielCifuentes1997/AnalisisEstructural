"use client";

import { useMutation } from "@tanstack/react-query";
import type { RequestOtpInput, VerifyOtpInput } from "@proyecto/shared-types";
import { apiClient } from "../api-client";
import { useAuthStore } from "../auth-store";

export function useRequestOtp() {
  return useMutation({
    mutationFn: (input: RequestOtpInput) => apiClient.requestOtp(input),
  });
}

export function useVerifyOtp() {
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: (input: VerifyOtpInput) => apiClient.verifyOtp(input),
    onSuccess: (data) => {
      setSession(data.accessToken, data.user);
    },
  });
}
