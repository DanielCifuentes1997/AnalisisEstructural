export interface GeocodeResult {
  latitude: number;
  longitude: number;
  place_name: string;
}

// Geocoding directo desde el navegador con el token publico de Mapbox
// (mismo patron que ya usa HeatmapMap.tsx para las tiles) - no necesita
// pasar por el backend.
export async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&country=CO&limit=1`;

  const res = await fetch(url);
  if (!res.ok) return null;

  const body = (await res.json()) as {
    features?: { center: [number, number]; place_name: string }[];
  };
  const feature = body.features?.[0];
  if (!feature) return null;

  const [longitude, latitude] = feature.center;
  return { latitude, longitude, place_name: feature.place_name };
}
