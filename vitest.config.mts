import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      // `server-only` lanza un error fuera de un React Server Component.
      // En las pruebas no hay cliente que proteger, así que se reemplaza por un módulo vacío.
      "server-only": fileURLToPath(new URL("./lib/calculo/__tests__/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**"],
  },
});
