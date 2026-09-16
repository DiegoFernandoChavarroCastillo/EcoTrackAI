import styles from "./Header.module.css";

/** Componente de UI puro: solo presentación. */
export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        {/* Hoja con nervadura: trazo fino, del mismo grosor que las reglas de la UI. */}
        <svg
          className={styles.mark}
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path
            d="M16.8 3.2c.8 6.9-2.2 11.6-7.4 12.7-2.3.5-4.4.1-5.9-1C3.2 8.2 8.1 3.6 15 3.1c.6 0 1.2 0 1.8.1z"
            strokeLinejoin="round"
          />
          <path d="M3 17c1-4.3 3.6-7.9 7.6-10" strokeLinecap="round" />
        </svg>
        <h1 className={styles.wordmark}>
          EcoTrack <em>AI</em>
        </h1>
      </div>
    </header>
  );
}
