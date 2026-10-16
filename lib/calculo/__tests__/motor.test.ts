import { describe, expect, it } from "vitest";

import { calcularHuella, ErrorCalculo, porcentajesQueSuman100 } from "../motor";
import type { Actividad, ResultadoHuella } from "../tipos";
import { CATALOGO_PRUEBA } from "./fixtures";

const calcular = (actividades: Actividad[]): ResultadoHuella =>
  calcularHuella(actividades, CATALOGO_PRUEBA);

const sumaPorcentajes = (r: ResultadoHuella): number =>
  r.desglose.reduce((suma, f) => suma + f.porcentaje, 0);

describe("Criterios de aceptación", () => {
  it("CA-C31-01: factor 0,2 y 1.000 kWh dan 200,0 kg CO2e", () => {
    const r = calcular([{ fuente: "electricidad", unidad: "kWh", cantidad: 1_000, origen: "declarado" }]);
    expect(r.total).toBe(200);
  });

  it("CA-C31-02: tarifa $800/kWh y $480.000 dan 600 kWh", () => {
    const r = calcular([{ fuente: "electricidad", unidad: "COP", cantidad: 480_000, origen: "declarado" }]);
    expect(r.desglose[0].consumo).toBe(600);
    expect(r.desglose[0].unidad).toBe("kWh");
  });
});

/**
 * Diez casos calculados a mano con CATALOGO_PRUEBA. La cuenta va en el
 * nombre para que una falla en CI se pueda revisar sin abrir el código.
 */
describe("Casos calculados a mano", () => {
  it("1. Electricidad física: 1.000 kWh × 0,2 = 200 kg", () => {
    const r = calcular([{ fuente: "electricidad", unidad: "kWh", cantidad: 1_000, origen: "declarado" }]);
    expect(r.desglose).toEqual([
      { fuente: "electricidad", consumo: 1_000, unidad: "kWh", kgCO2e: 200, porcentaje: 100, incluyeEstimados: false },
    ]);
    expect(r.equivalencia).toEqual({ descripcion: "km recorridos en un carro a gasolina", unidad: "km", valor: 800 });
  });

  it("2. Electricidad en COP: $480.000 ÷ 800 = 600 kWh × 0,2 = 120 kg", () => {
    const r = calcular([{ fuente: "electricidad", unidad: "COP", cantidad: 480_000, origen: "declarado" }]);
    expect(r.total).toBe(120);
  });

  it("3. Nevera de catálogo: 0,15 kW × 24 h × 30 d = 108 kWh × 0,2 = 21,6 kg", () => {
    const r = calcular([
      { fuente: "electricidad", unidad: "equipo", equipo: "nevera", cantidad: 1, horasPorDia: 24, dias: 30, origen: "estimado" },
    ]);
    expect(r.desglose[0].consumo).toBe(108);
    expect(r.total).toBe(21.6);
    expect(r.desglose[0].incluyeEstimados).toBe(true);
  });

  it("4. Dos aires: 1,5 kW × 8 h × 30 d × 2 = 720 kWh × 0,2 = 144 kg", () => {
    const r = calcular([
      { fuente: "electricidad", unidad: "equipo", equipo: "aire_acondicionado", cantidad: 2, horasPorDia: 8, dias: 30, origen: "declarado" },
    ]);
    expect(r.desglose[0].consumo).toBe(720);
    expect(r.total).toBe(144);
  });

  it("5. Potencia medida por el usuario: 0,5 kW × 10 h × 3 d = 15 kWh × 0,2 = 3 kg", () => {
    const r = calcular([
      { fuente: "electricidad", unidad: "equipo", equipo: "nevera", potenciaKw: 0.5, cantidad: 1, horasPorDia: 10, dias: 3, origen: "declarado" },
    ]);
    expect(r.desglose[0].consumo).toBe(15);
    expect(r.total).toBe(3);
  });

  it("6. Gas natural: 50 m3 × 2 = 100 kg", () => {
    const r = calcular([{ fuente: "gas_natural", unidad: "m3", cantidad: 50, origen: "declarado" }]);
    expect(r.total).toBe(100);
  });

  it("7. GLP en COP: $100.000 ÷ 4.000 = 25 kg × 3 = 75 kg", () => {
    const r = calcular([{ fuente: "glp", unidad: "COP", cantidad: 100_000, origen: "declarado" }]);
    expect(r.desglose[0]).toMatchObject({ consumo: 25, unidad: "kg", kgCO2e: 75 });
  });

  it("8. Gasolina 10 gal (90 kg) + diésel $50.000 (5 gal, 50 kg) = 140 kg; 64,3 % / 35,7 %", () => {
    const r = calcular([
      { fuente: "gasolina", unidad: "galon", cantidad: 10, origen: "declarado" },
      { fuente: "diesel", unidad: "COP", cantidad: 50_000, origen: "declarado" },
    ]);
    expect(r.total).toBe(140);
    expect(r.desglose.map((f) => [f.fuente, f.kgCO2e, f.porcentaje])).toEqual([
      ["gasolina", 90, 64.3],
      ["diesel", 50, 35.7],
    ]);
  });

  it("9. Misma fuente se suma: 100 kWh + $80.000 (100 kWh) = 200 kWh, 40 kg", () => {
    const r = calcular([
      { fuente: "electricidad", unidad: "kWh", cantidad: 100, origen: "declarado" },
      { fuente: "electricidad", unidad: "COP", cantidad: 80_000, origen: "estimado" },
    ]);
    expect(r.desglose).toHaveLength(1);
    expect(r.desglose[0]).toMatchObject({ consumo: 200, kgCO2e: 40, porcentaje: 100, incluyeEstimados: true });
  });

  it("10. Tres tercios: 20 + 20 + 20 = 60 kg; 33,4 + 33,3 + 33,3 = 100,0 %; 240 km", () => {
    const r = calcular([
      { fuente: "electricidad", unidad: "kWh", cantidad: 100, origen: "declarado" },
      { fuente: "gas_natural", unidad: "m3", cantidad: 10, origen: "declarado" },
      { fuente: "diesel", unidad: "galon", cantidad: 2, origen: "declarado" },
    ]);
    expect(r.total).toBe(60);
    // Empate en kg: el orden es alfabético y la décima sobrante va a la primera.
    expect(r.desglose.map((f) => [f.fuente, f.porcentaje])).toEqual([
      ["diesel", 33.4],
      ["electricidad", 33.3],
      ["gas_natural", 33.3],
    ]);
    expect(r.equivalencia.valor).toBe(240);
  });
});

describe("Regla 5: los porcentajes suman 100 %", () => {
  it("con cinco fuentes de pesos dispares", () => {
    const r = calcular([
      { fuente: "electricidad", unidad: "kWh", cantidad: 333, origen: "declarado" },
      { fuente: "gas_natural", unidad: "m3", cantidad: 7.7, origen: "declarado" },
      { fuente: "glp", unidad: "kg", cantidad: 1.1, origen: "declarado" },
      { fuente: "gasolina", unidad: "galon", cantidad: 3.3, origen: "declarado" },
      { fuente: "diesel", unidad: "galon", cantidad: 0.7, origen: "declarado" },
    ]);
    expect(Math.abs(sumaPorcentajes(r) - 100)).toBeLessThanOrEqual(0.1);
  });

  it("sin emisiones, todos los porcentajes son 0", () => {
    expect(porcentajesQueSuman100([0, 0])).toEqual([0, 0]);
  });
});

describe("Entradas inválidas", () => {
  it("lista vacía da total 0 y desglose vacío", () => {
    const r = calcular([]);
    expect(r).toMatchObject({ total: 0, desglose: [], versionFactores: "prueba-v1" });
  });

  it("rechaza cantidades negativas", () => {
    expect(() => calcular([{ fuente: "glp", unidad: "kg", cantidad: -1, origen: "declarado" }])).toThrow(ErrorCalculo);
  });

  it("rechaza una unidad que no es la de la fuente", () => {
    const malo = { fuente: "glp", unidad: "kWh", cantidad: 1, origen: "declarado" } as unknown as Actividad;
    expect(() => calcular([malo])).toThrow(/La unidad de glp es "kg"/);
  });

  it("rechaza un equipo que no está en el catálogo", () => {
    expect(() =>
      calcular([{ fuente: "electricidad", unidad: "equipo", equipo: "tostadora", cantidad: 1, horasPorDia: 1, dias: 1, origen: "declarado" }])
    ).toThrow(/tostadora/);
  });

  it.each([0, -800])("rechaza una tarifa de %d COP", (tarifa) => {
    const catalogo = { ...CATALOGO_PRUEBA, tarifasCop: { ...CATALOGO_PRUEBA.tarifasCop, electricidad: tarifa } };
    expect(() =>
      calcularHuella([{ fuente: "electricidad", unidad: "COP", cantidad: 480_000, origen: "declarado" }], catalogo)
    ).toThrow("El catálogo no tiene un valor válido para la tarifa de electricidad.");
  });

  it.each(["kg", "COP"])("rechaza una fuente fuera del catálogo (unidad %s)", (unidad) => {
    const malo = { fuente: "carbon", unidad, cantidad: 1, origen: "declarado" } as unknown as Actividad;
    expect(() => calcular([malo])).toThrow('La fuente "carbon" no está en el catálogo.');
  });

  it("rechaza el modo equipo con una fuente distinta de electricidad", () => {
    const malo = {
      fuente: "glp", unidad: "equipo", equipo: "nevera", cantidad: 1, horasPorDia: 1, dias: 1, origen: "declarado",
    } as unknown as Actividad;
    expect(() => calcular([malo])).toThrow('El modo equipo solo aplica a electricidad, no a "glp".');
  });

  it("rechaza más de 24 horas por día", () => {
    expect(() =>
      calcular([{ fuente: "electricidad", unidad: "equipo", equipo: "nevera", cantidad: 1, horasPorDia: 25, dias: 1, origen: "declarado" }])
    ).toThrow(ErrorCalculo);
  });
});

describe("Rendimiento", () => {
  it("calcula 20 actividades en ≤ 300 ms", () => {
    const actividades: Actividad[] = Array.from({ length: 20 }, (_, i): Actividad =>
      i % 2 === 0
        ? { fuente: "electricidad", unidad: "COP", cantidad: 10_000 * (i + 1), origen: "declarado" }
        : { fuente: "diesel", unidad: "galon", cantidad: i, origen: "estimado" }
    );
    const inicio = performance.now();
    calcular(actividades);
    expect(performance.now() - inicio).toBeLessThanOrEqual(300);
  });
});
