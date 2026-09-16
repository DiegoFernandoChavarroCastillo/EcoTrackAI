/**
 * Cálculo de huella de carbono: combina lo que extrajo el modelo con la tabla
 * de factores. Lógica pura y testeable, sin dependencias de Next ni de Groq.
 */
import { findEmissionFactor } from "./emissionFactors";
import type {
  Activity,
  ActivityCategory,
  EmissionResult,
  ExtractedActivity,
} from "./types";

/** Nombre legible de cada categoría, para la etiqueta de la fila. */
const CATEGORY_LABELS: Record<ActivityCategory, string> = {
  electricidad: "Electricidad",
  transporte_terrestre: "Transporte terrestre",
  combustible: "Combustible",
  agua: "Agua",
  residuos: "Residuos",
  otros: "Otras actividades",
};

/** Factor de un auto a gasolina, para traducir el total a algo imaginable. */
const KM_EQUIVALENT_FACTOR = 0.21;

export interface EmissionsBreakdown {
  results: EmissionResult[];
  totalKgCO2e: number;
  /** Actividades sin factor para su unidad, descritas en lenguaje natural. */
  ignored: string[];
}

/** Redondea a dos decimales para que no se filtre el ruido del punto flotante. */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Pasa del contrato con el modelo (español, plano) al modelo de dominio. */
export function toActivity(extracted: ExtractedActivity): Activity {
  return {
    category: extracted.tipo,
    description: CATEGORY_LABELS[extracted.tipo],
    quantity: extracted.cantidad,
    unit: extracted.unidad.trim(),
  };
}

/**
 * Convierte actividades en emisiones y calcula el total.
 * Una actividad sin factor para su unidad no se adivina: se aparta en
 * `ignored` para que el total nunca incluya un número inventado.
 */
export function calculateEmissions(
  activities: ExtractedActivity[]
): EmissionsBreakdown {
  const results: EmissionResult[] = [];
  const ignored: string[] = [];

  for (const extracted of activities) {
    const factor = findEmissionFactor(extracted.tipo, extracted.unidad);

    if (!factor) {
      ignored.push(
        `${extracted.cantidad} ${extracted.unidad} (${CATEGORY_LABELS[extracted.tipo].toLowerCase()}): no hay factor para esa unidad`
      );
      continue;
    }

    const activity = toActivity(extracted);
    results.push({
      activity,
      factor: factor.factor,
      factorUnit: factor.unidad,
      kgCO2e: round(activity.quantity * factor.factor),
      assumption: factor.nota,
    });
  }

  // De mayor a menor: la primera fila es la que conviene atacar primero.
  results.sort((a, b) => b.kgCO2e - a.kgCO2e);

  const totalKgCO2e = round(
    results.reduce((sum, result) => sum + result.kgCO2e, 0)
  );

  return { results, totalKgCO2e, ignored };
}

/**
 * Resumen en lenguaje natural. Se arma en el servidor, no con una segunda
 * llamada al modelo: es determinista, gratis y no puede alucinar una cifra.
 */
export function buildSummary(breakdown: EmissionsBreakdown): string {
  const { results, totalKgCO2e } = breakdown;
  if (results.length === 0) return "No encontramos actividades con emisiones.";

  const km = Math.round(totalKgCO2e / KM_EQUIVALENT_FACTOR / 10) * 10;
  const equivalence = `Equivale a manejar unos ${km.toLocaleString("es")} km en un auto a gasolina.`;

  if (results.length === 1) return equivalence;

  const [first, second] = results;
  return `${equivalence} ${first.activity.description} pesa más que ${second.activity.description.toLowerCase()}.`;
}
