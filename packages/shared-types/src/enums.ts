import { z } from "zod";

/**
 * Estos enums son la fuente de verdad del contrato API (frontend + backend).
 * Se mantienen manualmente sincronizados con prisma/schema.prisma en
 * packages/database: el frontend nunca debe depender de @prisma/client.
 */

export const roleSchema = z.enum([
  "CITIZEN",
  "PROFESSIONAL",
  "ADMIN",
  "COORD_LOCAL",
]);
export type Role = z.infer<typeof roleSchema>;

export const userStatusSchema = z.enum(["ACTIVE", "SUSPENDED"]);
export type UserStatus = z.infer<typeof userStatusSchema>;

export const requestStateSchema = z.enum([
  "REQUESTED",
  "WAITING_PROFESSIONAL",
  "ASSIGNED",
  "SCHEDULED",
  "IN_PROGRESS",
  "VERIFICATION_PENDING",
  "REPORT_PENDING",
  "COMPLETED",
  "CANCELLED",
  "REASSIGNMENT_REQUIRED",
  "SECOND_VISIT_REQUIRED",
]);
export type RequestState = z.infer<typeof requestStateSchema>;

export const habitabilityStatusSchema = z.enum([
  "GREEN",
  "YELLOW",
  "ORANGE",
  "RED",
]);
export type HabitabilityStatus = z.infer<typeof habitabilityStatusSchema>;
