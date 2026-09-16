import Analyzer from "./analyzer";
import styles from "./page.module.css";

export default function HomePage() {
  return (
    <div className={styles.stack}>
      <section>
        <p className="eyebrow">Huella de carbono</p>
        <h2 className={styles.headline}>
          Cuéntanos cómo fue el día en tu negocio.
        </h2>
        <p className={styles.lede}>
          Escríbelo como se lo contarías a alguien. Nosotros lo traducimos a
          kilos de CO₂ y te mostramos qué pesa más.
        </p>
      </section>
      <Analyzer />
    </div>
  );
}
