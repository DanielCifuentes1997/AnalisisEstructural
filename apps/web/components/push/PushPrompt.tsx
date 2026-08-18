"use client";

import { useEffect, useState } from "react";
import { PUSH_PROMPT_COPY } from "@proyecto/shared-types";
import { usePushNotifications } from "../../lib/hooks/use-push-notifications";
import { Button } from "../ui/Button";

const DISMISSED_KEY = "push-prompt-dismissed";

/**
 * Aviso que pide permiso para las notificaciones.
 *
 * El navegador solo deja preguntar una vez de verdad: si la persona
 * dice que no, no hay forma de volver a pedirlo. Por eso esto no salta
 * apenas entra, sino donde ya entendio para que sirven, y se puede
 * posponer sin quemar el permiso.
 */
export function PushPrompt({ role }: { role: "CITIZEN" | "VOLUNTEER" }) {
  const { permission, isSubscribing, errorMessage, subscribe } =
    usePushNotifications();
  const [dismissed, setDismissed] = useState(true);
  const [justActivated, setJustActivated] = useState(false);

  // Se lee en un efecto porque localStorage no existe al renderizar en
  // el servidor.
  useEffect(() => {
    setDismissed(window.localStorage.getItem(DISMISSED_KEY) === "true");
  }, []);

  const copy = PUSH_PROMPT_COPY[role];

  if (justActivated) {
    return (
      <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-sm font-medium text-emerald-900">
          ✓ Listo, te vamos a avisar
        </p>
        <p className="mt-1 text-sm text-emerald-800">
          Puedes cerrar la app; las notificaciones te llegan igual.
        </p>
      </div>
    );
  }

  // Ya las tiene activas, o el navegador no las soporta: nada que pedir.
  if (permission === "granted" || permission === "unsupported") return null;

  if (permission === "denied") {
    // No se puede volver a preguntar por código: toca que la persona lo
    // cambie en la configuración del navegador.
    if (dismissed) return null;
    return (
      <div className="mb-4 rounded-2xl border border-sand-200 bg-sand-100 p-4">
        <p className="text-sm font-medium text-sand-900">
          Tienes las notificaciones bloqueadas
        </p>
        <p className="mt-1 text-sm text-sand-600">
          Para reactivarlas, entra a la configuración de tu navegador para
          este sitio y permite las notificaciones.
        </p>
        <button
          onClick={() => {
            window.localStorage.setItem(DISMISSED_KEY, "true");
            setDismissed(true);
          }}
          className="mt-3 text-sm text-sand-500 underline"
        >
          Entendido
        </button>
      </div>
    );
  }

  if (dismissed) return null;

  return (
    <div className="mb-4 rounded-2xl border border-brand-200 bg-brand-50 p-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden>
          🔔
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-brand-900">{copy.title}</p>
          <p className="mt-1 text-sm leading-relaxed text-brand-800">
            {copy.body}
          </p>

          {errorMessage && (
            <p className="mt-2 text-sm text-red-600">{errorMessage}</p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              isLoading={isSubscribing}
              onClick={async () => {
                const ok = await subscribe();
                if (ok) setJustActivated(true);
              }}
            >
              {copy.cta}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                window.localStorage.setItem(DISMISSED_KEY, "true");
                setDismissed(true);
              }}
            >
              Ahora no
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
