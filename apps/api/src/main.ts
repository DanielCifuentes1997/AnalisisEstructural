import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
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
  const port = process.env.PORT ?? 4000;

  await app.listen(port);
  console.log(`API escuchando en http://localhost:${port}`);
}

void bootstrap();
