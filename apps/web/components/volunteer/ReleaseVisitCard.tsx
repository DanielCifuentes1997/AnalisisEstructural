"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MAX_ACTIVE_VISITS } from "@proyecto/shared-types";
import { ApiError } from "../../lib/api-client";
import { useReleaseVisit } from "../../lib/hooks/use-chat";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";

export function ReleaseVisitCard({ visitId }: { visitId: string }) {
  const router = useRouter();
  const release = useReleaseVisit(visitId);
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState("");

  const errorMessage =
    release.error instanceof ApiError ? release.error.message : undefined;

  return (
    <Card className="mt-4">
      {!confirming ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-sand-600">
            ¿Ya no puedes atender este caso?
          </p>
          <Button variant="danger" onClick={() => setConfirming(true)}>
            Liberar caso
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-sand-900">
            El caso volverá al mapa para que otro analista lo tome.
          </p>
          <p className="text-xs text-sand-500">
            Puedes tener hasta {MAX_ACTIVE_VISITS} casos abiertos a la vez;
            liberar este te deja un cupo libre.
          </p>
          <textarea
            className="min-h-20 rounded-xl border border-sand-300 px-4 py-3 text-base"
            placeholder="Motivo (opcional): ej. me salió un viaje"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          {errorMessage && (
            <p className="text-sm text-red-600">{errorMessage}</p>
          )}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              Volver
            </Button>
            <Button
              variant="danger"
              isLoading={release.isPending}
              onClick={() =>
                release.mutate(
                  { reason: reason || undefined },
                  { onSuccess: () => router.push("/volunteer") },
                )
              }
            >
              Sí, liberar
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
