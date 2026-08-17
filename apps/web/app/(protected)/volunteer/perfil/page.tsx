"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requiresProfessionalLicense } from "@proyecto/shared-types";
import type { UpdateVolunteerProfileInput } from "@proyecto/shared-types";
import { AppHeader } from "../../../../components/ui/AppHeader";
import { Button } from "../../../../components/ui/Button";
import { Card } from "../../../../components/ui/Card";
import { Spinner } from "../../../../components/ui/Spinner";
import { TextInput } from "../../../../components/ui/TextInput";
import { VOLUNTEER_NAV } from "../../../../components/volunteer/nav";
import { apiClient, ApiError } from "../../../../lib/api-client";
import { useAuthStore } from "../../../../lib/auth-store";
import { useUploadPhoto } from "../../../../lib/hooks/use-upload";
import { useRequireVolunteerRole } from "../../../../lib/hooks/use-require-volunteer-role";
import { PROFESSION_LABELS } from "../../../../lib/profession-labels";

const VERIFICATION_COPY = {
  PENDING: {
    label: "Por revisar",
    tone: "bg-amber-100 text-amber-800",
    help: "Ya puedes tomar casos. Cuando revisemos tu matrícula, quien atiendas verá el distintivo de verificado.",
  },
  VERIFIED: {
    label: "Verificado",
    tone: "bg-emerald-100 text-emerald-800",
    help: "Revisamos tus datos. Las personas que acompañes ven que estás verificado.",
  },
  REJECTED: {
    label: "Rechazado",
    tone: "bg-red-100 text-red-800",
    help: "Tu perfil fue rechazado. Corrige lo que se te indica y volveremos a revisarlo.",
  },
} as const;

export default function VolunteerProfilePage() {
  const isVolunteer = useRequireVolunteerRole();
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();
  const uploadPhoto = useUploadPhoto();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["volunteer", "me"],
    queryFn: () => apiClient.getMyVolunteerProfile(accessToken as string),
    enabled: Boolean(accessToken),
  });

  const [fullName, setFullName] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [license, setLicense] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Se rellena una vez, cuando llega el perfil del servidor.
  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name);
    setDocumentNumber(profile.id_document_number);
    setLicense(profile.professional_license ?? "");
    setPhotoUrl(profile.photo_url);
  }, [profile]);

  const save = useMutation({
    mutationFn: (input: UpdateVolunteerProfileInput) =>
      apiClient.updateMyVolunteerProfile(accessToken as string, input),
    onSuccess: () => {
      setSaved(true);
      void queryClient.invalidateQueries({ queryKey: ["volunteer", "me"] });
    },
  });

  if (!isVolunteer) return <Spinner label="Verificando tu perfil..." />;

  const needsLicense = profile
    ? requiresProfessionalLicense(profile.declared_profession)
    : false;
  const pendingNotices = profile?.notices.filter((n) => !n.resolved_at) ?? [];
  const errorMessage =
    save.error instanceof ApiError ? save.error.message : undefined;

  return (
    <div className="min-h-screen bg-sand-50">
      <AppHeader
        subtitle="Panel de analista"
        homeHref="/volunteer"
        nav={VOLUNTEER_NAV}
      />

      <main className="mx-auto max-w-lg px-4 py-8">
        <h1 className="mb-1 text-2xl font-semibold tracking-tight text-sand-900">
          Mi perfil
        </h1>
        <p className="mb-6 text-sm text-sand-600">
          Estos datos los ve el equipo que administra la plataforma. Tu nombre
          y tu foto también los ve la persona que acompañas.
        </p>

        {isLoading && <Spinner label="Cargando tu perfil..." />}

        {profile && (
          <div className="flex flex-col gap-4">
            {/* Los avisos van de primero: son lo que hay que corregir. */}
            {pendingNotices.map((notice) => (
              <Card key={notice.id} className="border-amber-300 bg-amber-50">
                <p className="text-sm font-semibold text-amber-900">
                  Aviso del equipo administrador
                </p>
                <p className="mt-1 text-sm text-amber-900">{notice.body}</p>
                <p className="mt-2 text-xs text-amber-700">
                  Corrige tus datos abajo y guarda; el aviso se marcará como
                  atendido.
                </p>
              </Card>
            ))}

            <Card>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${VERIFICATION_COPY[profile.verification_status].tone}`}
                >
                  {VERIFICATION_COPY[profile.verification_status].label}
                </span>
                {!profile.is_active && (
                  <span className="rounded-full bg-sand-200 px-3 py-1 text-xs font-semibold text-sand-700">
                    Cuenta desactivada
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-sand-600">
                {VERIFICATION_COPY[profile.verification_status].help}
              </p>
              {profile.review_notes && (
                <p className="mt-3 rounded-xl bg-sand-100 p-3 text-sm text-sand-700">
                  <span className="font-medium">Nota de la revisión: </span>
                  {profile.review_notes}
                </p>
              )}
            </Card>

            <Card className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-sand-700">
                  Foto de perfil
                </span>
                <div className="flex items-center gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element -- URL remota de Supabase Storage */}
                  <img
                    src={preview ?? photoUrl}
                    alt="Tu foto"
                    className="h-20 w-20 rounded-full border border-sand-200 object-cover"
                  />
                  <label className="flex min-h-12 flex-1 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-sand-300 text-sm text-sand-500 hover:bg-sand-50">
                    {uploadPhoto.isPending ? "Subiendo..." : "Cambiar foto"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setPreview(URL.createObjectURL(file));
                        setSaved(false);
                        uploadPhoto.mutate(
                          { file, context: "volunteer_photo" },
                          { onSuccess: (url) => setPhotoUrl(url) },
                        );
                      }}
                    />
                  </label>
                </div>
                <p className="text-xs text-sand-500">
                  Debe ser una foto real tuya: es lo que ve quien te abre la
                  puerta.
                </p>
              </div>

              <TextInput
                label="Nombre completo"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  setSaved(false);
                }}
              />

              <TextInput
                label="Numero de documento (cedula)"
                value={documentNumber}
                onChange={(e) => {
                  setDocumentNumber(e.target.value);
                  setSaved(false);
                }}
              />

              {needsLicense && (
                <TextInput
                  label="Numero de matricula o tarjeta profesional"
                  hint="Solo lo ve el equipo administrador."
                  value={license}
                  onChange={(e) => {
                    setLicense(e.target.value);
                    setSaved(false);
                  }}
                />
              )}

              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-sand-700">
                  Profesión
                </span>
                <div className="min-h-12 rounded-xl border border-sand-200 bg-sand-50 px-4 py-3 text-base text-sand-700">
                  {PROFESSION_LABELS[profile.declared_profession]}
                </div>
                <p className="text-xs text-sand-500">
                  La profesión no se puede cambiar aquí: de ella depende si
                  necesitas matrícula. Escríbenos si la registraste mal.
                </p>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-sand-700">
                  Teléfono
                </span>
                <div className="min-h-12 rounded-xl border border-sand-200 bg-sand-50 px-4 py-3 text-base text-sand-700">
                  {profile.phone_number}
                </div>
                <p className="text-xs text-sand-500">
                  Es el número con el que inicias sesión.
                </p>
              </div>

              {errorMessage && (
                <p className="text-sm text-red-600">{errorMessage}</p>
              )}
              {saved && !save.isPending && (
                <p className="text-sm text-emerald-700">
                  Guardado. Si cambiaste tus datos, revisaremos el perfil de
                  nuevo.
                </p>
              )}

              <Button
                isLoading={save.isPending}
                disabled={uploadPhoto.isPending}
                onClick={() =>
                  save.mutate({
                    full_name: fullName,
                    id_document_number: documentNumber,
                    professional_license: license || undefined,
                    photo_url: photoUrl,
                  })
                }
              >
                Guardar cambios
              </Button>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
