/**
 * Tipos compartidos entre el frontend y el endpoint /api/analyze.
 * Única fuente de verdad del contrato de datos.
 */

/** Categorías de actividad que el MVP sabe reconocer. Son los valores válidos de "tipo". */
export type ActivityCategory =
  | "electricidad"
  | "transporte_terrestre"
  | "combustible"
  | "agua"
  | "residuos"
  | "otros";

/**
 * Lo que devuelve el modelo, tal cual. Es un contrato con Groq, no con el
 * frontend: por eso va en español y plano, igual que en el prompt.
 */
export interface ExtractedActivity {
  tipo: ActivityCategory;
  cantidad: number;
  unidad: string;
}

/** Actividad ya normalizada al modelo de dominio. */
export interface Activity {
  category: ActivityCategory;
  description: string;
  quantity: number;
  /** Unidad tal como la nombró la persona, p. ej. "kWh", "km", "camionetas". */
  unit: string;
}

/** Actividad ya convertida a emisiones. */
export interface EmissionResult {
  activity: Activity;
  /** Factor aplicado, en kg CO2e por unidad. */
  factor: number;
  /** Unidad canónica del factor, p. ej. "L diésel". La del usuario puede diferir. */
  factorUnit: string;
  /** Emisiones totales de la actividad, en kg CO2e. */
  kgCO2e: number;
  /** Supuesto detrás del factor. Se muestra para que la cifra sea auditable. */
  assumption: string;
}

/** Body del POST /api/analyze. */
export interface AnalyzeRequest {
  /** Descripción libre de las actividades del negocio. */
  text: string;
}

/** Respuesta de POST /api/analyze. */
export interface AnalyzeResponse {
  results: EmissionResult[];
  /** Suma de todas las emisiones, en kg CO2e. */
  totalKgCO2e: number;
  /** Resumen en lenguaje natural, calculado en el servidor. */
  summary: string;
  /**
   * Actividades que el modelo reconoció pero que no tienen factor para esa
   * unidad. Se declaran en vez de silenciarse: un total incompleto sin avisar
   * es peor que un total con notas.
   */
  ignored: string[];
}

/** Forma de error homogénea para el endpoint. */
export interface ApiError {
  error: string;
}

/**
 * Estado de la pantalla principal como unión discriminada.
 * Cada estado carga exactamente los datos que necesita: no existe
 * la combinación imposible de "cargando y con error a la vez".
 */
export type AnalysisState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: AnalyzeResponse }
  | { status: "error"; message: string };
