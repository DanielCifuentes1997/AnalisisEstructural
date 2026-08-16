"use client";

import { useMutation } from "@tanstack/react-query";
import type { SignedUploadUrlInput } from "@proyecto/shared-types";
import { apiClient, ApiError } from "../api-client";
import { useAuthStore } from "../auth-store";

export function useUploadPhoto() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useMutation({
    mutationFn: async ({
      file,
      context,
    }: {
      file: File;
      context: SignedUploadUrlInput["context"];
    }) => {
      const { uploadUrl, publicUrl } = await apiClient.getSignedUploadUrl(
        accessToken as string,
        { context, filename: file.name, content_type: file.type },
      );

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!uploadRes.ok) {
        throw new ApiError({
          message: "No se pudo subir la foto",
          error: "UploadError",
          statusCode: uploadRes.status,
        });
      }

      return publicUrl;
    },
  });
}
