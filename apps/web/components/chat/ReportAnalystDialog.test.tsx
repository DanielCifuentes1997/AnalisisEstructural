import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders as render } from "../../test/render";
import { ReportAnalystDialog } from "./ReportAnalystDialog";

const reportAbuse = vi.fn();

vi.mock("../../lib/api-client", async () => {
  const actual = await vi.importActual<typeof import("../../lib/api-client")>(
    "../../lib/api-client",
  );
  return {
    ...actual,
    apiClient: { reportAbuse: (...args: unknown[]) => reportAbuse(...args) },
  };
});

vi.mock("../../lib/auth-store", () => ({
  useAuthStore: (selector: (s: { accessToken: string }) => unknown) =>
    selector({ accessToken: "token" }),
}));

beforeEach(() => {
  reportAbuse.mockReset().mockResolvedValue({ id: "rep-1" });
});

const open = async () => {
  const user = userEvent.setup();
  render(<ReportAnalystDialog visitId="visit-1" analystName="Elena Vargas" />);
  await user.click(
    screen.getByRole("button", { name: /Reportar el comportamiento/i }),
  );
  return user;
};

describe("ReportAnalystDialog: que quede claro que NO es reportar la casa", () => {
  it("el boton habla del comportamiento de la persona, no de daños", () => {
    render(<ReportAnalystDialog visitId="visit-1" analystName="Elena Vargas" />);

    const boton = screen.getByRole("button", {
      name: /Reportar el comportamiento de esta persona/i,
    });
    expect(boton).toBeInTheDocument();
    expect(boton.textContent).not.toMatch(/daño|vivienda|casa/i);
  });

  // El riesgo real es que alguien crea que reporta los daños de su casa.
  it("al abrirlo, aclara explicitamente que no sirve para los daños", async () => {
    await open();

    expect(screen.getByText(/No sirve para reportar los daños/i)).toBeInTheDocument();
    expect(screen.getByText(/Reportar a Elena Vargas/i)).toBeInTheDocument();
  });

  it("todos los motivos hablan de la persona", async () => {
    await open();

    expect(screen.getByLabelText(/Me pidió dinero/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/datos personales o bancarios/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/irrespetuosa/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/nunca llegó/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/no es quien dice ser/i)).toBeInTheDocument();
  });
});

describe("ReportAnalystDialog: enviar", () => {
  it("no deja enviar sin elegir motivo", async () => {
    await open();

    expect(screen.getByRole("button", { name: /Enviar reporte/i })).toBeDisabled();
  });

  it("con un motivo elegido ya se puede enviar", async () => {
    const user = await open();

    await user.click(screen.getByLabelText(/Me pidió dinero/i));

    expect(screen.getByRole("button", { name: /Enviar reporte/i })).toBeEnabled();
  });

  // "Otro" sin explicacion no le sirve a nadie para moderar.
  it("el motivo 'Otra cosa' obliga a escribir que paso", async () => {
    const user = await open();

    await user.click(screen.getByLabelText(/Otra cosa/i));

    expect(screen.getByRole("button", { name: /Enviar reporte/i })).toBeDisabled();
    expect(screen.getByPlaceholderText(/obligatorio/i)).toBeInTheDocument();
  });

  it("con la explicacion escrita, 'Otra cosa' ya se puede enviar", async () => {
    const user = await open();

    await user.click(screen.getByLabelText(/Otra cosa/i));
    await user.type(screen.getByPlaceholderText(/obligatorio/i), "Llego borracho");

    expect(screen.getByRole("button", { name: /Enviar reporte/i })).toBeEnabled();
  });

  it("manda el motivo y el detalle al servidor", async () => {
    const user = await open();

    await user.click(screen.getByLabelText(/Me pidió dinero/i));
    await user.type(screen.getByRole("textbox"), "Me pidio consignar 200 mil");
    await user.click(screen.getByRole("button", { name: /Enviar reporte/i }));

    expect(reportAbuse).toHaveBeenCalledWith("token", "visit-1", {
      reason: "PIDIO_DINERO",
      details: "Me pidio consignar 200 mil",
    });
  });

  it("tras enviar, agradece y dice que llamen al 123 si hay riesgo", async () => {
    const user = await open();

    await user.click(screen.getByLabelText(/Me pidió dinero/i));
    await user.click(screen.getByRole("button", { name: /Enviar reporte/i }));

    expect(await screen.findByText(/recibimos tu reporte/i)).toBeInTheDocument();
    expect(screen.getByText(/llama al 123/i)).toBeInTheDocument();
  });
});

describe("ReportAnalystDialog: cancelar", () => {
  it("cerrar no envia nada", async () => {
    const user = await open();

    await user.click(screen.getByRole("button", { name: /Cancelar/i }));

    expect(reportAbuse).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: /Reportar el comportamiento/i }),
    ).toBeInTheDocument();
  });
});
