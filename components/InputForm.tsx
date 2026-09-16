"use client";

import styles from "./InputForm.module.css";

const MAX_LENGTH = 600;

interface InputFormProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  /** Bloquea el formulario mientras se calcula. */
  isLoading: boolean;
}

/**
 * Componente de presentación: recibe el valor y los manejadores por props.
 * No conoce el origen de los datos ni cómo se calcula nada.
 */
export default function InputForm({
  value,
  onChange,
  onSubmit,
  isLoading,
}: InputFormProps) {
  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div>
        <label className={`eyebrow ${styles.label}`} htmlFor="activities">
          Actividades del día
        </label>
        <textarea
          id="activities"
          name="activities"
          className={styles.field}
          value={value}
          maxLength={MAX_LENGTH}
          disabled={isLoading}
          placeholder="Hoy usamos 5 camionetas de reparto y gastamos 200kWh de luz"
          onChange={(event) => onChange(event.target.value)}
        />
      </div>

      <div className={styles.footer}>
        <span className={styles.count}>
          {value.length}/{MAX_LENGTH}
        </span>
        <button
          type="submit"
          className={styles.submit}
          disabled={isLoading || value.trim().length === 0}
        >
          {isLoading ? "Calculando…" : "Calcular huella de carbono"}
        </button>
      </div>
    </form>
  );
}
