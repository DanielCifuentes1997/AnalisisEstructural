import { Injectable, InternalServerErrorException, Logger, OnModuleInit } from "@nestjs/common";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * request-photos es publico: son fotos de daños de una vivienda, sin
 * personas, y el analista necesita verlas antes de aceptar.
 *
 * volunteer-photos es PRIVADO: es la cara de una persona. Solo la ven el
 * propio analista, el admin, y el ciudadano cuyo caso acepto; y siempre
 * a traves de una URL firmada que expira. Nadie puede adivinar la ruta
 * ni compartir un enlace permanente.
 */
const BUCKET_VISIBILITY = {
  "request-photos": true,
  "volunteer-photos": false,
} as const;

const BUCKETS = Object.keys(BUCKET_VISIBILITY) as StorageBucket[];
export type StorageBucket = keyof typeof BUCKET_VISIBILITY;

// Suficiente para ver el perfil sin que el enlace sirva para reenviarlo.
const SIGNED_READ_TTL_SECONDS = 60 * 60;

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: SupabaseClient | null;

  constructor() {
    const url = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceRoleKey) {
      this.logger.warn(
        "SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no configuradas: la subida de fotos no funcionara hasta que se agreguen.",
      );
      this.client = null;
      return;
    }
    this.client = createClient(url, serviceRoleKey);
  }

  async onModuleInit() {
    if (!this.client) return;

    for (const bucket of BUCKETS) {
      const isPublic = BUCKET_VISIBILITY[bucket];
      const { error } = await this.client.storage.createBucket(bucket, {
        public: isPublic,
      });
      if (error && !error.message.includes("already exists")) {
        this.logger.warn(`No se pudo crear el bucket ${bucket}: ${error.message}`);
        continue;
      }
      // Si el bucket ya existia con otra visibilidad hay que corregirla:
      // volunteer-photos nacio publico y debe quedar privado.
      const { error: updateError } = await this.client.storage.updateBucket(
        bucket,
        { public: isPublic },
      );
      if (updateError) {
        this.logger.warn(
          `No se pudo ajustar la visibilidad del bucket ${bucket}: ${updateError.message}`,
        );
      }
    }
  }

  async createSignedUploadUrl(bucket: StorageBucket, path: string) {
    if (!this.client) {
      throw new InternalServerErrorException(
        "La subida de archivos no esta configurada en el servidor",
      );
    }

    const { data, error } = await this.client.storage
      .from(bucket)
      .createSignedUploadUrl(path);

    if (error || !data) {
      throw new InternalServerErrorException(
        `No se pudo generar la URL de subida: ${error?.message ?? "error desconocido"}`,
      );
    }

    // En un bucket privado no hay URL publica: se guarda la ruta y se
    // firma un enlace cada vez que alguien autorizado quiere verla.
    const publicUrl = BUCKET_VISIBILITY[bucket]
      ? this.client.storage.from(bucket).getPublicUrl(path).data.publicUrl
      : path;

    return { uploadUrl: data.signedUrl, path, publicUrl };
  }

  /**
   * Convierte lo guardado en la base en algo que el navegador pueda
   * mostrar. Acepta tanto rutas (lo nuevo) como URLs completas (lo que
   * quedo de cuando el bucket era publico).
   */
  async resolveVolunteerPhotoUrl(stored: string | null): Promise<string | null> {
    if (!stored) return null;
    if (!this.client) return null;

    const path = stored.startsWith("http")
      ? (stored.split("/volunteer-photos/")[1] ?? null)
      : stored;
    if (!path) return null;

    const { data, error } = await this.client.storage
      .from("volunteer-photos")
      .createSignedUrl(path, SIGNED_READ_TTL_SECONDS);

    if (error || !data) {
      this.logger.warn(
        `No se pudo firmar la foto ${path}: ${error?.message ?? "sin datos"}`,
      );
      return null;
    }

    return data.signedUrl;
  }
}
