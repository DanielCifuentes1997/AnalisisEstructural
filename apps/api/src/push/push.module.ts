import { Global, Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PushController } from "./push.controller";
import { PushService } from "./push.service";

// Global: los avisos los disparan visitas, chat y solicitudes.
@Global()
@Module({
  imports: [AuthModule],
  controllers: [PushController],
  providers: [PushService],
  exports: [PushService],
})
export class PushModule {}
