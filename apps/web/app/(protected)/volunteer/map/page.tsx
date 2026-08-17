"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RequestSidePanel } from "../../../../components/volunteer/RequestSidePanel";
import { HeatmapMap } from "../../../../components/volunteer/HeatmapMap";
import { VOLUNTEER_NAV } from "../../../../components/volunteer/nav";
import { AppHeader } from "../../../../components/ui/AppHeader";
import { Spinner } from "../../../../components/ui/Spinner";
import { ApiError } from "../../../../lib/api-client";
import { useHeatmap } from "../../../../lib/hooks/use-heatmap";
import { useAcceptRequest } from "../../../../lib/hooks/use-visit";
import { useRequireVolunteerRole } from "../../../../lib/hooks/use-require-volunteer-role";
import type { HeatmapItem } from "../../../../lib/types";

const BBOX_DEBOUNCE_MS = 400;

export default function VolunteerMapPage() {
  const router = useRouter();
  const isVolunteer = useRequireVolunteerRole();

  const [bbox, setBbox] = useState<string | null>(null);
  const [selected, setSelected] = useState<HeatmapItem | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const { data: points, isLoading } = useHeatmap(bbox);
  const acceptRequest = useAcceptRequest();

  const handleBoundsChange = (nextBbox: string) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setBbox(nextBbox), BBOX_DEBOUNCE_MS);
  };

  const handleAccept = () => {
    if (!selected) return;
    acceptRequest.mutate(selected.id, {
      onSuccess: (visit) => router.push(`/volunteer/visits/${visit.visit_id}`),
    });
  };

  if (!isVolunteer) {
    return <Spinner label="Verificando perfil de voluntario..." />;
  }

  const acceptError =
    acceptRequest.error instanceof ApiError
      ? acceptRequest.error.message
      : undefined;

  return (
    <div className="flex h-screen flex-col">
      <AppHeader
        subtitle="Panel de analista"
        homeHref="/volunteer"
        nav={VOLUNTEER_NAV}
      />

      <main className="flex flex-1 flex-col overflow-hidden md:flex-row">
        <div className="relative h-1/2 md:h-full md:flex-1">
          <HeatmapMap
            points={points ?? []}
            selectedId={selected?.id ?? null}
            onSelect={setSelected}
            onBoundsChange={handleBoundsChange}
          />
          {isLoading && (
            <div className="absolute left-3 top-3 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-sand-600 shadow-md">
              Cargando solicitudes...
            </div>
          )}
        </div>
        <div className="h-1/2 overflow-y-auto border-t border-sand-200 bg-white md:h-full md:w-80 md:border-l md:border-t-0">
          <RequestSidePanel
            item={selected}
            onAccept={handleAccept}
            isAccepting={acceptRequest.isPending}
            errorMessage={acceptError}
          />
        </div>
      </main>
    </div>
  );
}
