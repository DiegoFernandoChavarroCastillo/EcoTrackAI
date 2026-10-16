/**
 * C3.1 · Tipos del motor de cálculo de huella de carbono.
 *
 * Solo tipos: este archivo no trae datos del catálogo, así que se puede
 * importar desde cualquier lado (incluido un componente de cliente que
 * necesite tipar el resultado) sin filtrar factores al navegador.
 */

/** Fuentes de emisión que el motor sabe calcular. */
export type Fuente = "electricidad" | "gas_natural" | "glp" | "gasolina" | "diesel";

/** Unidad física de cada fuente. Es la unidad en la que se aplica el factor. */
export interface UnidadPorFuente {
  electricidad: "kWh";
  gas_natural: "m3";
  glp: "kg";
  gasolina: "galon";
  diesel: "galon";
}

export type UnidadFisica = UnidadPorFuente[Fuente];

/** De dónde salió el dato: lo dijo el usuario o lo estimó la app. */
export type Origen = "declarado" | "estimado";

/** Actividad expresada directamente en la unidad física de su fuente. */
export interface ActividadFisica<F extends Fuente = Fuente> {
  fuente: F;
  unidad: UnidadPorFuente[F];
  /** Consumo en la unidad física (kWh, m3, kg o galones). */
  cantidad: number;
  origen: Origen;
}

/** Actividad expresada en pesos pagados. Se convierte con la tarifa del catálogo. */
export interface ActividadCOP {
  fuente: Fuente;
  unidad: "COP";
  /** Valor pagado en pesos colombianos. */
  cantidad: number;
  origen: Origen;
}

/**
 * Actividad expresada como uso de un equipo eléctrico.
 * kWh = potencia (kW) × horas/día × días × número de equipos.
 */
export interface ActividadEquipo {
  fuente: "electricidad";
  unidad: "equipo";
  /** Número de equipos iguales. */
  cantidad: number;
  /** Id del equipo en el catálogo, p. ej. "nevera". */
  equipo: string;
  horasPorDia: number;
  dias: number;
  /** Potencia medida por el usuario; si falta, se usa la del catálogo. */
  potenciaKw?: number;
  origen: Origen;
}

/**
 * Una actividad que el usuario ya confirmó. Unión discriminada por `unidad`:
 * cada forma carga exactamente los datos que su conversión necesita.
 */
export type Actividad =
  | { [F in Fuente]: ActividadFisica<F> }[Fuente]
  | ActividadCOP
  | ActividadEquipo;

/** Factores, tarifas y potencias de una versión del catálogo (contrato con C3.2). */
export interface CatalogoFactores {
  /** Identificador inmutable de la versión, p. ej. "v1". */
  version: string;
  /** kg CO2e por unidad física de cada fuente. */
  factoresEmision: Record<Fuente, number>;
  /** COP por unidad física de cada fuente. */
  tarifasCop: Record<Fuente, number>;
  /** Potencia típica en kW por id de equipo. */
  potenciasEquiposKw: Record<string, number>;
  /** Referencia para la equivalencia cotidiana. */
  equivalencia: {
    descripcion: string;
    unidad: string;
    /** kg CO2e por unidad de la equivalencia (p. ej. por km recorrido). */
    kgCO2ePorUnidad: number;
  };
}

/** Una fila del desglose: todas las actividades de una misma fuente, sumadas. */
export interface FilaDesglose {
  fuente: Fuente;
  /** Consumo total en la unidad física de la fuente. */
  consumo: number;
  unidad: UnidadFisica;
  kgCO2e: number;
  /** Participación en el total, en %, con un decimal. */
  porcentaje: number;
  /** true si alguna actividad de la fuente fue estimada y no declarada. */
  incluyeEstimados: boolean;
}

export interface Equivalencia {
  descripcion: string;
  valor: number;
  unidad: string;
}

/** Salida del motor, lista para C4.1 (panel) y C4.2 (recomendaciones). */
export interface ResultadoHuella {
  /** kg CO2e totales. */
  total: number;
  /** Ordenado de mayor a menor emisión. */
  desglose: FilaDesglose[];
  /** Versión del catálogo con la que se calculó. */
  versionFactores: string;
  equivalencia: Equivalencia;
}

/** Medición guardada: lo necesario para recalcularla siempre igual. */
export interface Medicion {
  actividades: Actividad[];
  versionFactores: string;
  resultado: ResultadoHuella;
}
