"use client";

import { useState } from "react";
import { PROPOSAL_STATUS_LABELS } from "@proyecto/shared-types";
import { ApiError } from "../../lib/api-client";
import {
  useProposeVisitDate,
  useRespondToProposal,
} from "../../lib/hooks/use-chat";
import { Button } from "../ui/Button";
import type { ChatMessage } from "../../lib/types";

export function formatVisitDate(iso: string) {
  return new Date(iso).toLocaleString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
  });
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: "border-amber-300 bg-amber-50",
  ACCEPTED: "border-emerald-300 bg-emerald-50",
  DECLINED: "border-sand-300 bg-sand-100",
  SUPERSEDED: "border-sand-200 bg-sand-100",
};

/** Burbuja de propuesta dentro del hilo de la conversación. */
export function ProposalBubble({
  message,
  visitId,
}: {
  message: ChatMessage;
  visitId: string;
}) {
  const respond = useRespondToProposal(visitId);
  const status = message.proposal_status ?? "PENDING";
  const errorMessage =
    respond.error instanceof ApiError ? respond.error.message : undefined;

  return (
    <div
      className={`max-w-[90%] self-center rounded-2xl border px-4 py-3 ${STATUS_STYLES[status]}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-sand-500">
        📅 Propuesta de visita
      </p>
      <p className="mt-1 font-medium capitalize text-sand-900">
        {message.proposed_date ? formatVisitDate(message.proposed_date) : "—"}
      </p>

      {message.body && (
        <p className="mt-1 text-sm text-sand-600">{message.body}</p>
      )}

      {status !== "PENDING" && (
        <p className="mt-2 text-xs font-medium text-sand-600">
          {PROPOSAL_STATUS_LABELS[status]}
        </p>
      )}

      {status === "PENDING" && !message.can_respond && (
        <p className="mt-2 text-xs text-sand-500">
          Esperando la respuesta de la otra persona.
        </p>
      )}

      {errorMessage && (
        <p className="mt-2 text-sm text-red-600">{errorMessage}</p>
      )}

      {message.can_respond && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            isLoading={respond.isPending}
            onClick={() =>
              respond.mutate({ proposalId: message.id, accept: true })
            }
          >
            Me sirve
          </Button>
          <Button
            variant="secondary"
            isLoading={respond.isPending}
            onClick={() =>
              respond.mutate({ proposalId: message.id, accept: false })
            }
          >
            No puedo
          </Button>
        </div>
      )}
    </div>
  );
}

/** Formulario para proponer una fecha, junto al campo de escribir. */
export function ProposeDateForm({ visitId }: { visitId: string }) {
  const propose = useProposeVisitDate(visitId);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");

  const errorMessage =
    propose.error instanceof ApiError ? propose.error.message : undefined;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl border border-sand-300 px-3 text-sm font-medium text-sand-700 transition-colors hover:bg-sand-100"
      >
        📅 Proponer fecha
      </button>
    );
  }

  return (
    <div className="w-full rounded-xl border border-sand-200 bg-sand-50 p-3">
      <label className="text-sm font-medium text-sand-700">
        ¿Qué día y hora te sirve?
      </label>
      <input
        type="datetime-local"
        className="mt-1.5 min-h-12 w-full rounded-xl border border-sand-300 bg-white px-3 text-base"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <input
        type="text"
        placeholder="Nota opcional (ej. mejor en la mañana)"
        className="mt-2 min-h-12 w-full rounded-xl border border-sand-300 bg-white px-3 text-base"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      {errorMessage && (
        <p className="mt-2 text-sm text-red-600">{errorMessage}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
        <Button
          disabled={!value}
          isLoading={propose.isPending}
          onClick={() =>
            propose.mutate(
              {
                // datetime-local no trae zona horaria; toISOString la
                // resuelve con la del dispositivo, que es la correcta.
                proposed_date: new Date(value).toISOString(),
                note: note.trim() || undefined,
              },
              {
                onSuccess: () => {
                  setOpen(false);
                  setValue("");
                  setNote("");
                },
              },
            )
          }
        >
          Enviar propuesta
        </Button>
      </div>
    </div>
  );
}
