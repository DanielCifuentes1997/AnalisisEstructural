import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import webpush from "web-push";
import type { PushSubscriptionInput } from "@proyecto/shared-types";
import { PrismaService } from "../prisma/prisma.service";

export interface PushPayload {
  title: string;
  body: string;
  /** Ruta dentro de la app a la que lleva el aviso al tocarlo. */
  url: string;
  /**
   * Agrupa avisos del mismo asunto: un tag repetido reemplaza al
   * anterior en vez de apilar diez notificaciones del mismo chat.
   */
  tag?: string;
}

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private isConfigured = false;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT;

    if (!publicKey || !privateKey || !subject) {
      this.logger.warn(
        "Llaves VAPID ausentes: las notificaciones push quedan desactivadas.",
      );
      return;
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);
    this.isConfigured = true;
  }

  getPublicKey() {
    return { publicKey: process.env.VAPID_PUBLIC_KEY ?? null };
  }

  /**
   * Guarda el buzon de un dispositivo. Si el mismo endpoint vuelve (por
   * ejemplo tras reinstalar), se reasigna al usuario actual en vez de
   * fallar por la restriccion unica.
   */
  async subscribe(userId: string, input: PushSubscriptionInput) {
    return this.prisma.pushSubscriptions.upsert({
      where: { endpoint: input.endpoint },
      update: {
        user_id: userId,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        failed_at: null,
      },
      create: {
        user_id: userId,
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
      },
    });
  }

  async unsubscribe(userId: string, endpoint: string) {
    await this.prisma.pushSubscriptions.deleteMany({
      where: { user_id: userId, endpoint },
    });
    return { message: "Ya no recibiras notificaciones en este dispositivo" };
  }

  /**
   * Envia un aviso a todos los dispositivos de una persona. Nunca lanza:
   * que una notificacion falle no puede tumbar la operacion que la
   * origino (aceptar un caso, mandar un mensaje).
   */
  async sendToUser(userId: string, payload: PushPayload): Promise<number> {
    if (!this.isConfigured) return 0;

    const subscriptions = await this.prisma.pushSubscriptions.findMany({
      where: { user_id: userId, failed_at: null },
    });
    if (subscriptions.length === 0) return 0;

    let delivered = 0;
    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload),
        );
        delivered++;
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        // 404/410 = el navegador desecho ese buzon (desinstalaron la
        // app, limpiaron datos). Se marca para dejar de intentarlo.
        if (statusCode === 404 || statusCode === 410) {
          await this.prisma.pushSubscriptions.update({
            where: { id: sub.id },
            data: { failed_at: new Date() },
          });
        } else {
          this.logger.warn(
            `No se pudo entregar la notificacion a ${sub.id}: ${String(err)}`,
          );
        }
      }
    }

    return delivered;
  }
}
