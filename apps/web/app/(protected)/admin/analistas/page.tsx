"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  requiresProfessionalLicense,
  type VerificationStatus,
} from "@proyecto/shared-types";
import { ADMIN_NAV } from "../../../../components/admin/nav";
import { AppHeader } from "../../../../components/ui/AppHeader";
import { Button } from "../../../../components/ui/Button";
import { Card } from "../../../../components/ui/Card";
import { Spinner } from "../../../../components/ui/Spinner";
import { ApiError } from "../../../../lib/api-client";
import {
  useAdminVolunteers,
  useReviewVolunteer,
  useUpdateUserStatus,
} from "../../../../lib/hooks/use-admin";
import { useRequireAdminRole } from "../../../../lib/hooks/use-require-admin-role";
import { PROFESSION_LABELS } from "../../../../lib/profession-labels";
import type { AdminVolunteer } from "../../../../lib/types";

const FILTERS: { value: VerificationStatus | "ALL"; label: string }[] = [
  { value: "PENDING", label: "Por revisar" },
  { value: "VERIFIED", label: "Verificados" },
  { value: "REJECTED", label: "Rechazados" },
  { value: "ALL", label: "Todos" },
];

const VERIFICATION_STYLES: Record<VerificationStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  VERIFIED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-800",
};

const VERIFICATION_LABELS: Record<VerificationStatus, string> = {
  PENDING: "Por revisar",
  VERIFIED: "Verificado",
  REJECTED: "Rechazado",
};

function AnalistasContent() {
  const isAdmin = useRequireAdminRole();
  const searchParams = useSearchParams();
  const initial = searchParams.get("estado") as VerificationStatus | null;
  const [filter, setFilter] = useState<VerificationStatus | "ALL">(
    initial ?? "PENDING",
  );

  const { data: volunteers, isLoading, isError } = useAdminVolunteers(
    filter === "ALL" ? undefined : filter,
  );

  if (!isAdmin) {
    return <Spinner label="Verificando permisos..." />;
  }

  return (
    <div className="min-h-screen bg-sand-50">
      <AppHeader subtitle="Administración" homeHref="/admin" nav={ADMIN_NAV} />

      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-1 text-2xl font-semibold tracking-tight text-sand-900">
          Analistas
        </h1>
        <p className="mb-6 text-sm text-sand-600">
          Verifica la matrícula contra COPNIA o CPNAA antes de marcar a
          alguien como verificado.
        </p>

        <div className="mb-6 flex flex-wrap gap-2">
          {FILTERS.map((option) => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                filter === option.value
                  ? "bg-brand-700 text-white"
                  : "border border-sand-300 bg-white text-sand-700 hover:bg-sand-100"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {isLoading && <Spinner label="Cargando analistas..." />}
        {isError && (
          <p className="text-center text-red-600">
            No pudimos cargar los analistas.
          </p>
        )}

        {volunteers && volunteers.length === 0 && (
          <Card className="text-center">
            <p className="text-sm text-sand-600">
              No hay analistas en esta categoría.
            </p>
          </Card>
        )}

        <div className="flex flex-col gap-4">
          {volunteers?.map((volunteer) => (
            <VolunteerCard key={volunteer.id} volunteer={volunteer} />
          ))}
        </div>
      </main>
    </div>
  );
}

function VolunteerCard({ volunteer }: { volunteer: AdminVolunteer }) {
  const review = useReviewVolunteer();
  const updateStatus = useUpdateUserStatus();
  const [notes, setNotes] = useState(volunteer.review_notes ?? "");
  const [showReject, setShowReject] = useState(false);

  const needsLicense = requiresProfessionalLicense(
    volunteer.declared_profession,
  );
  const error =
    review.error instanceof ApiError
      ? review.error.message
      : updateStatus.error instanceof ApiError
        ? updateStatus.error.message
        : undefined;

  const isSuspended = volunteer.user_status === "SUSPENDED";

  return (
    <Card>
      <div className="flex items-start gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- URL remota de Supabase Storage */}
        <img
          src={volunteer.photo_url}
          alt={volunteer.full_name}
          className="h-16 w-16 shrink-0 rounded-full border border-sand-200 object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-sand-900">
              {volunteer.full_name}
            </h2>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${VERIFICATION_STYLES[volunteer.verification_status]}`}
            >
              {VERIFICATION_LABELS[volunteer.verification_status]}
            </span>
            {!volunteer.is_active && (
              <span className="rounded-full bg-sand-200 px-3 py-1 text-xs font-semibold text-sand-700">
                Desactivado
              </span>
            )}
            {isSuspended && (
              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800">
                Cuenta suspendida
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-sand-600">
            {PROFESSION_LABELS[volunteer.declared_profession]}
          </p>
        </div>
      </div>

      <dl className="mt-4 grid gap-2 border-t border-sand-100 pt-4 text-sm sm:grid-cols-2">
        <Field label="Cédula" value={volunteer.id_document_number} />
        <Field label="Teléfono" value={volunteer.phone_number} />
        <Field
          label="Matrícula profesional"
          value={
            volunteer.professional_license ??
            (needsLicense ? "⚠ Falta (debería tenerla)" : "No aplica")
          }
          highlight={needsLicense}
        />
        <Field label="Visitas realizadas" value={String(volunteer.visits_count)} />
        <Field
          label="Registrado"
          value={new Date(volunteer.created_at).toLocaleDateString("es-CO")}
        />
        {volunteer.verified_at && (
          <Field
            label="Verificado el"
            value={new Date(volunteer.verified_at).toLocaleDateString("es-CO")}
          />
        )}
      </dl>

      {volunteer.review_notes && (
        <p className="mt-3 rounded-xl bg-sand-100 p-3 text-sm text-sand-700">
          <span className="font-medium">Nota de revisión: </span>
          {volunteer.review_notes}
        </p>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {showReject ? (
        <div className="mt-4 flex flex-col gap-3 border-t border-sand-100 pt-4">
          <label className="text-sm font-medium text-sand-700">
            Motivo del rechazo
          </label>
          <textarea
            className="min-h-20 rounded-xl border border-sand-300 px-4 py-3 text-base"
            placeholder="Ej. La matrícula no aparece en COPNIA"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setShowReject(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              isLoading={review.isPending}
              onClick={() =>
                review.mutate(
                  {
                    volunteerId: volunteer.id,
                    input: {
                      verification_status: "REJECTED",
                      is_active: false,
                      review_notes: notes,
                    },
                  },
                  { onSuccess: () => setShowReject(false) },
                )
              }
            >
              Rechazar y desactivar
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-sand-100 pt-4">
          {volunteer.verification_status !== "VERIFIED" && (
            <Button
              isLoading={review.isPending}
              onClick={() =>
                review.mutate({
                  volunteerId: volunteer.id,
                  input: { verification_status: "VERIFIED", is_active: true },
                })
              }
            >
              Verificar
            </Button>
          )}
          {volunteer.verification_status !== "REJECTED" && (
            <Button variant="danger" onClick={() => setShowReject(true)}>
              Rechazar
            </Button>
          )}
          <Button
            variant="secondary"
            isLoading={review.isPending}
            onClick={() =>
              review.mutate({
                volunteerId: volunteer.id,
                input: { is_active: !volunteer.is_active },
              })
            }
          >
            {volunteer.is_active ? "Desactivar" : "Reactivar"}
          </Button>
          <Button
            variant={isSuspended ? "secondary" : "danger"}
            isLoading={updateStatus.isPending}
            onClick={() =>
              updateStatus.mutate({
                userId: volunteer.user_id,
                input: { status: isSuspended ? "ACTIVE" : "SUSPENDED" },
              })
            }
          >
            {isSuspended ? "Levantar suspensión" : "Suspender cuenta"}
          </Button>
        </div>
      )}
    </Card>
  );
}

function Field({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs text-sand-500">{label}</dt>
      <dd
        className={`text-sand-900 ${highlight ? "font-semibold" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}

export default function AdminVolunteersPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <AnalistasContent />
    </Suspense>
  );
}
