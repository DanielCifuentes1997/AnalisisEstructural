import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";

const REQUIRED_ENV_VARS = ["JWT_SECRET_KEY", "DATABASE_URL", "DIRECT_URL"];

function assertRequiredEnv() {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Faltan variables de entorno requeridas: ${missing.join(", ")}`,
    );
  }
}

async function bootstrap() {
  assertRequiredEnv();

  const app = await NestFactory.create(AppModule);

  // El refresh token viaja en cookie httpOnly (nunca lo toca el JS del
  // navegador), asi que necesitamos parsear cookies para renovarlo.
  app.use(cookieParser());

  app.enableCors({
    origin: (process.env.CORS_ORIGIN ?? "http://localhost:3000").split(","),
    credentials: true,
  });

  const port = process.env.PORT ?? 4000;

  await app.listen(port);
  console.log(`API escuchando en http://localhost:${port}`);
}

void bootstrap();
