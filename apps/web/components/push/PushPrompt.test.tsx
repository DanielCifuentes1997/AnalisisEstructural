import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PushPrompt } from "./PushPrompt";

const subscribe = vi.fn();
let permission = "default";
let isSubscribing = false;
let errorMessage: string | undefined;

vi.mock("../../lib/hooks/use-push-notifications", () => ({
  usePushNotifications: () => ({
    permission,
    isSubscribing,
    errorMessage,
    subscribe,
  }),
}));

beforeEach(() => {
  permission = "default";
  isSubscribing = false;
  errorMessage = undefined;
  subscribe.mockReset().mockResolvedValue(true);
});

describe("PushPrompt: a quien se le muestra y que dice", () => {
  it("al afectado le habla de su solicitud", async () => {
    render(<PushPrompt role="CITIZEN" />);

    await screen.findByText(/Activa las notificaciones/i);
    expect(screen.getByText(/tome tu solicitud/i)).toBeInTheDocument();
  });

  it("al analista le habla de casos y mensajes", async () => {
    render(<PushPrompt role="VOLUNTEER" />);

    await screen.findByText(/Activa las notificaciones/i);
    expect(screen.getByText(/solicitudes nuevas cerca de ti/i)).toBeInTheDocument();
  });

  // Si ya las tiene, volver a pedirlas es ruido.
  it("no aparece si ya dio permiso", () => {
    permission = "granted";
    const { container } = render(<PushPrompt role="CITIZEN" />);

    expect(container).toBeEmptyDOMElement();
  });

  it("no aparece si el navegador no las soporta", () => {
    permission = "unsupported";
    const { container } = render(<PushPrompt role="CITIZEN" />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe("PushPrompt: activar", () => {
  it("al aceptar confirma que quedaron activas", async () => {
    const user = userEvent.setup();
    render(<PushPrompt role="CITIZEN" />);

    await user.click(await screen.findByRole("button", { name: /Activar/i }));

    expect(subscribe).toHaveBeenCalled();
    await screen.findByText(/te vamos a avisar/i);
    expect(screen.getByText(/Puedes cerrar la app/i)).toBeInTheDocument();
  });

  it("si falla, se queda y muestra el error", async () => {
    subscribe.mockResolvedValue(false);
    errorMessage = "No pudimos activar las notificaciones";
    const user = userEvent.setup();
    render(<PushPrompt role="CITIZEN" />);

    await user.click(await screen.findByRole("button", { name: /Activar/i }));

    expect(screen.getByText(/No pudimos activar/i)).toBeInTheDocument();
    expect(screen.queryByText(/te vamos a avisar/i)).not.toBeInTheDocument();
  });
});

describe("PushPrompt: posponer", () => {
  // El navegador solo deja preguntar de verdad una vez: "Ahora no" tiene
  // que esconder el aviso SIN gastar el permiso.
  it("'Ahora no' lo esconde y no pide permiso", async () => {
    const user = userEvent.setup();
    render(<PushPrompt role="CITIZEN" />);

    await user.click(await screen.findByRole("button", { name: /Ahora no/i }));

    expect(subscribe).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.queryByText(/Activa las notificaciones/i)).not.toBeInTheDocument(),
    );
  });

  it("una vez pospuesto, no vuelve a salir", async () => {
    window.localStorage.setItem("push-prompt-dismissed", "true");
    render(<PushPrompt role="CITIZEN" />);

    await waitFor(() =>
      expect(screen.queryByText(/Activa las notificaciones/i)).not.toBeInTheDocument(),
    );
  });
});

describe("PushPrompt: permiso bloqueado", () => {
  it("explica que hay que cambiarlo en el navegador", async () => {
    permission = "denied";
    render(<PushPrompt role="CITIZEN" />);

    await screen.findByText(/notificaciones bloqueadas/i);
    expect(screen.getByText(/configuración de tu navegador/i)).toBeInTheDocument();
    // No tiene sentido ofrecer un boton que no puede funcionar.
    expect(screen.queryByRole("button", { name: /Activar/i })).not.toBeInTheDocument();
  });
});
