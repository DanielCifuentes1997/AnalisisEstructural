import { Injectable, Logger } from "@nestjs/common";
import type { AuditAction } from "@proyecto/shared-types";
import { PrismaService } from "../prisma/prisma.service";

interface AuditEntry {
  actorId: string;
  action: AuditAction;
  resourceId: string;
  priorState?: string | null;
  newState?: string | null;
  notes?: string | null;
  ipAddress?: string | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Deja constancia de una accion administrativa. Nunca lanza: si la
   * bitacora falla no queremos tumbar la operacion que el admin acaba de
   * hacer (ya quedo aplicada), pero si dejar ruido en los logs para que
   * se note que se perdio un registro.
   */
  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLogs.create({
        data: {
          actor_id: entry.actorId,
          action: entry.action,
          resource_id: entry.resourceId,
          prior_state: entry.priorState ?? null,
          new_state: entry.newState ?? null,
          notes: entry.notes ?? null,
          ip_address: entry.ipAddress ?? null,
        },
      });
    } catch (err) {
      this.logger.error(
        `No se pudo registrar en la bitacora: ${entry.action} sobre ${entry.resourceId}`,
        err instanceof Error ? err.stack : undefined,
      );
    }
  }

  list(limit = 100) {
    return this.prisma.auditLogs.findMany({
      orderBy: { timestamp: "desc" },
      take: limit,
    });
  }
}
