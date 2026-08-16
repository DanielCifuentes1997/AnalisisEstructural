import { createHash, randomInt } from "node:crypto";

// PIN que el ciudadano custodia y dicta al voluntario en el sitio
// (verificacion de presencia, Seccion 20 del documento original).
export function generatePin(): string {
  return randomInt(100000, 999999).toString();
}

export function hashPin(pin: string): string {
  return createHash("sha256").update(pin).digest("hex");
}
