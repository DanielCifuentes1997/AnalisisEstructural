"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

const DEFAULT_CENTER: [number, number] = [-75.6811, 4.5339];
const DEFAULT_ZOOM = 15;
const MAP_STYLE = "mapbox://styles/mapbox/streets-v12";

interface AddressMapPickerProps {
  center: { latitude: number; longitude: number } | null;
  onChange: (value: { latitude: number; longitude: number }) => void;
}

// Mapa imperativo con un solo marcador arrastrable: el usuario puede
// corregir manualmente el resultado del geocoding (caso real dado por
// el usuario: "cra 18 #4a-64" geocodificado como "-68").
export function AddressMapPicker({ center, onChange }: AddressMapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const initialCenterRef = useRef(center);

  useEffect(() => {
    if (!containerRef.current) return;

    const initialCenter = initialCenterRef.current;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: initialCenter
        ? [initialCenter.longitude, initialCenter.latitude]
        : DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    });
    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.on("click", (e) => {
      onChangeRef.current({ latitude: e.lngLat.lat, longitude: e.lngLat.lng });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !center) return;

    if (!markerRef.current) {
      const marker = new mapboxgl.Marker({ draggable: true, color: "#2563eb" })
        .setLngLat([center.longitude, center.latitude])
        .addTo(map);

      marker.on("dragend", () => {
        const lngLat = marker.getLngLat();
        onChangeRef.current({ latitude: lngLat.lat, longitude: lngLat.lng });
      });

      markerRef.current = marker;
    } else {
      markerRef.current.setLngLat([center.longitude, center.latitude]);
    }

    map.flyTo({ center: [center.longitude, center.latitude], zoom: DEFAULT_ZOOM });
  }, [center]);

  return <div ref={containerRef} className="h-64 w-full rounded-lg" />;
}
