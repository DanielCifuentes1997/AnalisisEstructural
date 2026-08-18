import { describe, expect, it } from "vitest";
import { urlBase64ToUint8Array } from "./use-push-notifications";

/**
 * Es el unico paso "raro" de toda la suscripcion: si la conversion falla,
 * el navegador rechaza la llave y nadie recibe notificaciones, sin un
 * error que lo explique.
 */
describe("urlBase64ToUint8Array", () => {
  const VAPID_REAL =
    "BKb9TNbmvzfsCBGgqZsKBWAysGH9ee3DYdM6jN5HwBnwMAnAQUyYYFTNEqkPfPiCkxoZVvUWSvnMFqfATpp8ZNo";

  it("una llave VAPID produce los 65 bytes que espera el navegador", () => {
    const bytes = urlBase64ToUint8Array(VAPID_REAL);

    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBe(65);
    // Las llaves VAPID sin comprimir empiezan siempre en 0x04.
    expect(bytes[0]).toBe(0x04);
  });

  it("traduce los caracteres url-safe (- y _) del base64", () => {
    // "-" y "_" reemplazan a "+" y "/" en base64 url-safe.
    const conGuiones = urlBase64ToUint8Array("-_-_");
    const conSimbolos = urlBase64ToUint8Array("+/+/");

    expect(Array.from(conGuiones)).toEqual(Array.from(conSimbolos));
  });

  it("completa el relleno que falta", () => {
    expect(() => urlBase64ToUint8Array("QQ")).not.toThrow();
    expect(urlBase64ToUint8Array("QQ").length).toBe(1);
  });

  it("el buffer es un ArrayBuffer normal, no compartido", () => {
    const bytes = urlBase64ToUint8Array(VAPID_REAL);
    expect(bytes.buffer).toBeInstanceOf(ArrayBuffer);
  });
});
