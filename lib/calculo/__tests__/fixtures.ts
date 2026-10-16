/**
 * Catálogo fijo para las pruebas. Es independiente de los datos de ejemplo de
 * `catalogo.ts`: así, actualizar los factores reales no rompe los casos
 * calculados a mano.
 */
import type { CatalogoFactores } from "../tipos";

export const CATALOGO_PRUEBA: CatalogoFactores = {
  version: "prueba-v1",
  factoresEmision: {
    electricidad: 0.2,
    gas_natural: 2,
    glp: 3,
    gasolina: 9,
    diesel: 10,
  },
  tarifasCop: {
    electricidad: 800,
    gas_natural: 2_500,
    glp: 4_000,
    gasolina: 15_000,
    diesel: 10_000,
  },
  potenciasEquiposKw: {
    nevera: 0.15,
    aire_acondicionado: 1.5,
  },
  equivalencia: {
    descripcion: "km recorridos en un carro a gasolina",
    unidad: "km",
    kgCO2ePorUnidad: 0.25,
  },
};
