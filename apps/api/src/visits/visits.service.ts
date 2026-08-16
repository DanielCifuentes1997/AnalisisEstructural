import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RequestStateMachine } from "../workflow/request-state-machine.service";
import { generatePin, hashPin } from "./pin.util";

interface AcceptedRequestRow {
  id: string;
  structural_type: string;
  damages_json: unknown;
  state: string;
  latitude: number;
  longitude: number;
  citizen_phone: string;
}

@Injectable()
export class VisitsService {
  private readonly logger = new Logger(VisitsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stateMachine: RequestStateMachine,
  ) {}

  async acceptRequest(userId: string, requestId: string) {
    const volunteer = await this.prisma.volunteerProfiles.findUnique({
      where: { user_id: userId },
    });

    if (!volunteer) {
      throw new ForbiddenException(
        "Debes registrarte como voluntario antes de aceptar visitas",
      );
    }
    if (!volunteer.is_active) {
      throw new ForbiddenException("Tu perfil de voluntario esta inactivo");
    }

    const request = await this.prisma.propertyRequests.findUnique({
      where: { id: requestId },
    });
    if (!request) {
      throw new NotFoundException("Solicitud no encontrada");
    }

    // Nota: esta verificacion no es atomica frente a dos voluntarios
    // aceptando el mismo caso al mismo tiempo (race condition conocida,
    // pendiente de resolver con un UPDATE condicional o transaccion
    // serializable en una siguiente iteracion).
    this.stateMachine.assertTransition(request.state, "ASSIGNED");

    const pin = generatePin();

    await this.prisma.$transaction([
      this.prisma.visits.create({
        data: {
          request_id: requestId,
          volunteer_id: volunteer.id,
          otp_hash: hashPin(pin),
        },
      }),
      this.prisma.propertyRequests.update({
        where: { id: requestId },
        data: { state: "ASSIGNED" },
      }),
    ]);

    // El voluntario NUNCA debe conocer el PIN de antemano (lo custodia el
    // ciudadano y se lo dicta en persona) - por eso se registra en el log
    // de desarrollo en vez de devolverse en la respuesta de este endpoint.
    // En produccion esto se enviaria por SMS al ciudadano (Seccion 38).
    this.logger.warn(
      `[DEV PIN] Codigo de visita para la solicitud ${requestId}: ${pin} (en produccion se envia por SMS al ciudadano)`,
    );

    const rows = await this.prisma.$queryRaw<AcceptedRequestRow[]>`
      SELECT pr.id, pr.structural_type, pr.damages_json, pr.state,
             ST_Y(pr.geom::geometry) AS latitude,
             ST_X(pr.geom::geometry) AS longitude,
             u.phone_number AS citizen_phone
      FROM "PropertyRequests" pr
      JOIN "Users" u ON u.id = pr.citizen_id
      WHERE pr.id = ${requestId}
    `;

    return rows[0];
  }
}
