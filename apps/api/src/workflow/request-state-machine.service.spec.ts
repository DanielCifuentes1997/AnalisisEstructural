import { BadRequestException } from "@nestjs/common";
import type { RequestState } from "@proyecto/shared-types";
import { RequestStateMachine } from "./request-state-machine.service";

const ALL_STATES: RequestState[] = [
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
];

const VALID_TRANSITIONS: [RequestState, RequestState][] = [
  ["REQUESTED", "WAITING_VOLUNTEER"],
  ["REQUESTED", "CANCELLED"],
  ["WAITING_VOLUNTEER", "ASSIGNED"],
  ["WAITING_VOLUNTEER", "CANCELLED"],
  ["ASSIGNED", "SCHEDULED"],
  ["ASSIGNED", "IN_PROGRESS"],
  ["ASSIGNED", "REASSIGNMENT_REQUIRED"],
  ["ASSIGNED", "CANCELLED"],
  ["SCHEDULED", "IN_PROGRESS"],
  ["SCHEDULED", "REASSIGNMENT_REQUIRED"],
  ["SCHEDULED", "CANCELLED"],
  ["IN_PROGRESS", "VERIFICATION_PENDING"],
  ["IN_PROGRESS", "REASSIGNMENT_REQUIRED"],
  ["IN_PROGRESS", "CANCELLED"],
  ["VERIFICATION_PENDING", "NOTE_PENDING"],
  ["VERIFICATION_PENDING", "REASSIGNMENT_REQUIRED"],
  ["NOTE_PENDING", "COMPLETED"],
  ["REASSIGNMENT_REQUIRED", "WAITING_VOLUNTEER"],
];

const TERMINAL_STATES: RequestState[] = ["COMPLETED", "CANCELLED"];

describe("RequestStateMachine", () => {
  const machine = new RequestStateMachine();

  describe("transiciones validas", () => {
    it.each(VALID_TRANSITIONS)("permite %s -> %s", (from, to) => {
      expect(machine.canTransition(from, to)).toBe(true);
      expect(() => machine.assertTransition(from, to)).not.toThrow();
    });
  });

  describe("estados terminales", () => {
    it.each(TERMINAL_STATES)("%s no tiene transiciones de salida", (state) => {
      for (const target of ALL_STATES) {
        expect(machine.canTransition(state, target)).toBe(false);
      }
    });
  });

  describe("transiciones invalidas", () => {
    it("rechaza saltos que se saltan pasos obligatorios", () => {
      expect(machine.canTransition("REQUESTED", "ASSIGNED")).toBe(false);
      expect(machine.canTransition("REQUESTED", "COMPLETED")).toBe(false);
      expect(machine.canTransition("WAITING_VOLUNTEER", "IN_PROGRESS")).toBe(
        false,
      );
    });

    it("rechaza retroceder a un estado anterior", () => {
      expect(machine.canTransition("ASSIGNED", "REQUESTED")).toBe(false);
      expect(machine.canTransition("COMPLETED", "NOTE_PENDING")).toBe(false);
    });

    it("no permite pasar a NOTE_PENDING sin PIN verificado", () => {
      expect(machine.canTransition("IN_PROGRESS", "NOTE_PENDING")).toBe(
        false,
      );
    });

    it("assertTransition lanza BadRequestException con la transicion invalida", () => {
      expect(() =>
        machine.assertTransition("REQUESTED", "COMPLETED"),
      ).toThrow(BadRequestException);
      expect(() =>
        machine.assertTransition("REQUESTED", "COMPLETED"),
      ).toThrow("REQUESTED -> COMPLETED");
    });
  });

  it("cubre exhaustivamente el catalogo completo de estados", () => {
    for (const state of ALL_STATES) {
      expect(() => machine.canTransition(state, state)).not.toThrow();
    }
  });
});
