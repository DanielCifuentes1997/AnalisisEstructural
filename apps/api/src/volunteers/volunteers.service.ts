import { ConflictException, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Prisma } from "@proyecto/database";
import type { RegisterVolunteerInput } from "@proyecto/shared-types";
import { PrismaService } from "../prisma/prisma.service";
import type { AccessTokenPayload } from "../auth/types/jwt-payload.interface";

@Injectable()
export class VolunteersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

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
      expiresIn: "15m",
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
            id_document_number: input.id_document_number,
            declared_profession: input.declared_profession,
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
