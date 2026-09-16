"use client";

import type { AnalysisState, AnalyzeResponse, EmissionResult } from "@/lib/types";
import styles from "./ResultCard.module.css";

interface ResultCardProps {
  state: AnalysisState;
  onRetry: () => void;
}

const decimal = new Intl.NumberFormat("es", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const plain = new Intl.NumberFormat("es");

/**
 * Única salida de resultado. Enciende una rama por estado: en idle no
 * devuelve nada, así que la pantalla arranca limpia.
 */
export default function ResultCard({ state, onRetry }: ResultCardProps) {
  return (
    // El contenedor vive siempre para que aria-live anuncie los cambios;
    // en idle simplemente no tiene hijos.
    <div aria-live="polite" aria-busy={state.status === "loading"}>
      {state.status === "loading" ? <LoadingCard /> : null}
      {state.status === "error" ? (
        <ErrorCard message={state.message} onRetry={onRetry} />
      ) : null}
      {state.status === "success" ? <SuccessCard data={state.data} /> : null}
    </div>
  );
}

function SuccessCard({ data }: { data: AnalyzeResponse }) {
  return (
    <article className={styles.card}>
      <p className="eyebrow">Huella del día</p>
      <p className={styles.total}>
        <span className={styles.figure}>{decimal.format(data.totalKgCO2e)}</span>
        <span className={styles.unit}>kg CO₂e</span>
      </p>
      <p className={styles.summary}>{data.summary}</p>

      <div className={styles.breakdown}>
        <div className={styles.head}>
          <span className="eyebrow">Actividad</span>
          <span className="eyebrow">kg CO₂e</span>
        </div>
        {data.results.map((result, index) => (
          <Row
            key={result.activity.description}
            result={result}
            total={data.totalKgCO2e}
            index={index}
          />
        ))}
      </div>

      <p className={styles.note}>
        Estimación basada en factores de emisión promedio. Sirve para priorizar,
        no para reportar ante un regulador.
      </p>
    </article>
  );
}

/** Línea de recibo: el fondo verde mide su peso dentro del total. */
function Row({
  result,
  total,
  index,
}: {
  result: EmissionResult;
  total: number;
  /** Posición en la lista: escalona la entrada de las filas. */
  index: number;
}) {
  const share = total > 0 ? (result.kgCO2e / total) * 100 : 0;

  return (
    <div
      className={styles.row}
      style={{ "--index": index } as React.CSSProperties}
    >
      <span
        className={styles.fill}
        style={{ "--share": `${share}%` } as React.CSSProperties}
        aria-hidden="true"
      />
      <span className={styles.rowText}>
        <span className={styles.name}>{result.activity.description}</span>
        <span className={styles.detail}>
          {plain.format(result.activity.quantity)} {result.activity.unit} ×{" "}
          {result.factor} kg/{result.factorUnit}
        </span>
      </span>
      <span className={styles.rowValue}>
        {decimal.format(result.kgCO2e)}
        <span className="srOnly">, {Math.round(share)}% del total</span>
      </span>
    </div>
  );
}

function LoadingCard() {
  return (
    <div className={styles.skeleton}>
      <p className="eyebrow">Calculando</p>
      <div className={styles.boneFigure} />
      <div className={styles.boneLine} />
      <div className={styles.boneRow} />
      <div className={styles.boneRow} />
      <span className="srOnly">Calculando tu huella de carbono.</span>
    </div>
  );
}

function ErrorCard({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <article className={styles.error}>
      <p className={`eyebrow ${styles.errorEyebrow}`}>Sin resultado</p>
      <h2 className={styles.errorTitle}>No pudimos calcular tu huella</h2>
      <p className={styles.errorBody}>{message}</p>
      <button type="button" className={styles.retry} onClick={onRetry}>
        Volver a intentar
      </button>
    </article>
  );
}
