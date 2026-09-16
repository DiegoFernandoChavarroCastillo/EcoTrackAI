/**
 * Datos de prueba para maquetar la interfaz.
 * TODO: eliminar cuando app/api/analyze devuelva datos reales.
 */
import type { AnalyzeResponse } from "./types";

export const MOCK_ANALYSIS: AnalyzeResponse = {
  totalKgCO2e: 140.8,
  summary:
    "Equivale a manejar unos 670 km en un auto a gasolina. Transporte terrestre pesa más que electricidad.",
  ignored: [],
  results: [
    {
      activity: {
        category: "transporte_terrestre",
        description: "Transporte terrestre",
        quantity: 5,
        unit: "camionetas",
      },
      factor: 21.6,
      factorUnit: "camioneta-día",
      kgCO2e: 108,
      assumption:
        "Supone una ruta de reparto de 80 km/día en camioneta diésel (80 × 0,27).",
    },
    {
      activity: {
        category: "electricidad",
        description: "Electricidad",
        quantity: 200,
        unit: "kWh",
      },
      factor: 0.164,
      factorUnit: "kWh",
      kgCO2e: 32.8,
      assumption:
        "Factor promedio de la red eléctrica colombiana.",
    },
  ],
};

/** Longitud mínima para que el texto describa algo analizable. */
const MIN_LENGTH = 12;

/**
 * Simula el POST a /api/analyze con una espera y un fallo determinista:
 * un texto demasiado corto siempre devuelve error, para poder probarlo a mano.
 */
export async function mockAnalyze(text: string): Promise<AnalyzeResponse> {
  await new Promise((resolve) => setTimeout(resolve, 1100));

  if (text.trim().length < MIN_LENGTH) {
    throw new Error(
      "El texto es muy corto para reconocer actividades. Menciona qué usaste y cuánto, por ejemplo: 5 camionetas y 200 kWh."
    );
  }

  return MOCK_ANALYSIS;
}
