/**
 * Catálogo versionado de factores (stand-in de C3.2).
 *
 * `server-only` hace fallar el build si un componente de cliente importa este
 * archivo, directa o indirectamente: los factores nunca llegan al navegador.
 *
 * ⚠️ TODOS LOS VALORES SON DE EJEMPLO Y ESTÁN POR VERIFICAR. No provienen de
 * una fuente oficial citada. Antes de producción, reemplázalos por los
 * factores y tarifas vigentes y documenta la fuente de cada uno en C3.2.
 *
 * Una versión publicada no se edita: si un número cambia, se crea una versión
 * nueva. Así una medición vieja se puede recalcular con sus factores originales.
 */
import "server-only";

import { ErrorCalculo } from "./motor";
import type { CatalogoFactores } from "./tipos";

/** POR VERIFICAR — valores de ejemplo para desarrollo. */
const CATALOGO_V1: CatalogoFactores = {
  version: "v1",
  factoresEmision: {
    electricidad: 0.164, // kg CO2e/kWh — por verificar
    gas_natural: 1.98, // kg CO2e/m3 — por verificar
    glp: 2.98, // kg CO2e/kg — por verificar
    gasolina: 8.74, // kg CO2e/galón — por verificar
    diesel: 10.15, // kg CO2e/galón — por verificar
  },
  tarifasCop: {
    electricidad: 800, // COP/kWh — por verificar
    gas_natural: 3_000, // COP/m3 — por verificar
    glp: 5_000, // COP/kg — por verificar
    gasolina: 16_000, // COP/galón — por verificar
    diesel: 11_000, // COP/galón — por verificar
  },
  potenciasEquiposKw: {
    nevera: 0.15, // por verificar
    aire_acondicionado: 1.5, // por verificar
    computador: 0.2, // por verificar
    horno_electrico: 2.0, // por verificar
    bombillo_led: 0.01, // por verificar
  },
  equivalencia: {
    descripcion: "km recorridos en un carro a gasolina",
    unidad: "km",
    kgCO2ePorUnidad: 0.21, // por verificar
  },
};

/** POR VERIFICAR — v2 de ejemplo: solo cambia el factor de la red eléctrica. */
const CATALOGO_V2: CatalogoFactores = {
  ...CATALOGO_V1,
  version: "v2",
  factoresEmision: { ...CATALOGO_V1.factoresEmision, electricidad: 0.2 }, // por verificar
};

/** Acceso a las versiones del catálogo. */
export interface RepositorioCatalogo {
  /** Versión indicada, o la vigente si no se indica. */
  obtener(version?: string): CatalogoFactores;
  readonly versionVigente: string;
}

/**
 * Crea un repositorio sobre un conjunto fijo de versiones. Se expone para
 * que las pruebas (y C3.2, cuando lea de base de datos) armen el suyo.
 */
export function crearRepositorioCatalogo(
  catalogos: readonly CatalogoFactores[],
  versionVigente: string
): RepositorioCatalogo {
  const porVersion = new Map(catalogos.map((c) => [c.version, Object.freeze(c)]));
  if (!porVersion.has(versionVigente)) {
    throw new ErrorCalculo(`La versión vigente "${versionVigente}" no está en el catálogo.`);
  }

  return {
    versionVigente,
    obtener(version = versionVigente) {
      const catalogo = porVersion.get(version);
      if (!catalogo) {
        throw new ErrorCalculo(`No existe la versión de factores "${version}".`);
      }
      return catalogo;
    },
  };
}

/** Repositorio por defecto con los datos de ejemplo. */
export const repositorioCatalogo = crearRepositorioCatalogo([CATALOGO_V1, CATALOGO_V2], "v2");
