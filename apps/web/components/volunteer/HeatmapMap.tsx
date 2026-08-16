"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { HeatmapItem } from "../../lib/types";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

// Armenia, Quindio - ciudad piloto del documento original.
const DEFAULT_CENTER: [number, number] = [-75.6811, 4.5339];
const DEFAULT_ZOOM = 13;
const MAP_STYLE = "mapbox://styles/mapbox/streets-v12";

interface HeatmapMapProps {
  points: HeatmapItem[];
  selectedId: string | null;
  onSelect: (item: HeatmapItem) => void;
  onBoundsChange: (bbox: string) => void;
}

export function HeatmapMap({
  points,
  selectedId,
  onSelect,
  onBoundsChange,
}: HeatmapMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const onBoundsChangeRef = useRef(onBoundsChange);
  const onSelectRef = useRef(onSelect);
  onBoundsChangeRef.current = onBoundsChange;
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    });
    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    const emitBounds = () => {
      const bounds = map.getBounds();
      if (!bounds) return;
      onBoundsChangeRef.current(
        `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`,
      );
    };

    map.on("load", emitBounds);
    map.on("moveend", emitBounds);
    map.on("error", (e) => console.error("Error cargando el mapa:", e.error?.message ?? e));

    mapRef.current = map;
    const markers = markersRef.current;

    return () => {
      map.remove();
      mapRef.current = null;
      markers.clear();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const currentIds = new Set(points.map((p) => p.id));

    for (const [id, marker] of markersRef.current) {
      if (!currentIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    }

    for (const point of points) {
      const existing = markersRef.current.get(point.id);
      if (existing) {
        existing.setLngLat([point.longitude, point.latitude]);
        continue;
      }

      const el = document.createElement("button");
      el.setAttribute("aria-label", `Solicitud ${point.housing_type}`);
      el.style.width = "28px";
      el.style.height = "28px";
      el.style.borderRadius = "9999px";
      el.style.border = "3px solid white";
      el.style.background = "#f59e0b";
      el.style.boxShadow = "0 1px 4px rgba(0,0,0,0.4)";
      el.style.cursor = "pointer";
      el.addEventListener("click", () => onSelectRef.current(point));

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([point.longitude, point.latitude])
        .addTo(map);

      markersRef.current.set(point.id, marker);
    }
  }, [points]);

  useEffect(() => {
    for (const [id, marker] of markersRef.current) {
      const el = marker.getElement();
      el.style.background = id === selectedId ? "#2563eb" : "#f59e0b";
      el.style.width = id === selectedId ? "34px" : "28px";
      el.style.height = id === selectedId ? "34px" : "28px";
    }
  }, [selectedId]);

  return <div ref={containerRef} className="h-full w-full" />;
}
