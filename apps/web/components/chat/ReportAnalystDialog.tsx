"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  ABUSE_REASON_LABELS,
  type AbuseReason,
} from "@proyecto/shared-types";
import { apiClient, ApiError } from "../../lib/api-client";
import { useAuthStore } from "../../lib/auth-store";
import { Button } from "../ui/Button";

const REASONS = Object.keys(ABUSE_REASON_LABELS) as AbuseReason[];

/**
 * El texto es lo importante de este componente: el ciudadano no debe
 * confundirlo con reportar los daños de su vivienda. Por eso todo habla
 * de "esta persona" y nunca de la casa.
 */
export function ReportAnalystDialog({
  visitId,
  analystName,
}: {
  visitId: string;
  analystName: string;
}) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<AbuseReason | null>(null);
  const [details, setDetails] = useState("");
  const [sent, setSent] = useState(false);

  const report = useMutation({
    mutationFn: () =>
      apiClient.reportAbuse(accessToken as string, visitId, {
        reason: reason as AbuseReason,
        details: details.trim() || undefined,
      }),
    onSuccess: () => setSent(true),
  });

  const errorMessage =
    report.error instanceof ApiError ? report.error.message : undefined;

  if (sent) {
    return (
      <div className="border-t border-sand-200 bg-emerald-50 px-4 py-3">
        <p className="text-sm font-medium text-emerald-900">
          Gracias, recibimos tu reporte.
        </p>
        <p className="mt-1 text-sm text-emerald-800">
          El equipo que administra la plataforma va a revisar esta
          conversación. Si te sientes en riesgo, llama al 123.
        </p>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="border-t border-sand-200 px-4 py-2.5">
        <button
          onClick={() => setOpen(true)}
          className="text-xs text-sand-500 underline hover:text-red-700"
        >
          Reportar el comportamiento de esta persona
        </button>
      </div>
    );
  }

  return (
    <div className="border-t border-sand-200 bg-sand-50 p-4">
      <h3 className="text-sm font-semibold text-sand-900">
        Reportar a {analystName}
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-sand-600">
        Esto es para avisarnos si <strong>esta persona</strong> se comportó
        mal contigo. No sirve para reportar los daños de tu vivienda: eso ya
        lo hiciste al crear tu solicitud.
      </p>

      <div className="mt-3 flex flex-col gap-2">
        {REASONS.map((option) => (
          <label
            key={option}
            className="flex items-start gap-2.5 rounded-xl border border-sand-200 bg-white px-3 py-2.5"
          >
            <input
              type="radio"
              name={`report-${visitId}`}
              className="mt-0.5 h-4 w-4 shrink-0"
              checked={reason === option}
              onChange={() => setReason(option)}
            />
            <span className="text-sm text-sand-900">
              {ABUSE_REASON_LABELS[option]}
            </span>
          </label>
        ))}
      </div>

      <textarea
        className="mt-3 min-h-20 w-full rounded-xl border border-sand-300 px-3 py-2.5 text-sm"
        placeholder={
          reason === "OTRO"
            ? "Cuéntanos qué pasó (obligatorio)"
            : "¿Quieres contarnos algo más? (opcional)"
        }
        value={details}
        onChange={(e) => setDetails(e.target.value)}
      />

      {errorMessage && (
        <p className="mt-2 text-sm text-red-600">{errorMessage}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
        <Button
          variant="danger"
          isLoading={report.isPending}
          disabled={!reason || (reason === "OTRO" && !details.trim())}
          onClick={() => report.mutate()}
        >
          Enviar reporte
        </Button>
      </div>
    </div>
  );
}
