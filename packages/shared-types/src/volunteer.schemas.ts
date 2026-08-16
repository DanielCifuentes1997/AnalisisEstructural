import { z } from "zod";

// Lista restringida a profesiones/formaciones con criterio tecnico en
// construccion (decision de producto: un ing. de sistemas no aplica,
// un arquitecto o ing. civil si).
export const professionSchema = z.enum([
  "ARQUITECTO",
  "INGENIERO_CIVIL",
  "INGENIERO_CIVIL_ESTRUCTURAS",
  "INGENIERO_GEOTECNISTA",
  "CONSTRUCTOR",
  "TECNOLOGO_OBRAS_CIVILES",
  "TECNICO_CONSTRUCCION",
  "MAESTRO_DE_OBRA",
  "ESTUDIANTE_ARQUITECTURA_INGENIERIA_CIVIL",
  "OTRO",
]);
export type Profession = z.infer<typeof professionSchema>;

// Registro de voluntario: cedula + profesion auto-declarada, sin
// cruce contra COPNIA/CPNAA (ver decision de producto del pivote).
export const registerVolunteerSchema = z.object({
  full_name: z.string().min(3, "Escribe tu nombre completo").max(120),
  id_document_number: z
    .string()
    .min(5, "Numero de documento invalido")
    .max(20, "Numero de documento invalido"),
  declared_profession: professionSchema,
  photo_url: z.string().url("Sube tu foto de perfil"),
});
export type RegisterVolunteerInput = z.infer<typeof registerVolunteerSchema>;
