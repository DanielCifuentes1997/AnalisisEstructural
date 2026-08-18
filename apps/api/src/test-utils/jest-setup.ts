// Los servicios registran en el Logger de Nest durante las pruebas; sin
// esto la salida de jest queda ilegible entre mensajes de negocio.
import { Logger } from "@nestjs/common";

beforeAll(() => {
  jest.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
  jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
  jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
});
