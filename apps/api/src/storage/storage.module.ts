import { Global, Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { StorageController } from "./storage.controller";
import { StorageService } from "./storage.service";

// Global: la firma de las fotos privadas la necesitan requests, chat,
// volunteers y admin.
@Global()
@Module({
  imports: [AuthModule],
  controllers: [StorageController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
