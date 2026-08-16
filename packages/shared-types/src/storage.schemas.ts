import { z } from "zod";

export const signedUploadUrlSchema = z.object({
  context: z.enum(["request_photo", "volunteer_photo"]),
  filename: z.string().min(1).max(200),
  content_type: z.string().min(1).max(100),
});
export type SignedUploadUrlInput = z.infer<typeof signedUploadUrlSchema>;
