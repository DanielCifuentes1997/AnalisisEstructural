import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { RequestState } from "@proyecto/shared-types";
import { StatusBadge } from "./StatusBadge";

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

describe("StatusBadge", () => {
  // Si un estado nuevo no tiene texto, el usuario veria "undefined".
  it.each(ALL_STATES)("%s tiene un texto en español", (state) => {
    render(<StatusBadge state={state} />);

    const badge = screen.getByText(/.+/);
    expect(badge.textContent).toBeTruthy();
    expect(badge.textContent).not.toMatch(/undefined|_/);
  });

  it("traduce los estados tecnicos a lenguaje de la gente", () => {
    render(<StatusBadge state="VERIFICATION_PENDING" />);
    expect(screen.getByText("Confirma con tu PIN")).toBeInTheDocument();
  });

  it("no muestra jerga interna como WAITING_VOLUNTEER", () => {
    render(<StatusBadge state="WAITING_VOLUNTEER" />);
    expect(screen.getByText("Buscando analista")).toBeInTheDocument();
  });

  it("una visita agendada se lee como tal", () => {
    render(<StatusBadge state="SCHEDULED" />);
    expect(screen.getByText("Visita programada")).toBeInTheDocument();
  });
});
