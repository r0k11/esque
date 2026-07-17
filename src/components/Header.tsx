import Link from "next/link";
import { SECTIONS } from "@/lib/structure";
import { MobileMenu } from "./MobileMenu";
import styles from "./Header.module.css";

export function Header() {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.top}`}>
        <MobileMenu />
        <Link href="/" className={styles.logo} aria-label="ESQUE — на главную">
          ESQUE
        </Link>
        <Link href="/search" className={styles.search} aria-label="Поиск по журналу">
          <span className={styles.searchRing}>
            <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true" focusable="false">
              <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
              <line x1="12.8" y1="12.8" x2="17" y2="17" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </span>
        </Link>
      </div>
      <nav className={`container ${styles.nav}`} aria-label="Разделы">
        {SECTIONS.map((s) => (
          <div key={s.slug} className={styles.navItem}>
            <Link href={`/${s.slug}`} className={styles.navLink}>
              {s.title}
            </Link>
            {s.rubrics.length > 0 && (
              <div className={styles.dropdown}>
                <div className={styles.dropdownInner}>
                  {s.rubrics.map((r) => (
                    <Link
                      key={r.slug}
                      href={`/${s.slug}/${r.slug}`}
                      className={styles.dropdownLink}
                    >
                      {r.title}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </nav>
    </header>
  );
}
