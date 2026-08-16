import { randomUUID } from "node:crypto";
import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import {
  signedUploadUrlSchema,
  type SignedUploadUrlInput,
} from "@proyecto/shared-types";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import type { AccessTokenPayload } from "../auth/types/jwt-payload.interface";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { StorageService, type StorageBucket } from "./storage.service";

const BUCKET_BY_CONTEXT: Record<SignedUploadUrlInput["context"], StorageBucket> = {
  request_photo: "request-photos",
  volunteer_photo: "volunteer-photos",
};

@Controller("v1/uploads")
@UseGuards(JwtAuthGuard)
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post("signed-url")
  createSignedUploadUrl(
    @CurrentUser() user: AccessTokenPayload,
    @Body(new ZodValidationPipe(signedUploadUrlSchema)) body: SignedUploadUrlInput,
  ) {
    const bucket = BUCKET_BY_CONTEXT[body.context];
    const path = `${body.context}/${user.sub}/${randomUUID()}-${body.filename}`;
    return this.storageService.createSignedUploadUrl(bucket, path);
  }
}
