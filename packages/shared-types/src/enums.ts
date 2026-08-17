import { z } from "zod";

/**
 * Estos enums son la fuente de verdad del contrato API (frontend + backend).
 * Se mantienen manualmente sincronizados con prisma/schema.prisma en
 * packages/database: el frontend nunca debe depender de @prisma/client.
 */

export const roleSchema = z.enum(["CITIZEN", "VOLUNTEER", "ADMIN", "COORD_LOCAL"]);
export type Role = z.infer<typeof roleSchema>;

export const userStatusSchema = z.enum(["ACTIVE", "SUSPENDED"]);
export type UserStatus = z.infer<typeof userStatusSchema>;

// Revision manual del admin sobre un analista. PENDING no le impide
// operar: solo significa que todavia nadie miro su matricula.
export const verificationStatusSchema = z.enum([
  "PENDING",
  "VERIFIED",
  "REJECTED",
]);
export type VerificationStatus = z.infer<typeof verificationStatusSchema>;

export const requestStateSchema = z.enum([
  "REQUESTED",
  "WAITING_VOLUNTEER",
  "ASSIGNED",
  "SCHEDULED",
  "IN_PROGRESS",
  "VERIFICATION_PENDING",
  "NOTE_PENDING",
  "COMPLETED",
  "CANCELLED",
  "REASSIGNMENT_REQUIRED",
]);
export type RequestState = z.infer<typeof requestStateSchema>;

// Estado informal por zona/habitacion de una VisitNote (no es un dictamen
// oficial de habitabilidad, solo orienta al ciudadano mientras llega la
// autoridad competente).
export const zoneStatusSchema = z.enum(["SAFE", "CAUTION", "DANGEROUS"]);
export type ZoneStatus = z.infer<typeof zoneStatusSchema>;
