import { z } from "zod";
import {
  requestStateSchema,
  userStatusSchema,
  verificationStatusSchema,
} from "./enums";

// Acciones que quedan en AuditLogs. Se escriben como string en la tabla,
// pero se declaran aqui para que el panel las pueda traducir y para no
// inventar nombres nuevos en cada endpoint.
export const auditActionSchema = z.enum([
  "ADMIN_PROMOTED",
  "VOLUNTEER_VERIFIED",
  "VOLUNTEER_REJECTED",
  "VOLUNTEER_REVIEW_RESET",
  "VOLUNTEER_DEACTIVATED",
  "VOLUNTEER_REACTIVATED",
  "USER_SUSPENDED",
  "USER_REACTIVATED",
  "REQUEST_RETURNED_TO_POOL",
  "REQUEST_CANCELLED_BY_ADMIN",
  "VISIT_RELEASED_BY_VOLUNTEER",
  "VISIT_RELEASED_BY_ADMIN",
  "ADMIN_NOTICE_SENT",
  "VOLUNTEER_PROFILE_UPDATED",
]);
export type AuditAction = z.infer<typeof auditActionSchema>;

// PATCH /v1/admin/volunteers/:id - se puede cambiar la revision, el
// estado activo, o ambos en la misma llamada.
export const reviewVolunteerSchema = z
  .object({
    verification_status: verificationStatusSchema.optional(),
    is_active: z.boolean().optional(),
    review_notes: z.string().max(500).optional(),
  })
  .refine(
    (value) =>
      value.verification_status !== undefined || value.is_active !== undefined,
    { message: "Indica que quieres cambiar del analista" },
  )
  .refine(
    (value) =>
      value.verification_status !== "REJECTED" ||
      Boolean(value.review_notes?.trim()),
    {
      path: ["review_notes"],
      // Rechazar a alguien sin explicar por que deja al siguiente admin
      // (o al mismo, meses despues) sin contexto para revisar la decision.
      message: "Escribe el motivo del rechazo",
    },
  );
export type ReviewVolunteerInput = z.infer<typeof reviewVolunteerSchema>;

export const updateUserStatusSchema = z.object({
  status: userStatusSchema,
  reason: z.string().max(500).optional(),
});
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;

export const adminRequestActionSchema = z.object({
  reason: z.string().max(500).optional(),
});
export type AdminRequestActionInput = z.infer<typeof adminRequestActionSchema>;

export const adminVolunteersQuerySchema = z.object({
  verification_status: verificationStatusSchema.optional(),
});
export type AdminVolunteersQuery = z.infer<typeof adminVolunteersQuerySchema>;

export const adminRequestsQuerySchema = z.object({
  state: requestStateSchema.optional(),
});
export type AdminRequestsQuery = z.infer<typeof adminRequestsQuerySchema>;
