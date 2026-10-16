import { describe, expect, it } from "vitest";

import { crearRepositorioCatalogo, repositorioCatalogo } from "../catalogo";
import { ErrorCalculo } from "../motor";
import { calcularMedicion, recalcularMedicion } from "../servicio";
import type { Actividad, CatalogoFactores } from "../tipos";
import { CATALOGO_PRUEBA } from "./fixtures";

const V1: CatalogoFactores = { ...CATALOGO_PRUEBA, version: "v1" };
const V2: CatalogoFactores = {
  ...CATALOGO_PRUEBA,
  version: "v2",
  factoresEmision: { ...CATALOGO_PRUEBA.factoresEmision, electricidad: 0.5 },
};

const ACTIVIDADES: Actividad[] = [
  { fuente: "electricidad", unidad: "kWh", cantidad: 1_000, origen: "declarado" },
];

describe("Versionado de factores", () => {
  it("CA-C31-03: una medición hecha con v1 no cambia cuando el catálogo pasa a v2", () => {
    // Hoy la vigente es v1.
    const medicion = calcularMedicion(ACTIVIDADES, undefined, crearRepositorioCatalogo([V1], "v1"));
    expect(medicion.versionFactores).toBe("v1");
    expect(medicion.resultado.total).toBe(200);

    // Se publica v2 y pasa a ser la vigente.
    const repoNuevo = crearRepositorioCatalogo([V1, V2], "v2");
    const recalculada = recalcularMedicion(medicion, repoNuevo);

    expect(recalculada.versionFactores).toBe("v1");
    expect(recalculada.resultado).toEqual(medicion.resultado);

    // Una medición nueva sí toma v2.
    expect(calcularMedicion(ACTIVIDADES, undefined, repoNuevo).resultado.total).toBe(500);
  });

  it("falla si se pide una versión que no existe", () => {
    const repo = crearRepositorioCatalogo([V1], "v1");
    expect(() => calcularMedicion(ACTIVIDADES, "v9", repo)).toThrow(ErrorCalculo);
  });

  it("el repositorio por defecto carga su versión vigente", () => {
    const medicion = calcularMedicion(ACTIVIDADES);
    expect(medicion.versionFactores).toBe(repositorioCatalogo.versionVigente);
  });
});
