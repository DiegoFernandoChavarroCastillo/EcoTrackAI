/**
 * RNF de seguridad: los factores solo se cargan en el servidor.
 *
 * Quien lo hace cumplir es `server-only`: Next falla el build si un componente
 * de cliente importa un módulo que lo importa. Esta prueba evita que alguien
 * quite esa línea sin darse cuenta, porque Vitest no puede reproducir el build.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const leer = (archivo: string): string =>
  readFileSync(fileURLToPath(new URL(`../${archivo}`, import.meta.url)), "utf8");

describe("Seguridad", () => {
  it.each(["catalogo.ts", "servicio.ts"])("%s importa server-only", (archivo) => {
    expect(leer(archivo)).toMatch(/^import "server-only";$/m);
  });

  it("motor.ts y tipos.ts no importan el catálogo", () => {
    for (const archivo of ["motor.ts", "tipos.ts"]) {
      expect(leer(archivo)).not.toMatch(/from "\.\/(catalogo|servicio)"/);
    }
  });
});
