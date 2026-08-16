"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPropertyRequestSchema } from "@proyecto/shared-types";
import { Card } from "../../../../components/ui/Card";
import {
  DamagesStep,
  type DamagesValue,
} from "../../../../components/requests/wizard/DamagesStep";
import {
  LocationStep,
  type LocationValue,
} from "../../../../components/requests/wizard/LocationStep";
import { PhotosStep } from "../../../../components/requests/wizard/PhotosStep";
import { ReviewStep } from "../../../../components/requests/wizard/ReviewStep";
import { StructuralTypeStep } from "../../../../components/requests/wizard/StructuralTypeStep";
import { ApiError } from "../../../../lib/api-client";
import { useCreateRequest } from "../../../../lib/hooks/use-requests";

const STEP_TITLES = [
  "Ubicacion",
  "Tipo de vivienda",
  "Daños",
  "Fotos",
  "Revisar y enviar",
];

export default function NewRequestPage() {
  const router = useRouter();
  const createRequest = useCreateRequest();

  const [step, setStep] = useState(0);
  const [location, setLocation] = useState<LocationValue>({
    latitude: null,
    longitude: null,
  });
  const [structuralType, setStructuralType] = useState("");
  const [floors, setFloors] = useState<number | null>(null);
  const [damages, setDamages] = useState<DamagesValue>({
    grietas_visibles: false,
    inclinacion: false,
    colapso_parcial: false,
    notas: "",
  });
  const [submitError, setSubmitError] = useState<string>();

  const goNext = () => setStep((s) => Math.min(s + 1, STEP_TITLES.length - 1));
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = () => {
    if (location.latitude === null || location.longitude === null) return;

    const input = {
      location: { latitude: location.latitude, longitude: location.longitude },
      structural_type: structuralType,
      floors: floors ?? 0,
      damages_json: {
        grietas_visibles: damages.grietas_visibles,
        inclinacion: damages.inclinacion,
        colapso_parcial: damages.colapso_parcial,
        notas: damages.notas || undefined,
      },
      photo_urls: [],
    };

    const validation = createPropertyRequestSchema.safeParse(input);
    if (!validation.success) {
      setSubmitError(validation.error.issues[0]?.message ?? "Datos invalidos");
      return;
    }

    setSubmitError(undefined);
    createRequest.mutate(validation.data, {
      onSuccess: (created) => router.push(`/requests/${created.id}`),
      onError: (error) => {
        setSubmitError(
          error instanceof ApiError ? error.message : "No se pudo enviar el reporte",
        );
      },
    });
  };

  return (
    <main className="mx-auto min-h-screen max-w-sm px-4 py-8">
      <button
        onClick={() => router.push("/dashboard")}
        className="mb-4 min-h-12 text-sm text-gray-500 underline"
      >
        ← Cancelar
      </button>

      <h1 className="mb-1 text-xl font-semibold text-gray-900">
        {STEP_TITLES[step]}
      </h1>
      <p className="mb-6 text-sm text-gray-400">
        Paso {step + 1} de {STEP_TITLES.length}
      </p>

      <Card>
        {step === 0 && (
          <LocationStep value={location} onChange={setLocation} onNext={goNext} />
        )}
        {step === 1 && (
          <StructuralTypeStep
            structuralType={structuralType}
            floors={floors}
            onChangeStructuralType={setStructuralType}
            onChangeFloors={setFloors}
            onNext={goNext}
            onBack={goBack}
          />
        )}
        {step === 2 && (
          <DamagesStep value={damages} onChange={setDamages} onNext={goNext} onBack={goBack} />
        )}
        {step === 3 && <PhotosStep onNext={goNext} onBack={goBack} />}
        {step === 4 && (
          <ReviewStep
            location={location}
            structuralType={structuralType}
            floors={floors}
            damages={damages}
            onSubmit={handleSubmit}
            onBack={goBack}
            isSubmitting={createRequest.isPending}
            errorMessage={submitError}
          />
        )}
      </Card>
    </main>
  );
}
