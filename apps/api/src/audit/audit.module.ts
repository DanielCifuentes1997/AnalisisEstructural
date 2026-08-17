import { Global, Module } from "@nestjs/common";
import { AuditService } from "./audit.service";

// Global: la bitacora la usan auth (promocion a admin) y admin, y es
// previsible que mas modulos quieran escribir en ella.
@Global()
@Module({
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
