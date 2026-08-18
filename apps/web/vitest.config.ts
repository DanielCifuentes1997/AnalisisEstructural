import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next"],
  },
  resolve: {
    alias: {
      // El paquete compartido se resuelve a su fuente para no depender
      // de que dist este reconstruido al correr las pruebas.
      "@proyecto/shared-types": path.resolve(
        import.meta.dirname,
        "../../packages/shared-types/src/index.ts",
      ),
    },
  },
});
