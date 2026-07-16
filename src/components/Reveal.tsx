"use client";

import { useEffect, useRef } from "react";

/**
 * Появление элемента при попадании в зону видимости (fade + лёгкий подъём).
 * Класс переключаем через data-атрибут, а не состояние: без ре-рендера и лишнего JS.
 * Стили — глобальный класс .reveal-anim в globals.css (чтобы <noscript> мог его
 * перекрыть и контент оставался виден без JS). Reduced-motion учтён там же.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  /** Задержка в мс — для каскада плиток в сетке */
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            el.dataset.in = "true";
            io.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal-anim ${className ?? ""}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
