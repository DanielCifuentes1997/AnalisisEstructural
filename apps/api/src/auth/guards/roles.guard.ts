import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Role } from "@proyecto/shared-types";
import { ROLES_KEY } from "../decorators/roles.decorator";
import type { AuthenticatedRequest } from "./jwt-auth.guard";

/**
 * Se ejecuta despues de JwtAuthGuard: asume que request.user ya existe.
 * Si el endpoint no lleva @Roles(), no restringe nada (deja pasar a
 * cualquier usuario autenticado).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const hasRole = requiredRoles.includes(request.user.role);

    if (!hasRole) {
      throw new ForbiddenException(
        "No tienes permisos para acceder a este recurso",
      );
    }

    return true;
  }
}
