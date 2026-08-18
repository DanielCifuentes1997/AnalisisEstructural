/*
 * Service Worker: el pedacito de codigo que queda dormido en el
 * dispositivo y despierta cuando llega una notificacion, incluso con la
 * app cerrada. Es intencionalmente minimo: solo muestra el aviso y lleva
 * a la pantalla correcta al tocarlo.
 */

self.addEventListener("install", () => {
  // Sin esto habria que cerrar y abrir la app para que entre una version
  // nueva del worker.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Acompañamiento Comunitario", body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title ?? "Acompañamiento Comunitario", {
      body: payload.body ?? "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      // Agrupa avisos del mismo asunto: diez mensajes de un chat
      // reemplazan el aviso anterior en vez de apilarse.
      tag: payload.tag,
      renotify: Boolean(payload.tag),
      data: { url: payload.url ?? "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url ?? "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        // Si la app ya esta abierta, se reutiliza esa pestaña en vez de
        // abrir una nueva cada vez.
        for (const client of clients) {
          if ("focus" in client) {
            client.navigate(target);
            return client.focus();
          }
        }
        return self.clients.openWindow(target);
      }),
  );
});
