import { randomUUID } from "node:crypto";
import { Injectable, InternalServerErrorException } from "@nestjs/common";
import type { CreatePropertyRequestInput } from "@proyecto/shared-types";
import { PrismaService } from "../prisma/prisma.service";

interface PropertyRequestRow {
  id: string;
  citizen_id: string;
  structural_type: string;
  damages_json: unknown;
  priority_score: number;
  state: string;
  created_at: Date;
  updated_at: Date;
  latitude: number;
  longitude: number;
}

@Injectable()
export class RequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(citizenId: string, input: CreatePropertyRequestInput) {
    const id = randomUUID();
    const { latitude, longitude } = input.location;

    // Prisma no puede escribir el tipo geography(Point) via su query
    // builder normal (queda como "Unsupported" en el schema), asi que
    // insertamos con SQL crudo. photo_urls no tiene columna propia todavia,
    // se guarda dentro del JSONB flexible de damages_json.
    const damagesJsonWithPhotos = {
      ...input.damages_json,
      photo_urls: input.photo_urls,
    };

    const rows = await this.prisma.$queryRaw<PropertyRequestRow[]>`
      INSERT INTO "PropertyRequests"
        (id, citizen_id, geom, structural_type, damages_json, state, created_at, updated_at)
      VALUES (
        ${id},
        ${citizenId},
        ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
        ${input.structural_type},
        ${JSON.stringify(damagesJsonWithPhotos)}::jsonb,
        'REQUESTED',
        now(),
        now()
      )
      RETURNING
        id, citizen_id, structural_type, damages_json, priority_score, state,
        created_at, updated_at,
        ST_Y(geom::geometry) AS latitude,
        ST_X(geom::geometry) AS longitude;
    `;

    const row = rows[0];
    if (!row) {
      throw new InternalServerErrorException("No se pudo crear la solicitud");
    }

    return row;
  }

  findAllForCitizen(citizenId: string) {
    return this.prisma.propertyRequests.findMany({
      where: { citizen_id: citizenId },
      orderBy: { created_at: "desc" },
    });
  }
}
