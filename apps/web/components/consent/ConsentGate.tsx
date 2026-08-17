"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DATA_POLICY_VERSION } from "@proyecto/shared-types";
import { apiClient } from "../../lib/api-client";
import { useAuthStore } from "../../lib/auth-store";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { LogoLockup } from "../ui/Logo";

/**
 * Habeas data: la autorizacion debe ser previa e informada, asi que se
 * pide antes de dejar usar la aplicacion, no escondida en un pie de
 * pagina. Se guarda la version aceptada; si la politica cambia, vuelve a
 * aparecer.
 */
export function ConsentGate({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();
  const [checked, setChecked] = useState(false);

  const { data: consent, isLoading } = useQuery({
    queryKey: ["consent"],
    queryFn: () => apiClient.getConsentStatus(accessToken as string),
    enabled: Boolean(accessToken),
  });

  const accept = useMutation({
    mutationFn: () =>
      apiClient.acceptDataPolicy(accessToken as string, {
        version: DATA_POLICY_VERSION,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["consent"] });
    },
  });

  // Mientras se consulta no bloqueamos: evita un parpadeo en cada carga.
  if (isLoading || !consent?.needs_acceptance) {
    return <>{children}</>;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-sand-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <LogoLockup subtitle="Antes de continuar" />
        </div>

        <Card>
          <h1 className="mb-3 text-xl font-semibold text-sand-900">
            Tratamiento de tus datos
          </h1>
          <p className="mb-4 text-sm leading-relaxed text-sand-600">
            Para conectarte con un analista necesitamos guardar tu celular, el
            nombre y la dirección de la vivienda, y las fotos de los daños.
          </p>

          <ul className="mb-4 flex flex-col gap-2 text-sm text-sand-700">
            <li className="flex gap-2">
              <span aria-hidden>🔒</span>
              <span>
                Tu número de celular <strong>nunca</strong> se le entrega al
                analista: se hablan por el chat de la aplicación.
              </span>
            </li>
            <li className="flex gap-2">
              <span aria-hidden>📍</span>
              <span>
                Tu dirección y tu nombre solo se revelan cuando alguien acepta
                tu caso.
              </span>
            </li>
            <li className="flex gap-2">
              <span aria-hidden>✋</span>
              <span>
                Puedes pedir que borremos tus datos cuando quieras.
              </span>
            </li>
          </ul>

          <label className="mb-4 flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-0.5 h-5 w-5 shrink-0"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
            />
            <span className="text-sm text-sand-900">
              Autorizo el tratamiento de mis datos personales según la{" "}
              <Link
                href="/politica-de-datos"
                target="_blank"
                className="font-medium text-brand-700 underline"
              >
                política de tratamiento de datos
              </Link>
              .
            </span>
          </label>

          <Button
            className="w-full"
            disabled={!checked}
            isLoading={accept.isPending}
            onClick={() => accept.mutate()}
          >
            Continuar
          </Button>
        </Card>
      </div>
    </main>
  );
}
