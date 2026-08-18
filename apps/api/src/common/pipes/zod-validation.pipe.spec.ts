import { BadRequestException } from "@nestjs/common";
import { z } from "zod";
import { ZodValidationPipe } from "./zod-validation.pipe";

const schema = z.object({
  name: z.string().min(3, "Nombre muy corto"),
  age: z.number().int().positive(),
});

describe("ZodValidationPipe", () => {
  const pipe = new ZodValidationPipe(schema);

  it("devuelve los datos ya validados", () => {
    expect(pipe.transform({ name: "Elena", age: 30 })).toEqual({
      name: "Elena",
      age: 30,
    });
  });

  it("rechaza datos invalidos con 400", () => {
    expect(() => pipe.transform({ name: "El", age: 30 })).toThrow(
      BadRequestException,
    );
  });

  // El frontend lee estos issues para pintar el error bajo cada campo.
  it("expone los mensajes de cada campo que fallo", () => {
    try {
      pipe.transform({ name: "El", age: -1 });
      fail("deberia haber lanzado");
    } catch (err) {
      const issues = (err as BadRequestException).getResponse() as {
        message: { path: string[]; message: string }[];
      };
      const paths = issues.message.map((i) => i.path[0]);
      expect(paths).toContain("name");
      expect(paths).toContain("age");
    }
  });

  it("descarta los campos que el esquema no declara", () => {
    const result = pipe.transform({
      name: "Elena",
      age: 30,
      role: "ADMIN",
    }) as Record<string, unknown>;

    expect(result.role).toBeUndefined();
  });

  it("rechaza null y undefined", () => {
    expect(() => pipe.transform(null)).toThrow(BadRequestException);
    expect(() => pipe.transform(undefined)).toThrow(BadRequestException);
  });
});
