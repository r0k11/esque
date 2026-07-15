import Link from "next/link";
import { SECTIONS } from "@/lib/structure";
import styles from "./Header.module.css";

export function Header() {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.top}`}>
        {/* Мобильное меню на <details> — работает без JS */}
        <details className={styles.burger}>
          <summary aria-label="Меню">
            <span className={styles.burgerIcon} />
          </summary>
          <nav className={styles.mobileNav}>
            {SECTIONS.map((s) => (
              <Link key={s.slug} href={`/${s.slug}`}>
                {s.title}
              </Link>
            ))}
          </nav>
        </details>
        <Link href="/" className={styles.logo} aria-label="ESQUE — на главную">
          ESQUE
        </Link>
      </div>
      <nav className={`container ${styles.nav}`} aria-label="Разделы">
        {SECTIONS.map((s) => (
          <Link key={s.slug} href={`/${s.slug}`} className={styles.navLink}>
            {s.title}
          </Link>
        ))}
      </nav>
    </header>
  );
}
