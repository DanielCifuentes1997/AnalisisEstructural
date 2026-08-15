import { BadRequestException, Injectable } from "@nestjs/common";
import type { RequestState } from "@proyecto/shared-types";

/**
 * Transiciones permitidas de PropertyRequests.state (Seccion 44 del
 * documento de diseno). REASSIGNMENT_REQUIRED y SECOND_VISIT_REQUIRED
 * reingresan al pool de asignacion (WAITING_PROFESSIONAL) en vez de ser
 * terminales: el primero porque la brigada abandono la ruta (Seccion 62,
 * boton de panico), el segundo porque un dictamen Amarillo exige una
 * segunda inspeccion con otro profesional (Seccion 22).
 */
const ALLOWED_TRANSITIONS: Record<RequestState, RequestState[]> = {
  REQUESTED: ["WAITING_PROFESSIONAL", "CANCELLED"],
  WAITING_PROFESSIONAL: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: [
    "SCHEDULED",
    "IN_PROGRESS",
    "REASSIGNMENT_REQUIRED",
    "CANCELLED",
  ],
  SCHEDULED: ["IN_PROGRESS", "REASSIGNMENT_REQUIRED", "CANCELLED"],
  IN_PROGRESS: ["VERIFICATION_PENDING", "REASSIGNMENT_REQUIRED", "CANCELLED"],
  VERIFICATION_PENDING: ["REPORT_PENDING", "REASSIGNMENT_REQUIRED"],
  REPORT_PENDING: ["COMPLETED"],
  REASSIGNMENT_REQUIRED: ["WAITING_PROFESSIONAL"],
  SECOND_VISIT_REQUIRED: ["WAITING_PROFESSIONAL"],
  COMPLETED: [],
  CANCELLED: [],
};

@Injectable()
export class RequestStateMachine {
  canTransition(from: RequestState, to: RequestState): boolean {
    return ALLOWED_TRANSITIONS[from].includes(to);
  }

  assertTransition(from: RequestState, to: RequestState): void {
    if (!this.canTransition(from, to)) {
      throw new BadRequestException(`Transicion invalida: ${from} -> ${to}`);
    }
  }
}
