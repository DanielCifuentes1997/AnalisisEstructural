import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders as render } from "../../test/render";
import userEvent from "@testing-library/user-event";
import { ChatPanel } from "./ChatPanel";
import type { Conversation } from "../../lib/types";

const sendMutate = vi.fn();
let conversation: Conversation | undefined;
let isLoading = false;
let isError = false;

vi.mock("../../lib/hooks/use-chat", () => ({
  useConversation: () => ({ data: conversation, isLoading, isError }),
  useSendMessage: () => ({ mutate: sendMutate, isPending: false, error: null }),
  useProposeVisitDate: () => ({ mutate: vi.fn(), isPending: false, error: null }),
  useRespondToProposal: () => ({ mutate: vi.fn(), isPending: false, error: null }),
}));

const message = (over: Partial<Conversation["messages"][0]> = {}) => ({
  id: "m1",
  body: "Buenas tardes",
  sender_role: "VOLUNTEER" as const,
  is_mine: false,
  created_at: new Date().toISOString(),
  read_at: null,
  kind: "TEXT" as const,
  proposed_date: null,
  proposal_status: null,
  can_respond: false,
  ...over,
});

const baseConversation = (over: Partial<Conversation> = {}): Conversation => ({
  visit_id: "visit-1",
  request_state: "ASSIGNED",
  is_closed: false,
  counterpart: { name: "Elena Vargas", photo_url: null },
  scheduled_at: null,
  can_propose_date: true,
  messages: [message()],
  ...over,
});

beforeEach(() => {
  conversation = baseConversation();
  isLoading = false;
  isError = false;
  sendMutate.mockReset();
});

describe("ChatPanel: aviso de seguridad", () => {
  // Es la unica defensa visible contra el estafador, y va siempre fija.
  it("siempre muestra el aviso de no compartir datos ni pagar", () => {
    render(<ChatPanel visitId="visit-1" />);

    expect(screen.getByText(/no compartas datos personales/i)).toBeInTheDocument();
    expect(screen.getByText(/gratuito/i)).toBeInTheDocument();
  });

  it("sigue visible aunque la conversacion este cerrada", () => {
    conversation = baseConversation({ is_closed: true });
    render(<ChatPanel visitId="visit-1" />);

    expect(screen.getByText(/no compartas datos personales/i)).toBeInTheDocument();
  });
});

describe("ChatPanel: mensajes", () => {
  it("muestra con quien esta hablando", () => {
    render(<ChatPanel visitId="visit-1" />);

    expect(screen.getByText("Elena Vargas")).toBeInTheDocument();
  });

  it("pinta los mensajes de la conversacion", () => {
    render(<ChatPanel visitId="visit-1" />);

    expect(screen.getByText("Buenas tardes")).toBeInTheDocument();
  });

  it("invita a escribir cuando no hay nada todavia", () => {
    conversation = baseConversation({ messages: [] });
    render(<ChatPanel visitId="visit-1" />);

    expect(screen.getByText(/Todavía no hay mensajes/i)).toBeInTheDocument();
  });

  it("envia el mensaje escrito", async () => {
    const user = userEvent.setup();
    render(<ChatPanel visitId="visit-1" />);

    await user.type(screen.getByPlaceholderText(/Escribe un mensaje/i), "Voy el viernes");
    await user.click(screen.getByRole("button", { name: "Enviar" }));

    expect(sendMutate).toHaveBeenCalledWith(
      { body: "Voy el viernes" },
      expect.anything(),
    );
  });

  it("no envia mensajes vacios", async () => {
    const user = userEvent.setup();
    render(<ChatPanel visitId="visit-1" />);

    await user.type(screen.getByPlaceholderText(/Escribe un mensaje/i), "   ");

    expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled();
  });
});

describe("ChatPanel: conversacion cerrada", () => {
  it("quita el campo de escribir cuando ya termino", () => {
    conversation = baseConversation({ is_closed: true });
    render(<ChatPanel visitId="visit-1" />);

    expect(screen.getByText(/conversación está cerrada/i)).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText(/Escribe un mensaje/i),
    ).not.toBeInTheDocument();
  });
});

describe("ChatPanel: fecha acordada", () => {
  it("muestra el letrero fijo cuando ya cuadraron", () => {
    conversation = baseConversation({
      scheduled_at: "2026-08-22T14:00:00.000Z",
    });
    render(<ChatPanel visitId="visit-1" />);

    expect(screen.getByText(/Visita acordada/i)).toBeInTheDocument();
  });

  it("no lo muestra si todavia no hay fecha", () => {
    render(<ChatPanel visitId="visit-1" />);

    expect(screen.queryByText(/Visita acordada/i)).not.toBeInTheDocument();
  });

  it("ofrece proponer fecha cuando se puede", () => {
    render(<ChatPanel visitId="visit-1" />);

    expect(screen.getByRole("button", { name: /Proponer fecha/i })).toBeInTheDocument();
  });

  it("no la ofrece cuando ya paso el momento de agendar", () => {
    conversation = baseConversation({ can_propose_date: false });
    render(<ChatPanel visitId="visit-1" />);

    expect(
      screen.queryByRole("button", { name: /Proponer fecha/i }),
    ).not.toBeInTheDocument();
  });
});

describe("ChatPanel: propuestas de fecha", () => {
  it("una propuesta se pinta distinta a un mensaje normal", () => {
    conversation = baseConversation({
      messages: [
        message({
          id: "p1",
          kind: "DATE_PROPOSAL",
          proposed_date: "2026-08-22T14:00:00.000Z",
          proposal_status: "PENDING",
          can_respond: true,
          body: "",
        }),
      ],
    });
    render(<ChatPanel visitId="visit-1" />);

    expect(screen.getByText(/Propuesta de visita/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Me sirve" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "No puedo" })).toBeInTheDocument();
  });

  // Quien propuso no puede aceptarse a si mismo.
  it("no ofrece responder la propuesta propia", () => {
    conversation = baseConversation({
      messages: [
        message({
          id: "p1",
          kind: "DATE_PROPOSAL",
          proposed_date: "2026-08-22T14:00:00.000Z",
          proposal_status: "PENDING",
          can_respond: false,
          is_mine: true,
          body: "",
        }),
      ],
    });
    render(<ChatPanel visitId="visit-1" />);

    expect(screen.queryByRole("button", { name: "Me sirve" })).not.toBeInTheDocument();
    expect(screen.getByText(/Esperando la respuesta/i)).toBeInTheDocument();
  });

  it("una propuesta ya respondida muestra en que quedo", () => {
    conversation = baseConversation({
      messages: [
        message({
          id: "p1",
          kind: "DATE_PROPOSAL",
          proposed_date: "2026-08-22T14:00:00.000Z",
          proposal_status: "DECLINED",
          can_respond: false,
          body: "",
        }),
      ],
    });
    render(<ChatPanel visitId="visit-1" />);

    expect(screen.getByText(/No le sirvio/i)).toBeInTheDocument();
  });
});

describe("ChatPanel: boton de reportar", () => {
  it("el afectado puede reportar al analista", () => {
    render(<ChatPanel visitId="visit-1" canReport />);

    expect(
      screen.getByRole("button", { name: /Reportar el comportamiento/i }),
    ).toBeInTheDocument();
  });

  it("el analista no ve ese boton", () => {
    render(<ChatPanel visitId="visit-1" />);

    expect(
      screen.queryByRole("button", { name: /Reportar el comportamiento/i }),
    ).not.toBeInTheDocument();
  });
});

describe("ChatPanel: estados de carga", () => {
  it("avisa mientras carga", () => {
    isLoading = true;
    conversation = undefined;
    render(<ChatPanel visitId="visit-1" />);

    expect(screen.getByText(/Cargando conversacion/i)).toBeInTheDocument();
  });

  it("avisa si no se pudo cargar", () => {
    isError = true;
    conversation = undefined;
    render(<ChatPanel visitId="visit-1" />);

    expect(screen.getByText(/No pudimos cargar la conversación/i)).toBeInTheDocument();
  });
});
