/**
 * C3.1 · Motor de cálculo de huella de carbono.
 *
 * Funciones puras: reciben las actividades y el catálogo, devuelven el
 * resultado. No leen el catálogo por su cuenta ni tocan red, disco o reloj,
 * así que el mismo par (actividades, catálogo) da siempre el mismo número.
 * Cargar el catálogo es trabajo de `servicio.ts`, que solo corre en el servidor.
 */
import type {
  Actividad,
  CatalogoFactores,
  Equivalencia,
  FilaDesglose,
  Fuente,
  ResultadoHuella,
  UnidadFisica,
  UnidadPorFuente,
} from "./tipos";

/** Unidad física en la que se aplica el factor de cada fuente. */
export const UNIDAD_FISICA: UnidadPorFuente = {
  electricidad: "kWh",
  gas_natural: "m3",
  glp: "kg",
  gasolina: "galon",
  diesel: "galon",
};

/** Error de entrada o de catálogo, con un mensaje apto para mostrar. */
export class ErrorCalculo extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErrorCalculo";
  }
}

/** Redondea a `decimales` sin arrastrar el ruido del punto flotante. */
function redondear(valor: number, decimales: number): number {
  const escala = 10 ** decimales;
  return Math.round((valor + Number.EPSILON) * escala) / escala;
}

/** Un número que no es finito o es negativo nunca entra al cálculo. */
function exigirNoNegativo(valor: number, campo: string): void {
  if (!Number.isFinite(valor) || valor < 0) {
    throw new ErrorCalculo(`${campo} debe ser un número mayor o igual a 0 (recibido: ${valor}).`);
  }
}

/** Un divisor o multiplicador del catálogo tiene que ser positivo. */
function exigirPositivo(valor: number | undefined, campo: string): number {
  if (valor === undefined || !Number.isFinite(valor) || valor <= 0) {
    throw new ErrorCalculo(`El catálogo no tiene un valor válido para ${campo}.`);
  }
  return valor;
}

/**
 * Paso 2 del flujo: lleva una actividad a la unidad física de su fuente.
 * - Unidad física: se usa tal cual (si coincide con la de la fuente).
 * - COP: consumo = pesos ÷ tarifa (regla 2).
 * - Equipo: kWh = kW × horas/día × días × número de equipos (regla 3).
 */
export function convertirAUnidadFisica(actividad: Actividad, catalogo: CatalogoFactores): number {
  exigirNoNegativo(actividad.cantidad, "La cantidad");

  switch (actividad.unidad) {
    case "COP": {
      const tarifa = exigirPositivo(
        catalogo.tarifasCop[actividad.fuente],
        `la tarifa de ${actividad.fuente}`
      );
      return actividad.cantidad / tarifa;
    }

    case "equipo": {
      exigirNoNegativo(actividad.horasPorDia, "Las horas por día");
      exigirNoNegativo(actividad.dias, "Los días");
      if (actividad.horasPorDia > 24) {
        throw new ErrorCalculo("Las horas por día no pueden pasar de 24.");
      }
      const potencia =
        actividad.potenciaKw ??
        exigirPositivo(
          catalogo.potenciasEquiposKw[actividad.equipo],
          `la potencia del equipo "${actividad.equipo}"`
        );
      exigirNoNegativo(potencia, "La potencia");
      return potencia * actividad.horasPorDia * actividad.dias * actividad.cantidad;
    }

    default: {
      // Unidad física: TypeScript ya la limita, pero el dato puede venir de
      // un JSON, así que se valida también en tiempo de ejecución.
      const esperada: UnidadFisica = UNIDAD_FISICA[actividad.fuente];
      if (actividad.unidad !== esperada) {
        throw new ErrorCalculo(
          `La unidad de ${actividad.fuente} es "${esperada}", no "${String(actividad.unidad)}".`
        );
      }
      return actividad.cantidad;
    }
  }
}

/**
 * Porcentajes con un decimal que suman exactamente 100,0 (regla 5).
 * Método del resto mayor: se trunca cada parte a décimas y las décimas que
 * faltan se reparten entre las partes con mayor resto.
 */
export function porcentajesQueSuman100(valores: number[]): number[] {
  const total = valores.reduce((suma, v) => suma + v, 0);
  if (total <= 0) return valores.map(() => 0);

  // Se trabaja en décimas de punto porcentual (1000 = 100,0 %).
  const exactos = valores.map((v) => (v / total) * 1000);
  const enteros = exactos.map(Math.floor);
  let faltantes = 1000 - enteros.reduce((suma, v) => suma + v, 0);

  const porResto = exactos
    .map((v, i) => ({ i, resto: v - Math.floor(v) }))
    .sort((a, b) => b.resto - a.resto || a.i - b.i);

  for (const { i } of porResto) {
    if (faltantes <= 0) break;
    enteros[i] += 1;
    faltantes -= 1;
  }

  return enteros.map((d) => d / 10);
}

/** Traduce el total a algo imaginable, p. ej. km en carro a gasolina. */
export function calcularEquivalencia(totalKg: number, catalogo: CatalogoFactores): Equivalencia {
  const { descripcion, unidad, kgCO2ePorUnidad } = catalogo.equivalencia;
  const divisor = exigirPositivo(kgCO2ePorUnidad, "la equivalencia");
  return { descripcion, unidad, valor: redondear(totalKg / divisor, 1) };
}

interface Acumulado {
  consumo: number;
  kgCO2e: number;
  incluyeEstimados: boolean;
}

/**
 * Calcula la huella de un conjunto de actividades confirmadas con una versión
 * concreta del catálogo. Pasos 2 a 5 del flujo principal.
 *
 * Los acumulados se llevan sin redondear; solo se redondea al armar la salida
 * (consumo a 3 decimales, kg CO2e a 2), para no sumar errores de redondeo.
 */
export function calcularHuella(
  actividades: readonly Actividad[],
  catalogo: CatalogoFactores
): ResultadoHuella {
  const porFuente = new Map<Fuente, Acumulado>();

  for (const actividad of actividades) {
    const consumo = convertirAUnidadFisica(actividad, catalogo);
    const factor = catalogo.factoresEmision[actividad.fuente];
    if (factor === undefined || !Number.isFinite(factor) || factor < 0) {
      throw new ErrorCalculo(`El catálogo no tiene un factor válido para ${actividad.fuente}.`);
    }

    // Regla 1: kg CO2e = consumo × factor de emisión.
    const kg = consumo * factor;

    const previo = porFuente.get(actividad.fuente);
    porFuente.set(actividad.fuente, {
      consumo: (previo?.consumo ?? 0) + consumo,
      kgCO2e: (previo?.kgCO2e ?? 0) + kg,
      incluyeEstimados: (previo?.incluyeEstimados ?? false) || actividad.origen === "estimado",
    });
  }

  // De mayor a menor; a igualdad, por nombre, para que el orden sea determinista.
  const filas = [...porFuente.entries()].sort(
    ([fa, a], [fb, b]) => b.kgCO2e - a.kgCO2e || fa.localeCompare(fb)
  );

  const totalExacto = filas.reduce((suma, [, a]) => suma + a.kgCO2e, 0);
  const porcentajes = porcentajesQueSuman100(filas.map(([, a]) => a.kgCO2e));

  const desglose: FilaDesglose[] = filas.map(([fuente, a], i) => ({
    fuente,
    consumo: redondear(a.consumo, 3),
    unidad: UNIDAD_FISICA[fuente],
    kgCO2e: redondear(a.kgCO2e, 2),
    porcentaje: porcentajes[i],
    incluyeEstimados: a.incluyeEstimados,
  }));

  return {
    total: redondear(totalExacto, 2),
    desglose,
    // Regla 4: el resultado lleva la versión con la que se calculó.
    versionFactores: catalogo.version,
    equivalencia: calcularEquivalencia(totalExacto, catalogo),
  };
}
