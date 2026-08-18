import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  AddressStep,
  buildAddressComplement,
  type AddressValue,
} from "./AddressStep";

// El mapa real necesita WebGL y el token de Mapbox; aqui solo importa
// que el paso pida los campos correctos segun el tipo de vivienda.
vi.mock("./AddressMapPicker", () => ({
  AddressMapPicker: () => <div data-testid="mapa" />,
}));

vi.mock("../../../lib/geocoding", () => ({
  geocodeAddress: vi.fn().mockResolvedValue({
    latitude: 4.5339,
    longitude: -75.6811,
  }),
}));

const emptyAddress: AddressValue = {
  street: "",
  city: "",
  department: "",
  complement: "",
  tower: "",
  apartment: "",
  latitude: null,
  longitude: null,
};

const located: AddressValue = {
  ...emptyAddress,
  street: "Carrera 14 #20-30",
  city: "Armenia",
  department: "Quindio",
  latitude: 4.5339,
  longitude: -75.6811,
};

describe("AddressStep: campos segun el tipo de vivienda", () => {
  const noop = () => undefined;

  it("una casa pide un complemento libre y opcional", () => {
    render(
      <AddressStep
        value={emptyAddress}
        housingType="CASA"
        onChange={noop}
        onNext={noop}
        onBack={noop}
      />,
    );

    expect(screen.getByLabelText(/complemento/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^apartamento$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/torre o bloque/i)).not.toBeInTheDocument();
  });

  it("un apartamento pide torre y numero de apto", () => {
    render(
      <AddressStep
        value={emptyAddress}
        housingType="APARTAMENTO"
        onChange={noop}
        onNext={noop}
        onBack={noop}
      />,
    );

    expect(screen.getByLabelText(/torre o bloque/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^apartamento$/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/complemento/i)).not.toBeInTheDocument();
  });
});

describe("AddressStep: cuando deja continuar", () => {
  const noop = () => undefined;

  it("no deja avanzar sin haber marcado un punto en el mapa", () => {
    render(
      <AddressStep
        value={emptyAddress}
        housingType="CASA"
        onChange={noop}
        onNext={noop}
        onBack={noop}
      />,
    );

    expect(screen.getByRole("button", { name: "Continuar" })).toBeDisabled();
  });

  it("una casa con punto ya puede continuar, sin complemento", () => {
    render(
      <AddressStep
        value={located}
        housingType="CASA"
        onChange={noop}
        onNext={noop}
        onBack={noop}
      />,
    );

    expect(screen.getByRole("button", { name: "Continuar" })).toBeEnabled();
  });

  // Sin el numero de apto el analista llega a la porteria y no sabe a
  // que puerta tocar.
  it("un apartamento con punto pero sin apto NO puede continuar", () => {
    render(
      <AddressStep
        value={located}
        housingType="APARTAMENTO"
        onChange={noop}
        onNext={noop}
        onBack={noop}
      />,
    );

    expect(screen.getByRole("button", { name: "Continuar" })).toBeDisabled();
  });

  it("con el apto lleno ya deja continuar", () => {
    render(
      <AddressStep
        value={{ ...located, apartment: "502" }}
        housingType="APARTAMENTO"
        onChange={noop}
        onNext={noop}
        onBack={noop}
      />,
    );

    expect(screen.getByRole("button", { name: "Continuar" })).toBeEnabled();
  });

  it("la torre sola no basta", () => {
    render(
      <AddressStep
        value={{ ...located, tower: "4" }}
        housingType="APARTAMENTO"
        onChange={noop}
        onNext={noop}
        onBack={noop}
      />,
    );

    expect(screen.getByRole("button", { name: "Continuar" })).toBeDisabled();
  });
});

describe("AddressStep: escribir avisa al formulario", () => {
  it("cada tecla propaga el cambio hacia arriba", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(
      <AddressStep
        value={emptyAddress}
        housingType="CASA"
        onChange={onChange}
        onNext={() => undefined}
        onBack={() => undefined}
      />,
    );

    await user.type(screen.getByLabelText(/ciudad/i), "A");

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ city: "A" }),
    );
  });
});

describe("buildAddressComplement", () => {
  const base = { ...emptyAddress };

  it("compone torre y apartamento en una linea legible", () => {
    expect(
      buildAddressComplement(
        { ...base, tower: "4", apartment: "502" },
        "APARTAMENTO",
      ),
    ).toBe("Torre/Bloque 4, Apto 502");
  });

  it("omite la torre si no la escribieron", () => {
    expect(
      buildAddressComplement({ ...base, apartment: "502" }, "APARTAMENTO"),
    ).toBe("Apto 502");
  });

  it("en una casa usa el texto libre", () => {
    expect(
      buildAddressComplement(
        { ...base, complement: "Conjunto Los Cerros, casa 12" },
        "CASA",
      ),
    ).toBe("Conjunto Los Cerros, casa 12");
  });

  it("ignora los campos de apartamento cuando es casa", () => {
    expect(
      buildAddressComplement(
        { ...base, tower: "4", apartment: "502", complement: "" },
        "CASA",
      ),
    ).toBe("");
  });

  it("recorta espacios sobrantes", () => {
    expect(
      buildAddressComplement({ ...base, complement: "  Casa 3  " }, "CASA"),
    ).toBe("Casa 3");
  });
});
