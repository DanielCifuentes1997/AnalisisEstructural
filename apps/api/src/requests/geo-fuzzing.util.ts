const EARTH_RADIUS_METERS = 6_371_000;
export const MIN_FUZZ_METERS = 150;
export const MAX_FUZZ_METERS = 250;

/**
 * Desplaza un punto una distancia aleatoria (150-250m, Seccion 17) en una
 * direccion aleatoria. Aproximacion plana valida a esta escala: el error
 * introducido por la curvatura terrestre es despreciable a pocos cientos
 * de metros.
 */
export function fuzzCoordinates(latitude: number, longitude: number) {
  const angle = Math.random() * 2 * Math.PI;
  const distance =
    MIN_FUZZ_METERS + Math.random() * (MAX_FUZZ_METERS - MIN_FUZZ_METERS);

  const deltaLat = (distance * Math.cos(angle)) / EARTH_RADIUS_METERS;
  const deltaLon =
    (distance * Math.sin(angle)) /
    (EARTH_RADIUS_METERS * Math.cos((latitude * Math.PI) / 180));

  return {
    latitude: latitude + (deltaLat * 180) / Math.PI,
    longitude: longitude + (deltaLon * 180) / Math.PI,
  };
}
