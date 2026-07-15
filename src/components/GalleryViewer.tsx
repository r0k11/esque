"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./GalleryViewer.module.css";

export type GalleryViewerItem = {
  url: string;
  width: number;
  height: number;
  alt: string;
  caption: string | null;
  blurDataUrl: string | null;
};

/**
 * Галерея материала: мозаика превью + полноэкранный просмотр.
 * Листание — нативный scroll-snap: свайпы на телефоне, стрелки и клавиши на десктопе.
 */
export function GalleryViewer({ items }: { items: GalleryViewerItem[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const [current, setCurrent] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const show = (i: number) => {
    setOpen(i);
    setCurrent(i);
  };
  const close = useCallback(() => setOpen(null), []);

  const scrollToSlide = useCallback((i: number, behavior: ScrollBehavior) => {
    const el = scrollerRef.current;
    el?.scrollTo({ left: i * el.clientWidth, behavior });
  }, []);

  // при открытии — сразу к выбранному кадру, блокируем прокрутку страницы
  useEffect(() => {
    if (open === null) return;
    scrollToSlide(open, "instant");
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open, scrollToSlide]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") scrollToSlide(Math.min(current + 1, items.length - 1), "smooth");
      if (e.key === "ArrowLeft") scrollToSlide(Math.max(current - 1, 0), "smooth");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, current, items.length, close, scrollToSlide]);

  const onScroll = () => {
    const el = scrollerRef.current;
    if (el) setCurrent(Math.round(el.scrollLeft / el.clientWidth));
  };

  return (
    <div className={styles.gallery}>
      <div className={styles.thumbs}>
        {items.map((item, i) => (
          <button key={i} className={styles.thumb} onClick={() => show(i)} aria-label={`Открыть фото ${i + 1}`}>
            <Image
              src={item.url}
              alt={item.alt}
              fill
              sizes="(max-width: 767px) 50vw, 33vw"
              placeholder={item.blurDataUrl ? "blur" : "empty"}
              blurDataURL={item.blurDataUrl ?? undefined}
              className={styles.thumbImage}
            />
          </button>
        ))}
      </div>

      {/* Портал: предки с animation/transform не должны становиться
          containing block для position: fixed */}
      {open !== null &&
        createPortal(
          <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Просмотр галереи">
          <button className={styles.close} onClick={close} aria-label="Закрыть">
            ✕
          </button>
          <div className={styles.scroller} ref={scrollerRef} onScroll={onScroll}>
            {items.map((item, i) => (
              <figure key={i} className={styles.slide}>
                <div className={styles.slideImageWrap}>
                  <Image
                    src={item.url}
                    alt={item.alt}
                    fill
                    sizes="100vw"
                    className={styles.slideImage}
                  />
                </div>
                {item.caption && (
                  <figcaption className={styles.slideCaption}>{item.caption}</figcaption>
                )}
              </figure>
            ))}
          </div>
          {current > 0 && (
            <button
              className={`${styles.arrow} ${styles.prev}`}
              onClick={() => scrollToSlide(current - 1, "smooth")}
              aria-label="Предыдущее фото"
            >
              ←
            </button>
          )}
          {current < items.length - 1 && (
            <button
              className={`${styles.arrow} ${styles.next}`}
              onClick={() => scrollToSlide(current + 1, "smooth")}
              aria-label="Следующее фото"
            >
              →
            </button>
          )}
            <p className={styles.counter}>
              {current + 1} / {items.length}
            </p>
          </div>,
          document.body
        )}
    </div>
  );
}
