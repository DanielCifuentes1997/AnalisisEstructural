import { z } from "zod";

export const geoPointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});
export type GeoPoint = z.infer<typeof geoPointSchema>;

// Datos que el ciudadano reporta en el wizard inicial (triaje), no el
// dictamen tecnico final: ese vive en Reports y lo llena el profesional.
export const createPropertyRequestSchema = z.object({
  location: geoPointSchema,
  structural_type: z
    .string()
    .min(1, "Debes indicar el tipo de sistema estructural"),
  floors: z.number().int().positive().max(100),
  damages_json: z.record(z.string(), z.unknown()).default({}),
  photo_urls: z.array(z.string().url()).max(20).default([]),
});
export type CreatePropertyRequestInput = z.infer<
  typeof createPropertyRequestSchema
>;
