import {
  fuzzCoordinates,
  MAX_FUZZ_METERS,
  MIN_FUZZ_METERS,
} from "./geo-fuzzing.util";

const EARTH_RADIUS_METERS = 6_371_000;

function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Armenia, Quindio (piloto del documento)
const ORIGIN = { latitude: 4.5339, longitude: -75.6811 };

describe("fuzzCoordinates", () => {
  it("desplaza el punto entre 150 y 250 metros del original (100 muestras)", () => {
    for (let i = 0; i < 100; i++) {
      const fuzzed = fuzzCoordinates(ORIGIN.latitude, ORIGIN.longitude);
      const distance = haversineDistanceMeters(
        ORIGIN.latitude,
        ORIGIN.longitude,
        fuzzed.latitude,
        fuzzed.longitude,
      );

      expect(distance).toBeGreaterThanOrEqual(MIN_FUZZ_METERS - 1);
      expect(distance).toBeLessThanOrEqual(MAX_FUZZ_METERS + 1);
    }
  });

  it("nunca devuelve exactamente el punto original", () => {
    const fuzzed = fuzzCoordinates(ORIGIN.latitude, ORIGIN.longitude);
    expect(fuzzed.latitude).not.toBe(ORIGIN.latitude);
    expect(fuzzed.longitude).not.toBe(ORIGIN.longitude);
  });

  it("produce resultados distintos en llamadas sucesivas", () => {
    const first = fuzzCoordinates(ORIGIN.latitude, ORIGIN.longitude);
    const second = fuzzCoordinates(ORIGIN.latitude, ORIGIN.longitude);
    expect(first).not.toEqual(second);
  });

  it("funciona cerca del ecuador sin dividir por cero", () => {
    expect(() => fuzzCoordinates(0, 0)).not.toThrow();
  });
});
