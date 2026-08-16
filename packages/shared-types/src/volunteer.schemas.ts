import { z } from "zod";

// Registro de voluntario: solo cedula + profesion auto-declarada, sin
// cruce contra COPNIA/CPNAA (ver decision de producto del pivote).
export const registerVolunteerSchema = z.object({
  id_document_number: z
    .string()
    .min(5, "Numero de documento invalido")
    .max(20, "Numero de documento invalido"),
  declared_profession: z
    .string()
    .min(2, "Indica tu profesion o formacion")
    .max(100),
});
export type RegisterVolunteerInput = z.infer<typeof registerVolunteerSchema>;
