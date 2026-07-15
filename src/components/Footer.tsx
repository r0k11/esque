import Link from "next/link";
import { SECTIONS } from "@/lib/structure";
import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.brand}>
          <span className={styles.logo}>ESQUE</span>
          <p className={styles.tagline}>Онлайн-журнал о моде, красоте и культуре</p>
        </div>
        <nav className={styles.nav} aria-label="Разделы (подвал)">
          {SECTIONS.map((s) => (
            <Link key={s.slug} href={`/${s.slug}`}>
              {s.title}
            </Link>
          ))}
        </nav>
        <p className={styles.copy}>
          © {new Date().getFullYear()} Esque.su · <Link href="/rss.xml">RSS</Link>
        </p>
      </div>
    </footer>
  );
}
