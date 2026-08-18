import { z } from "zod";

// Maximo de casos que un analista puede tener abiertos a la vez. Es la
// defensa contra el saboteador que acepta todo y no va a ninguno: sin
// esto, una sola cuenta falsa podia secuestrar el mapa entero.
export const MAX_ACTIVE_VISITS = 3;

// Aviso fijo en la cabecera del chat. Vive aqui para que el mismo texto
// se muestre a ambas partes y el backend lo pueda citar si hace falta.
export const CHAT_SAFETY_NOTICE =
  "Por tu seguridad, no compartas datos personales (documento, cuentas bancarias, claves) ni hagas pagos por este medio. Este acompanamiento es gratuito.";

export const sendMessageSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Escribe un mensaje")
    .max(1000, "El mensaje es demasiado largo"),
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const releaseVisitSchema = z.object({
  reason: z.string().max(300).optional(),
});
export type ReleaseVisitInput = z.infer<typeof releaseVisitSchema>;

// El analista solo puede tocar estos campos de su propio perfil: la
// profesion no se cambia sola porque de ella depende si necesita
// matricula, y el estado de verificacion es potestad del admin.
export const updateVolunteerProfileSchema = z.object({
  full_name: z.string().trim().min(3, "Escribe tu nombre completo").max(120),
  id_document_number: z
    .string()
    .trim()
    .min(5, "Numero de documento invalido")
    .max(20, "Numero de documento invalido"),
  professional_license: z.string().trim().max(40).optional(),
// Desde que el bucket de fotos de analistas es privado, esto guarda
  // la RUTA dentro del bucket, no una URL: el enlace se firma al
  // momento de mostrarla. Se aceptan URLs completas solo por las fotos
  // que quedaron de cuando el bucket era publico.
  photo_url: z
    .string()
    .trim()
    .min(3, "Sube tu foto de perfil")
    .max(500),
});
export type UpdateVolunteerProfileInput = z.infer<
  typeof updateVolunteerProfileSchema
>;

export const createAdminNoticeSchema = z.object({
  body: z
    .string()
    .trim()
    .min(10, "Explica que debe corregir el analista")
    .max(500),
});
export type CreateAdminNoticeInput = z.infer<typeof createAdminNoticeSchema>;

// Version de la politica de tratamiento de datos que el usuario acepta.
// Si la politica cambia, se sube la version y se vuelve a pedir.
export const DATA_POLICY_VERSION = "2026-08-17";

export const acceptDataPolicySchema = z.object({
  version: z.string().min(1),
});
export type AcceptDataPolicyInput = z.infer<typeof acceptDataPolicySchema>;

// Denuncia sobre el COMPORTAMIENTO del analista. Deliberadamente no
// menciona la vivienda: el ciudadano no debe confundir esto con
// reportar los daños de su casa.
export const abuseReasonSchema = z.enum([
  "PIDIO_DINERO",
  "PIDIO_DATOS_PERSONALES",
  "TRATO_IRRESPETUOSO",
  "NO_LLEGO",
  "SOSPECHOSO",
  "OTRO",
]);
export type AbuseReason = z.infer<typeof abuseReasonSchema>;

export const ABUSE_REASON_LABELS: Record<AbuseReason, string> = {
  PIDIO_DINERO: "Me pidió dinero o algún pago",
  PIDIO_DATOS_PERSONALES: "Me pidió datos personales o bancarios",
  TRATO_IRRESPETUOSO: "Me trató de forma irrespetuosa",
  NO_LLEGO: "Quedó de venir y nunca llegó",
  SOSPECHOSO: "Creo que no es quien dice ser",
  OTRO: "Otra cosa",
};

export const reportAbuseSchema = z
  .object({
    reason: abuseReasonSchema,
    details: z.string().trim().max(1000).optional(),
  })
  .refine(
    (value) => value.reason !== "OTRO" || Boolean(value.details?.trim()),
    { path: ["details"], message: "Cuéntanos qué pasó" },
  );
export type ReportAbuseInput = z.infer<typeof reportAbuseSchema>;

// ---------- Agendar la visita dentro del chat ----------

export const messageKindSchema = z.enum(["TEXT", "DATE_PROPOSAL"]);
export type MessageKind = z.infer<typeof messageKindSchema>;

export const proposalStatusSchema = z.enum([
  "PENDING",
  "ACCEPTED",
  "DECLINED",
  "SUPERSEDED",
]);
export type ProposalStatus = z.infer<typeof proposalStatusSchema>;

export const PROPOSAL_STATUS_LABELS: Record<ProposalStatus, string> = {
  PENDING: "Esperando respuesta",
  ACCEPTED: "Acordada",
  DECLINED: "No le sirvio",
  SUPERSEDED: "Se propuso otra fecha despues",
};

// Cuanto se puede proponer hacia adelante. Mas alla de un mes deja de
// ser "cuadrar una visita" y probablemente es un error de digitacion.
const MAX_DAYS_AHEAD = 30;

export const proposeVisitDateSchema = z.object({
  proposed_date: z
    .string()
    .datetime({ offset: true })
    .refine((value) => new Date(value).getTime() > Date.now(), {
      message: "La fecha propuesta ya paso",
    })
    .refine(
      (value) =>
        new Date(value).getTime() <
        Date.now() + MAX_DAYS_AHEAD * 24 * 60 * 60 * 1000,
      { message: `Propon una fecha dentro de los proximos ${MAX_DAYS_AHEAD} dias` },
    ),
  // Mensaje opcional que acompaña la propuesta ("me queda mejor en la
  // mañana"), para no obligar a mandar dos burbujas.
  note: z.string().trim().max(300).optional(),
});
export type ProposeVisitDateInput = z.infer<typeof proposeVisitDateSchema>;

export const respondToProposalSchema = z.object({
  accept: z.boolean(),
});
export type RespondToProposalInput = z.infer<typeof respondToProposalSchema>;
