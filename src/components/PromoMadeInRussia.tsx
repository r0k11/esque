import Link from "next/link";
import styles from "./PromoMadeInRussia.module.css";

/**
 * Промо-блок запуска рубрики «Сделано в России».
 * Включается переменной окружения PROMO_MADE_IN_RUSSIA (позже — настройкой в админке).
 */
export function PromoMadeInRussia() {
  return (
    <section className={styles.promo}>
      <div className="container">
        <p className={`label ${styles.kicker}`}>Новая рубрика</p>
        <h2 className={styles.title}>
          <Link href="/fashion/made-in-russia">Сделано в России</Link>
        </h2>
        <p className={styles.text}>
          Съёмки коллекций российских дизайнеров — галереи в первый день показов.
        </p>
        <Link href="/fashion/made-in-russia" className={`label ${styles.cta}`}>
          Смотреть галереи
        </Link>
      </div>
    </section>
  );
}
