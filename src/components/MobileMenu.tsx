"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SECTIONS } from "@/lib/structure";
import styles from "./MobileMenu.module.css";

export function MobileMenu() {
  const pathname = usePathname();
  // Состояние привязано к маршруту: при переходе pathname меняется и меню
  // автоматически закрывается (деривация в рендере — без эффекта и без гонки
  // размонтирования ссылки, которая гасила бы навигацию).
  const [state, setState] = useState({ path: pathname, open: false });
  const open = state.path === pathname && state.open;
  const setOpen = (v: boolean) => setState({ path: pathname, open: v });

  // пока меню открыто, страница под ним не прокручивается.
  // Блокируем html, а не body: overflow на body делает его скролл-контейнером,
  // и sticky-шапка перестаёт липнуть к экрану.
  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  return (
    <div className={styles.root}>
      <button
        className={styles.burger}
        onClick={() => setOpen(!open)}
        aria-label={open ? "Закрыть меню" : "Меню"}
        aria-expanded={open}
      >
        <span className={`${styles.icon} ${open ? styles.iconOpen : ""}`} />
      </button>

      {open && (
        <nav className={styles.panel} aria-label="Разделы">
          {SECTIONS.map((s) =>
            s.rubrics.length === 0 ? (
              <Link key={s.slug} href={`/${s.slug}`} className={styles.sectionLink}>
                {s.title}
              </Link>
            ) : (
              <details key={s.slug} className={styles.group}>
                <summary className={styles.summary}>{s.title}</summary>
                <div className={styles.rubrics}>
                  <Link href={`/${s.slug}`}>Все материалы</Link>
                  {s.rubrics.map((r) => (
                    <Link key={r.slug} href={`/${s.slug}/${r.slug}`}>
                      {r.title}
                    </Link>
                  ))}
                </div>
              </details>
            )
          )}
        </nav>
      )}
    </div>
  );
}
