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

// Profesiones universitarias que en Colombia tienen matricula o tarjeta
// profesional (COPNIA para ingenieria, CPNAA para arquitectura). Los
// oficios y formaciones tecnicas de la lista no la tienen, asi que a
// ellos no se les pide.
const PROFESSIONS_WITH_LICENSE = new Set<Profession>([
  "ARQUITECTO",
  "INGENIERO_CIVIL",
  "INGENIERO_CIVIL_ESTRUCTURAS",
  "INGENIERO_GEOTECNISTA",
]);

export function requiresProfessionalLicense(
  profession: Profession | null | undefined,
): boolean {
  return profession ? PROFESSIONS_WITH_LICENSE.has(profession) : false;
}

// Registro de voluntario: la plataforma NO cruza contra COPNIA/CPNAA
// (decision de producto del pivote). La matricula se guarda solo para
// que el equipo administrador la verifique a mano cuando pueda; nunca
// se le muestra al ciudadano.
export const registerVolunteerSchema = z
  .object({
    full_name: z.string().min(3, "Escribe tu nombre completo").max(120),
    id_document_number: z
      .string()
      .min(5, "Numero de documento invalido")
      .max(20, "Numero de documento invalido"),
    declared_profession: professionSchema,
    professional_license: z.string().max(40).optional(),
    photo_url: z.string().url("Sube tu foto de perfil"),
  })
  .superRefine((value, ctx) => {
    if (!requiresProfessionalLicense(value.declared_profession)) return;

    const license = value.professional_license?.trim() ?? "";
    if (license.length < 4) {
      ctx.addIssue({
        code: "custom",
        path: ["professional_license"],
        message: "Escribe tu numero de matricula o tarjeta profesional",
      });
    }
  });
export type RegisterVolunteerInput = z.infer<typeof registerVolunteerSchema>;
