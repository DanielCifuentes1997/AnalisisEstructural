import { describe, expect, it } from "vitest";
import { DAMAGE_OPTIONS, damageLabel } from "./damage-labels";

describe("Etiquetas de daños", () => {
  it("cada opcion tiene texto legible, no la clave", () => {
    for (const option of DAMAGE_OPTIONS) {
      expect(option.label).toBeTruthy();
      expect(option.label).not.toBe(option.key);
      expect(option.label).not.toMatch(/_/);
    }
  });

  it("traduce una clave conocida", () => {
    expect(damageLabel("fisuras_grietas")).toMatch(/Fisuras o grietas/i);
  });

  // Si un dato viejo trae una clave que ya no existe, se muestra tal
  // cual en vez de dejar la fila vacia.
  it("una clave desconocida se muestra tal cual", () => {
    expect(damageLabel("clave_vieja")).toBe("clave_vieja");
  });

  it("no hay claves repetidas", () => {
    const keys = DAMAGE_OPTIONS.map((o) => o.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
