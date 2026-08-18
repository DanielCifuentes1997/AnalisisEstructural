import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Prisma } from "@proyecto/database";
import type {
  RegisterVolunteerInput,
  UpdateVolunteerProfileInput,
} from "@proyecto/shared-types";
import { requiresProfessionalLicense } from "@proyecto/shared-types";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import type { AccessTokenPayload } from "../auth/types/jwt-payload.interface";

@Injectable()
export class VolunteersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly audit: AuditService,
    private readonly storage: StorageService,
  ) {}

  /** Perfil propio del analista, con los avisos que el admin le dejo. */
  async getMyProfile(userId: string) {
    const profile = await this.prisma.volunteerProfiles.findUnique({
      where: { user_id: userId },
      include: {
        admin_notices: { orderBy: { created_at: "desc" } },
        user: true,
      },
    });
    if (!profile) {
      throw new NotFoundException("Todavia no tienes perfil de analista");
    }

    return {
      id: profile.id,
      full_name: profile.full_name,
      id_document_number: profile.id_document_number,
      declared_profession: profile.declared_profession,
      professional_license: profile.professional_license,
      photo_url: await this.storage.resolveVolunteerPhotoUrl(profile.photo_url),
      phone_number: profile.user.phone_number,
      verification_status: profile.verification_status,
      is_active: profile.is_active,
      // Motivo del rechazo y avisos: el analista tiene que poder ver
      // que le piden corregir, si no el bloqueo lo tomaria por sorpresa.
      review_notes: profile.review_notes,
      notices: profile.admin_notices.map((n) => ({
        id: n.id,
        body: n.body,
        created_at: n.created_at,
        resolved_at: n.resolved_at,
      })),
    };
  }

  /**
   * El analista corrige sus propios datos. Cambiar la foto, el documento
   * o la matricula vuelve el perfil a PENDING: lo que el admin ya habia
   * verificado dejo de ser lo que esta publicado.
   */
  async updateMyProfile(userId: string, input: UpdateVolunteerProfileInput) {
    const profile = await this.prisma.volunteerProfiles.findUnique({
      where: { user_id: userId },
    });
    if (!profile) {
      throw new NotFoundException("Todavia no tienes perfil de analista");
    }

    const license = input.professional_license?.trim() || null;
    if (requiresProfessionalLicense(profile.declared_profession) && !license) {
      throw new BadRequestException(
        "Tu profesion requiere numero de matricula profesional",
      );
    }

    const changedIdentity =
      profile.full_name !== input.full_name ||
      profile.id_document_number !== input.id_document_number ||
      profile.professional_license !== license ||
      profile.photo_url !== input.photo_url;

    const mustReverify =
      changedIdentity && profile.verification_status === "VERIFIED";

    try {
      const updated = await this.prisma.volunteerProfiles.update({
        where: { user_id: userId },
        data: {
          full_name: input.full_name,
          id_document_number: input.id_document_number,
          professional_license: license,
          photo_url: input.photo_url,
          ...(mustReverify && {
            verification_status: "PENDING",
            verified_at: null,
          }),
          // Los avisos del admin se dan por atendidos al editar.
          admin_notices: {
            updateMany: {
              where: { resolved_at: null },
              data: { resolved_at: new Date() },
            },
          },
        },
      });

      if (changedIdentity) {
        await this.audit.record({
          actorId: userId,
          action: "VOLUNTEER_PROFILE_UPDATED",
          resourceId: profile.id,
          priorState: profile.verification_status,
          newState: updated.verification_status,
        });
      }

      return updated;
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        throw new ConflictException("Ese numero de documento ya esta registrado");
      }
      throw err;
    }
  }

  async register(userId: string, input: RegisterVolunteerInput) {
    const existing = await this.prisma.volunteerProfiles.findUnique({
      where: { user_id: userId },
    });

    if (existing) {
      throw new ConflictException(
        "Ya tienes un perfil de voluntario registrado",
      );
    }

    const profile = await this.createProfile(userId, input);

    const accessPayload: AccessTokenPayload = {
      sub: userId,
      role: "VOLUNTEER",
    };
    const accessToken = await this.jwtService.signAsync(accessPayload, {
      expiresIn: "24h",
    });

    return { profile, accessToken };
  }

  private async createProfile(
    userId: string,
    input: RegisterVolunteerInput,
  ) {
    try {
      const [profile] = await this.prisma.$transaction([
        this.prisma.volunteerProfiles.create({
          data: {
            user_id: userId,
            full_name: input.full_name,
            id_document_number: input.id_document_number,
            declared_profession: input.declared_profession,
            // Los oficios sin matricula mandan el campo vacio; se guarda
            // null en vez de "" para que el admin distinga "no aplica"
            // de "aplica pero esta en blanco".
            professional_license: input.professional_license?.trim() || null,
            photo_url: input.photo_url,
          },
        }),
        this.prisma.users.update({
          where: { id: userId },
          data: { role: "VOLUNTEER" },
        }),
      ]);
      return profile;
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        throw new ConflictException(
          "Ese numero de documento ya esta registrado",
        );
      }
      throw err;
    }
  }
}
