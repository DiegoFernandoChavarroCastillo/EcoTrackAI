"use client";

import type { AnalysisState } from "@/lib/types";
import styles from "./StatePreview.module.css";

const STATUSES = ["idle", "loading", "success", "error"] as const;

interface StatePreviewProps {
  current: AnalysisState["status"];
  onSelect: (status: AnalysisState["status"]) => void;
}

/**
 * Conmutador manual de estados para revisar la maqueta.
 * Solo se monta en desarrollo: no llega al bundle de producción.
 */
export default function StatePreview({
  current,
  onSelect,
}: StatePreviewProps) {
  if (process.env.NODE_ENV === "production") return null;

  return (
    <section className={styles.panel}>
      <p className="eyebrow">Vista de estados · solo desarrollo</p>
      <div className={styles.group}>
        {STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            className={styles.chip}
            aria-pressed={current === status}
            onClick={() => onSelect(status)}
          >
            {status}
          </button>
        ))}
      </div>
    </section>
  );
}
