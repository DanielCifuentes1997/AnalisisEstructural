import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  check() {
    return { status: "ok", timestamp: new Date().toISOString() };
  }

  @Get("db")
  async checkDb() {
    const userCount = await this.prisma.users.count();
    return { status: "ok", userCount };
  }
}
