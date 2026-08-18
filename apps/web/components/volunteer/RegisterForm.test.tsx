import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders as render } from "../../test/render";
import { RegisterForm } from "./RegisterForm";

const uploadMutate = vi.fn();

vi.mock("../../lib/hooks/use-upload", () => ({
  useUploadPhoto: () => ({ mutate: uploadMutate, isPending: false }),
}));

beforeEach(() => {
  uploadMutate.mockReset();
  // La subida responde con la ruta dentro del bucket privado.
  uploadMutate.mockImplementation((_input, opts) =>
    opts?.onSuccess?.("volunteer_photo/abc/perfil.png"),
  );
});

const LICENSE_LABEL = /matricula o tarjeta profesional/i;

const setup = () => {
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  render(<RegisterForm onSubmit={onSubmit} isLoading={false} />);
  return { onSubmit, user };
};

describe("RegisterForm: la matricula depende de la profesion", () => {
  it("sin profesion elegida no la pide", () => {
    setup();

    expect(screen.queryByLabelText(LICENSE_LABEL)).not.toBeInTheDocument();
  });

  it.each([
    "ARQUITECTO",
    "INGENIERO_CIVIL",
    "INGENIERO_CIVIL_ESTRUCTURAS",
    "INGENIERO_GEOTECNISTA",
  ])("%s la pide", async (profession) => {
    const { user } = setup();

    await user.selectOptions(screen.getByRole("combobox"), profession);

    expect(screen.getByLabelText(LICENSE_LABEL)).toBeInTheDocument();
  });

  it.each(["CONSTRUCTOR", "MAESTRO_DE_OBRA", "TECNICO_CONSTRUCCION", "OTRO"])(
    "%s no la pide",
    async (profession) => {
      const { user } = setup();

      await user.selectOptions(screen.getByRole("combobox"), profession);

      expect(screen.queryByLabelText(LICENSE_LABEL)).not.toBeInTheDocument();
    },
  );

  // Si no se limpiara, se enviaria una matricula de una profesion que ya
  // no corresponde.
  it("al cambiar a un oficio sin matricula, el campo desaparece", async () => {
    const { user } = setup();

    await user.selectOptions(screen.getByRole("combobox"), "ARQUITECTO");
    await user.type(screen.getByLabelText(LICENSE_LABEL), "COPNIA-123");
    await user.selectOptions(screen.getByRole("combobox"), "MAESTRO_DE_OBRA");

    expect(screen.queryByLabelText(LICENSE_LABEL)).not.toBeInTheDocument();
  });
});

describe("RegisterForm: la matricula es privada", () => {
  it("avisa que solo la ve el equipo administrador", async () => {
    const { user } = setup();

    await user.selectOptions(screen.getByRole("combobox"), "INGENIERO_CIVIL");

    expect(screen.getByText(/Solo lo ve el equipo/i)).toBeInTheDocument();
    expect(screen.getByText(/Nunca se le muestra a la persona/i)).toBeInTheDocument();
  });
});

describe("RegisterForm: validacion antes de enviar", () => {
  const fillBasics = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.type(screen.getByLabelText(/Nombre completo/i), "Elena Vargas");
    await user.type(screen.getByLabelText(/Numero de documento/i), "1094563882");
    await user.upload(
      screen.getByLabelText(/Foto de perfil/i),
      new File(["x"], "perfil.png", { type: "image/png" }),
    );
  };

  it("un arquitecto sin matricula no puede registrarse", async () => {
    const { onSubmit, user } = setup();

    await fillBasics(user);
    await user.selectOptions(screen.getByRole("combobox"), "ARQUITECTO");
    await user.click(screen.getByRole("button", { name: /Registrarme/i }));

    expect(onSubmit).not.toHaveBeenCalled();
    // El mensaje de error, no la etiqueta del campo.
    expect(
      screen.getByText(/Escribe tu numero de matricula/i),
    ).toBeInTheDocument();
  });

  it("un maestro de obra sin matricula si puede", async () => {
    const { onSubmit, user } = setup();

    await fillBasics(user);
    await user.selectOptions(screen.getByRole("combobox"), "MAESTRO_DE_OBRA");
    await user.click(screen.getByRole("button", { name: /Registrarme/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        full_name: "Elena Vargas",
        declared_profession: "MAESTRO_DE_OBRA",
        photo_url: "volunteer_photo/abc/perfil.png",
      }),
    );
  });

  it("un ingeniero con matricula si puede", async () => {
    const { onSubmit, user } = setup();

    await fillBasics(user);
    await user.selectOptions(screen.getByRole("combobox"), "INGENIERO_CIVIL");
    await user.type(screen.getByLabelText(LICENSE_LABEL), "COPNIA-2024-123");
    await user.click(screen.getByRole("button", { name: /Registrarme/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ professional_license: "COPNIA-2024-123" }),
    );
  });

  it("sin nombre no deja enviar", async () => {
    const { onSubmit, user } = setup();

    await user.type(screen.getByLabelText(/Numero de documento/i), "1094563882");
    await user.selectOptions(screen.getByRole("combobox"), "CONSTRUCTOR");
    await user.click(screen.getByRole("button", { name: /Registrarme/i }));

    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe("RegisterForm: expectativas del voluntario", () => {
  it("aclara que no se cruza contra COPNIA ni CPNAA", () => {
    setup();

    expect(screen.getByText(/no cruzamos tu matrícula/i)).toBeInTheDocument();
  });
});
