import { BadRequestException, Injectable } from "@nestjs/common";
import type { RequestState } from "@proyecto/shared-types";

/**
 * Transiciones permitidas de PropertyRequests.state. Este es un canal de
 * acompanamiento comunitario informal (no emite dictamenes oficiales), asi
 * que no hay escalamiento obligatorio por protocolo oficial: si una zona
 * queda marcada como peligrosa, es el ciudadano quien decide y la
 * autoridad competente quien actua, no la plataforma. REASSIGNMENT_REQUIRED
 * reingresa al pool de asignacion (WAITING_VOLUNTEER) porque el voluntario
 * abandono la ruta.
 */
const ALLOWED_TRANSITIONS: Record<RequestState, RequestState[]> = {
  REQUESTED: ["WAITING_VOLUNTEER", "CANCELLED"],
  WAITING_VOLUNTEER: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["SCHEDULED", "IN_PROGRESS", "REASSIGNMENT_REQUIRED", "CANCELLED"],
  SCHEDULED: ["IN_PROGRESS", "REASSIGNMENT_REQUIRED", "CANCELLED"],
  IN_PROGRESS: ["VERIFICATION_PENDING", "REASSIGNMENT_REQUIRED", "CANCELLED"],
  VERIFICATION_PENDING: ["NOTE_PENDING", "REASSIGNMENT_REQUIRED"],
  NOTE_PENDING: ["COMPLETED"],
  REASSIGNMENT_REQUIRED: ["WAITING_VOLUNTEER"],
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
