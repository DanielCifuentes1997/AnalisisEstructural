import { z } from "zod";

export const geoPointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});
export type GeoPoint = z.infer<typeof geoPointSchema>;

export const housingTypeSchema = z.enum(["CASA", "APARTAMENTO"]);
export type HousingType = z.infer<typeof housingTypeSchema>;

export const damagesSchema = z.object({
  selected: z.array(z.string()).default([]),
  otros_detalle: z.string().max(500).optional(),
  description: z.string().min(1, "Describe brevemente el problema").max(1000),
});
export type Damages = z.infer<typeof damagesSchema>;

// Datos que el ciudadano reporta en el wizard inicial (triaje), no el
// dictamen tecnico final: ese vive en Reports y lo llena el profesional.
export const createPropertyRequestSchema = z.object({
  location: geoPointSchema,
  address_text: z.string().min(5, "Escribe la direccion completa"),
  reporter_name: z.string().min(2, "Escribe el nombre de la persona"),
  housing_type: housingTypeSchema,
  damages_json: damagesSchema,
  photo_urls: z.array(z.string().url()).max(20).default([]),
});
export type CreatePropertyRequestInput = z.infer<
  typeof createPropertyRequestSchema
>;

// bbox = minLon,minLat,maxLon,maxLat (Seccion 45: GET /v1/requests/heatmap?bbox=...)
export const heatmapQuerySchema = z.object({
  bbox: z.string().transform((value, ctx) => {
    const parts = value.split(",").map(Number);

    if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
      ctx.addIssue({
        code: "custom",
        message: "bbox debe tener el formato minLon,minLat,maxLon,maxLat",
      });
      return z.NEVER;
    }

    const [minLon, minLat, maxLon, maxLat] = parts as [
      number,
      number,
      number,
      number,
    ];

    if (minLon >= maxLon || minLat >= maxLat) {
      ctx.addIssue({
        code: "custom",
        message:
          "bbox invalido: minLon/minLat deben ser menores que maxLon/maxLat",
      });
      return z.NEVER;
    }

    return { minLon, minLat, maxLon, maxLat };
  }),
});
export type HeatmapQuery = z.infer<typeof heatmapQuerySchema>;
