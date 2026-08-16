import { Injectable, InternalServerErrorException, Logger, OnModuleInit } from "@nestjs/common";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const BUCKETS = ["request-photos", "volunteer-photos"] as const;
export type StorageBucket = (typeof BUCKETS)[number];

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
      const { error } = await this.client.storage.createBucket(bucket, {
        public: true,
      });
      if (error && !error.message.includes("already exists")) {
        this.logger.warn(`No se pudo crear el bucket ${bucket}: ${error.message}`);
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

    const { data: publicUrlData } = this.client.storage.from(bucket).getPublicUrl(path);

    return {
      uploadUrl: data.signedUrl,
      path,
      publicUrl: publicUrlData.publicUrl,
    };
  }
}
