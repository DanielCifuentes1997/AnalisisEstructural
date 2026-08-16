"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { HousingType } from "@proyecto/shared-types";
import { createPropertyRequestSchema } from "@proyecto/shared-types";
import { Card } from "../../../../components/ui/Card";
import {
  AddressStep,
  type AddressValue,
} from "../../../../components/requests/wizard/AddressStep";
import {
  DamagesStep,
  type DamagesValue,
} from "../../../../components/requests/wizard/DamagesStep";
import { HousingTypeStep } from "../../../../components/requests/wizard/HousingTypeStep";
import { PhotosStep } from "../../../../components/requests/wizard/PhotosStep";
import { ReporterStep } from "../../../../components/requests/wizard/ReporterStep";
import { ReviewStep } from "../../../../components/requests/wizard/ReviewStep";
import { ApiError } from "../../../../lib/api-client";
import { useCreateRequest } from "../../../../lib/hooks/use-requests";

const STEP_TITLES = [
  "Direccion",
  "Tipo de vivienda",
  "Tus datos",
  "Daños",
  "Fotos",
  "Revisar y enviar",
];

export default function NewRequestPage() {
  const router = useRouter();
  const createRequest = useCreateRequest();

  const [step, setStep] = useState(0);
  const [address, setAddress] = useState<AddressValue>({
    street: "",
    city: "",
    department: "",
    latitude: null,
    longitude: null,
  });
  const [housingType, setHousingType] = useState<HousingType | null>(null);
  const [reporterName, setReporterName] = useState("");
  const [damages, setDamages] = useState<DamagesValue>({
    selected: [],
    otros_detalle: "",
    description: "",
  });
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState<string>();

  const goNext = () => setStep((s) => Math.min(s + 1, STEP_TITLES.length - 1));
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = () => {
    if (address.latitude === null || address.longitude === null || !housingType) return;

    const input = {
      location: { latitude: address.latitude, longitude: address.longitude },
      address_text: [address.street, address.city, address.department]
        .filter(Boolean)
        .join(", "),
      reporter_name: reporterName,
      housing_type: housingType,
      damages_json: {
        selected: damages.selected,
        otros_detalle: damages.otros_detalle || undefined,
        description: damages.description,
      },
      photo_urls: photoUrls,
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
          <AddressStep value={address} onChange={setAddress} onNext={goNext} />
        )}
        {step === 1 && (
          <HousingTypeStep
            value={housingType}
            onChange={setHousingType}
            onNext={goNext}
            onBack={goBack}
          />
        )}
        {step === 2 && (
          <ReporterStep
            value={reporterName}
            onChange={setReporterName}
            onNext={goNext}
            onBack={goBack}
          />
        )}
        {step === 3 && (
          <DamagesStep value={damages} onChange={setDamages} onNext={goNext} onBack={goBack} />
        )}
        {step === 4 && (
          <PhotosStep
            photoUrls={photoUrls}
            onChange={setPhotoUrls}
            onNext={goNext}
            onBack={goBack}
          />
        )}
        {step === 5 && (
          <ReviewStep
            address={address}
            reporterName={reporterName}
            housingType={housingType}
            damages={damages}
            photoUrls={photoUrls}
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
