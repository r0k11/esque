"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { SECTIONS } from "@/lib/structure";
import styles from "./SideMenu.module.css";

export function SideMenu() {
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

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setState((s) => ({ ...s, open: false }));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        className={styles.burger}
        onClick={() => setOpen(!open)}
        aria-label="Меню"
        aria-expanded={open}
      >
        <span className={styles.icon} />
      </button>

      {/* Портал в body: position: fixed ломается, если у предка есть transform
          или filter — уже наступали на это с полноэкранной галереей. */}
      {open &&
        createPortal(
          <div className={styles.overlay}>
            <button
              className={styles.backdrop}
              onClick={() => setOpen(false)}
              aria-label="Закрыть меню"
              tabIndex={-1}
            />
            <nav className={styles.panel} aria-label="Разделы">
              <button className={styles.close} onClick={() => setOpen(false)} aria-label="Закрыть меню">
                ✕
              </button>
              <div className={styles.links}>
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
              </div>
            </nav>
          </div>,
          document.body
        )}
    </>
  );
}
