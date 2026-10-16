/**
 * C3.1 · Punto de entrada del servidor (route handlers, server actions).
 *
 * Une el motor puro con el catálogo. Por importar `catalogo.ts`, este módulo
 * también es solo de servidor.
 */
import "server-only";

import { repositorioCatalogo, type RepositorioCatalogo } from "./catalogo";
import { calcularHuella } from "./motor";
import type { Actividad, Medicion } from "./tipos";

/**
 * Flujo principal completo: carga el catálogo (paso 1) y calcula (pasos 2-5).
 * Sin `version`, usa la vigente; el resultado dice cuál se usó.
 */
export function calcularMedicion(
  actividades: readonly Actividad[],
  version?: string,
  repositorio: RepositorioCatalogo = repositorioCatalogo
): Medicion {
  const catalogo = repositorio.obtener(version);
  return {
    actividades: [...actividades],
    versionFactores: catalogo.version,
    resultado: calcularHuella(actividades, catalogo),
  };
}

/**
 * Regla 4: una medición pasada se recalcula siempre con su propia versión
 * de factores, aunque la vigente haya cambiado.
 */
export function recalcularMedicion(
  medicion: Pick<Medicion, "actividades" | "versionFactores">,
  repositorio: RepositorioCatalogo = repositorioCatalogo
): Medicion {
  return calcularMedicion(medicion.actividades, medicion.versionFactores, repositorio);
}
