/**
 * Tabla de factores de emisión.
 *
 * Un factor no depende solo de la categoría sino de la unidad: 200 kWh y
 * 200 litros de diésel son "energía" pero no comparten número. Por eso la
 * tabla se indexa por (categoría, unidad) y no por categoría sola.
 *
 * Los valores son promedios de referencia para un MVP. Sirven para priorizar
 * ("el reparto pesa más que la luz"), no para un reporte regulatorio: antes
 * de usarlos en producción, reemplázalos por los factores del país y del año
 * que corresponda y cita la fuente en `nota`.
 */
import type { ActivityCategory } from "./types";

export interface EmissionFactor {
  categoria: ActivityCategory;
  /** Unidad canónica, tal como se muestra al usuario. */
  unidad: string;
  /** kg CO2e por unidad. */
  factor: number;
  /** Otras formas en que el modelo o la persona pueden nombrar la unidad. */
  alias: string[];
  /** Qué supone el número. Viaja hasta la respuesta para que sea auditable. */
  nota: string;
}

export const EMISSION_FACTORS: EmissionFactor[] = [
  // --- Electricidad ----------------------------------------------------
  {
    categoria: "electricidad",
    unidad: "kWh",
    factor: 0.164,
    alias: ["kwh", "kw/h", "kw", "kilovatio hora", "kilovatios hora", "kilovatio-hora"],
    nota: "Factor promedio de la red eléctrica colombiana. Cámbialo por el del país donde opera el negocio.",
  },
  {
    categoria: "electricidad",
    unidad: "MWh",
    factor: 164,
    alias: ["mwh", "megavatio hora", "megavatios hora"],
    nota: "Mismo factor de red, expresado por megavatio-hora.",
  },

  // --- Transporte terrestre --------------------------------------------
  {
    categoria: "transporte_terrestre",
    unidad: "km",
    factor: 0.21,
    alias: ["kilometro", "kilometros", "km recorridos"],
    nota: "Vehículo liviano a gasolina en ciclo urbano.",
  },
  {
    categoria: "transporte_terrestre",
    unidad: "camioneta-día",
    factor: 21.6,
    alias: ["camioneta", "camionetas", "camioneta-dia", "camioneta dia", "furgoneta", "furgonetas", "vehiculo", "vehiculos", "moto", "motos"],
    nota: "Supone una ruta de reparto de 80 km/día en camioneta diésel (80 × 0,27). Es el supuesto más frágil de la tabla: si conoces los kilómetros reales, descríbelos en km.",
  },

  // --- Combustible ------------------------------------------------------
  {
    categoria: "combustible",
    unidad: "L diésel",
    factor: 2.68,
    alias: ["litro de diesel", "litros de diesel", "litro diesel", "litros diesel", "l diesel", "diesel", "acpm"],
    nota: "Combustión de diésel automotor.",
  },
  {
    categoria: "combustible",
    unidad: "L gasolina",
    factor: 2.31,
    alias: ["litro de gasolina", "litros de gasolina", "litro gasolina", "litros gasolina", "l gasolina", "gasolina", "litro", "litros"],
    nota: "Combustión de gasolina. Una unidad genérica como \"litros\" se asume gasolina; para diésel di \"litros de diésel\".",
  },
  {
    categoria: "combustible",
    unidad: "galón gasolina",
    factor: 8.74,
    alias: ["galon", "galones", "galon de gasolina", "galones de gasolina", "galon gasolina"],
    nota: "Gasolina, 1 galón US = 3,785 L.",
  },
  {
    categoria: "combustible",
    unidad: "kg GLP",
    factor: 2.98,
    alias: ["kg glp", "glp", "gas propano", "propano", "pipeta de gas", "pipetas de gas"],
    nota: "Gas licuado de petróleo para cocina o calderas.",
  },

  // --- Agua -------------------------------------------------------------
  {
    categoria: "agua",
    unidad: "m³",
    factor: 0.34,
    alias: ["m3", "m^3", "metro cubico", "metros cubicos", "metro cúbico", "metros cúbicos"],
    nota: "Energía de captación, potabilización, bombeo y tratamiento del agua residual.",
  },
  {
    categoria: "agua",
    unidad: "L",
    factor: 0.00034,
    alias: ["litro", "litros", "litro de agua", "litros de agua"],
    nota: "Mismo factor que el metro cúbico, por litro.",
  },

  // --- Residuos ---------------------------------------------------------
  {
    categoria: "residuos",
    unidad: "kg",
    factor: 0.58,
    alias: ["kilo", "kilos", "kilogramo", "kilogramos", "kg de basura", "kg de residuos"],
    nota: "Mezcla típica de residuos comerciales dispuesta en relleno sanitario, incluye metano.",
  },
  {
    categoria: "residuos",
    unidad: "tonelada",
    factor: 580,
    alias: ["toneladas", "ton", "t"],
    nota: "Mismo factor que el kilogramo, por tonelada.",
  },
  {
    categoria: "residuos",
    unidad: "bolsa",
    factor: 5.8,
    alias: ["bolsas", "bolsa de basura", "bolsas de basura", "canecas", "caneca"],
    nota: "Supone 10 kg por bolsa de basura comercial.",
  },
];

/** Minúsculas, sin tildes y sin espacios de sobra, para poder comparar unidades. */
export function normalizeUnit(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Busca el factor de una categoría para la unidad que usó la persona.
 * Prueba la unidad tal cual y, si no hay suerte, en singular.
 */
export function findEmissionFactor(
  categoria: ActivityCategory,
  unidad: string
): EmissionFactor | undefined {
  const candidates = EMISSION_FACTORS.filter((f) => f.categoria === categoria);
  const target = normalizeUnit(unidad);
  const singular = target.replace(/e?s$/, "");

  const matches = (f: EmissionFactor, value: string) =>
    normalizeUnit(f.unidad) === value ||
    f.alias.some((a) => normalizeUnit(a) === value);

  return (
    candidates.find((f) => matches(f, target)) ??
    candidates.find((f) => matches(f, singular))
  );
}
