"use client";

import { useState } from "react";
import { useUploadPhoto } from "../../../lib/hooks/use-upload";
import { Button } from "../../ui/Button";

interface PhotoEntry {
  id: string;
  previewUrl: string;
  publicUrl: string | null;
  isUploading: boolean;
  error?: string;
}

interface PhotosStepProps {
  photoUrls: string[];
  onChange: (photoUrls: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}

const MAX_PHOTOS = 20;

export function PhotosStep({ photoUrls, onChange, onNext, onBack }: PhotosStepProps) {
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const uploadPhoto = useUploadPhoto();

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const remaining = MAX_PHOTOS - photos.length;
    const selected = Array.from(files).slice(0, remaining);

    for (const file of selected) {
      const id = crypto.randomUUID();
      const previewUrl = URL.createObjectURL(file);
      setPhotos((prev) => [...prev, { id, previewUrl, publicUrl: null, isUploading: true }]);

      uploadPhoto.mutate(
        { file, context: "request_photo" },
        {
          onSuccess: (publicUrl) => {
            setPhotos((prev) =>
              prev.map((p) => (p.id === id ? { ...p, publicUrl, isUploading: false } : p)),
            );
            onChange([...photoUrls, publicUrl]);
          },
          onError: () => {
            setPhotos((prev) =>
              prev.map((p) =>
                p.id === id
                  ? { ...p, isUploading: false, error: "No se pudo subir" }
                  : p,
              ),
            );
          },
        },
      );
    }
  };

  const removePhoto = (id: string) => {
    const removed = photos.find((p) => p.id === id);
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    if (removed?.publicUrl) {
      onChange(photoUrls.filter((url) => url !== removed.publicUrl));
    }
  };

  const isAnyUploading = photos.some((p) => p.isUploading);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-sand-600">
        Sube fotos del daño (opcional, hasta {MAX_PHOTOS}).
      </p>

      <label className="flex min-h-24 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-sand-300 text-sm text-sand-500 hover:bg-sand-50">
        Toca para elegir fotos
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          disabled={photos.length >= MAX_PHOTOS}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo) => (
            <div key={photo.id} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- blob: URL de vista previa local */}
              <img
                src={photo.previewUrl}
                alt="Foto del daño"
                className="h-24 w-full rounded-lg object-cover"
              />
              {photo.isUploading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40 text-xs text-white">
                  Subiendo...
                </div>
              )}
              {photo.error && (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-red-600/70 text-xs text-white">
                  Error
                </div>
              )}
              <button
                type="button"
                onClick={() => removePhoto(photo.id)}
                className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-sand-900 text-xs text-white"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <Button type="button" variant="secondary" onClick={onBack}>
          Atras
        </Button>
        <Button type="button" onClick={onNext} disabled={isAnyUploading}>
          Continuar
        </Button>
      </div>
    </div>
  );
}
