import { generatePin, hashPin } from "./pin.util";

describe("PIN de verificacion de presencia", () => {
  it("siempre genera seis digitos", () => {
    for (let i = 0; i < 200; i++) {
      expect(generatePin()).toMatch(/^\d{6}$/);
    }
  });

  it("nunca empieza en cero (seria ambiguo al dictarlo)", () => {
    for (let i = 0; i < 200; i++) {
      expect(generatePin().startsWith("0")).toBe(false);
    }
  });

  it("no genera siempre el mismo", () => {
    const pins = new Set(Array.from({ length: 50 }, () => generatePin()));
    expect(pins.size).toBeGreaterThan(1);
  });

  it("el hash es estable para el mismo PIN", () => {
    expect(hashPin("123456")).toBe(hashPin("123456"));
  });

  it("PINs distintos dan hashes distintos", () => {
    expect(hashPin("123456")).not.toBe(hashPin("123457"));
  });

  it("el hash no deja ver el PIN original", () => {
    expect(hashPin("123456")).not.toContain("123456");
    expect(hashPin("123456")).toHaveLength(64);
  });
});
