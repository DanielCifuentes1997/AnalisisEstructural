"use client";

import { useState } from "react";
import { registerVolunteerSchema, type RegisterVolunteerInput } from "@proyecto/shared-types";
import { useUploadPhoto } from "../../lib/hooks/use-upload";
import { PROFESSION_LABELS } from "../../lib/profession-labels";
import { Button } from "../ui/Button";
import { TextInput } from "../ui/TextInput";

interface RegisterFormProps {
  onSubmit: (input: RegisterVolunteerInput) => void;
  isLoading: boolean;
  errorMessage?: string;
}

export function RegisterForm({ onSubmit, isLoading, errorMessage }: RegisterFormProps) {
  const [fullName, setFullName] = useState("");
  const [idDocumentNumber, setIdDocumentNumber] = useState("");
  const [declaredProfession, setDeclaredProfession] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string>();

  const uploadPhoto = useUploadPhoto();

  const handlePhotoChange = (file: File | undefined) => {
    if (!file) return;
    setPhotoPreview(URL.createObjectURL(file));
    setPhotoUrl(null);
    uploadPhoto.mutate(
      { file, context: "volunteer_photo" },
      { onSuccess: (publicUrl) => setPhotoUrl(publicUrl) },
    );
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const result = registerVolunteerSchema.safeParse({
      full_name: fullName,
      id_document_number: idDocumentNumber,
      declared_profession: declaredProfession,
      photo_url: photoUrl,
    });

    if (!result.success) {
      setValidationError(result.error.issues[0]?.message ?? "Datos invalidos");
      return;
    }

    setValidationError(undefined);
    onSubmit(result.data);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-sand-600">
        No pedimos matricula profesional ni cruce con colegios — esto es
        acompañamiento comunitario informal, no una inspección oficial.
        Cualquier persona con criterio técnico puede ayudar.
      </p>

      <TextInput
        label="Nombre completo"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        autoFocus
      />

      <TextInput
        label="Numero de documento (cedula)"
        value={idDocumentNumber}
        onChange={(e) => setIdDocumentNumber(e.target.value)}
      />

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-sand-700">
          Tu profesion o formacion
        </label>
        <select
          className="min-h-12 rounded-xl border border-sand-300 bg-white px-4 text-base"
          value={declaredProfession}
          onChange={(e) => setDeclaredProfession(e.target.value)}
        >
          <option value="">Selecciona una opcion</option>
          {Object.entries(PROFESSION_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-sand-700">
          Foto de perfil (la vera la persona que ayudes)
        </label>
        <div className="flex items-center gap-4">
          {photoPreview && (
            // eslint-disable-next-line @next/next/no-img-element -- blob: URL de vista previa local
            <img
              src={photoPreview}
              alt="Vista previa"
              className="h-16 w-16 rounded-full object-cover"
            />
          )}
          <label className="flex min-h-12 flex-1 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-sand-300 text-sm text-sand-500 hover:bg-sand-50">
            {uploadPhoto.isPending ? "Subiendo..." : "Elegir foto"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handlePhotoChange(e.target.files?.[0])}
            />
          </label>
        </div>
      </div>

      {(validationError ?? errorMessage) && (
        <p className="text-sm text-red-600">{validationError ?? errorMessage}</p>
      )}

      <Button type="submit" isLoading={isLoading} disabled={uploadPhoto.isPending}>
        Registrarme como voluntario
      </Button>
    </form>
  );
}
