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
