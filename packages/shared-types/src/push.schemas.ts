import { z } from "zod";

// Lo que entrega el navegador al suscribirse: una direccion unica y las
// dos llaves con las que se cifra el mensaje para ese dispositivo.
export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({
    p256dh: z.string().min(1).max(500),
    auth: z.string().min(1).max(500),
  }),
});
export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;

export const unsubscribePushSchema = z.object({
  endpoint: z.string().url().max(1000),
});
export type UnsubscribePushInput = z.infer<typeof unsubscribePushSchema>;

// Textos del aviso que pide permiso, distintos segun a quien se le
// muestra: lo que le importa a cada rol no es lo mismo.
export const PUSH_PROMPT_COPY = {
  CITIZEN: {
    title: "Activa las notificaciones",
    body: "Te avisamos apenas un analista tome tu solicitud, cuando te escriba y cuando llegue a tu casa. Sin esto tendrias que estar revisando la app.",
    cta: "Activar notificaciones",
  },
  VOLUNTEER: {
    title: "Activa las notificaciones",
    body: "Te avisamos cuando alguien te escriba, cuando acepten la fecha que propusiste y cuando haya solicitudes nuevas cerca de ti.",
    cta: "Activar notificaciones",
  },
} as const;
