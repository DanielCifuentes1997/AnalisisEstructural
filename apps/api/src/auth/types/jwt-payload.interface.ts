import type { Role } from "@proyecto/shared-types";

export interface AccessTokenPayload {
  sub: string;
  role: Role;
}

export interface RefreshTokenPayload {
  sub: string;
  type: "refresh";
}
