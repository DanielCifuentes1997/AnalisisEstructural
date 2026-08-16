import { z } from "zod";
import { zoneStatusSchema } from "./enums";

export const checkinSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});
export type CheckinInput = z.infer<typeof checkinSchema>;

export const verifyPinSchema = z.object({
  pin: z.string().regex(/^\d{6}$/, "El PIN debe tener 6 digitos"),
});
export type VerifyPinInput = z.infer<typeof verifyPinSchema>;

export const visitNoteZoneSchema = z.object({
  zone_name: z.string().min(1, "Indica la zona o habitacion").max(80),
  status: zoneStatusSchema,
  comment: z.string().max(500).optional(),
});

export const submitVisitNoteSchema = z.object({
  general_comments: z.string().max(1000).optional(),
  zones: z.array(visitNoteZoneSchema).min(1, "Agrega al menos una zona"),
});
export type SubmitVisitNoteInput = z.infer<typeof submitVisitNoteSchema>;
