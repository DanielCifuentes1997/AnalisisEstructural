"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient } from "../api-client";
import { useAuthStore } from "../auth-store";

export type PushPermission = "default" | "granted" | "denied" | "unsupported";

/**
 * Convierte la llave VAPID (base64 url-safe) al formato de bytes que
 * espera el navegador. Es el unico paso "raro" de toda la suscripcion.
 */
export function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  // Se construye sobre un ArrayBuffer explicito: applicationServerKey no
  // acepta un Uint8Array que pudiera venir de un SharedArrayBuffer.
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function usePushNotifications() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [permission, setPermission] = useState<PushPermission>("default");
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();

  useEffect(() => {
    if (!isPushSupported()) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission as PushPermission);
  }, []);

  const subscribe = useCallback(async () => {
    if (!isPushSupported() || !accessToken) return false;

    setIsSubscribing(true);
    setErrorMessage(undefined);

    try {
      const granted = await Notification.requestPermission();
      setPermission(granted as PushPermission);
      if (granted !== "granted") return false;

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const { publicKey } = await apiClient.getPushPublicKey();
      if (!publicKey) {
        setErrorMessage("El servidor no tiene las notificaciones configuradas");
        return false;
      }

      // Si ya habia una suscripcion se reutiliza: pedir otra crearia un
      // buzon distinto y llegarian avisos duplicados.
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));

      const json = subscription.toJSON();
      await apiClient.subscribeToPush(accessToken, {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: json.keys?.p256dh ?? "",
          auth: json.keys?.auth ?? "",
        },
      });

      return true;
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "No pudimos activar las notificaciones",
      );
      return false;
    } finally {
      setIsSubscribing(false);
    }
  }, [accessToken]);

  return { permission, isSubscribing, errorMessage, subscribe };
}
