"use client";

import { useState } from "react";
import styles from "./ShareLinks.module.css";

/**
 * Кнопки «поделиться». Никаких сторонних виджетов: обычные ссылки на share-эндпоинты
 * соцсетей — ни трекеров, ни лишнего JS (у нас Lighthouse в критериях).
 * Facebook сознательно не берём: в России он недоступен, Telegram — основной канал.
 */
export function ShareLinks({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // буфер обмена недоступен (нет https или прав) — молча ничего не делаем
    }
  };

  return (
    <div className={styles.share}>
      <span className={styles.label}>Поделиться</span>
      <a
        className={styles.link}
        href={`https://t.me/share/url?url=${u}&text=${t}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        Telegram
      </a>
      <a
        className={styles.link}
        href={`https://vk.com/share.php?url=${u}&title=${t}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        ВКонтакте
      </a>
      <button className={styles.link} onClick={copy} type="button">
        {copied ? "Ссылка скопирована" : "Копировать ссылку"}
      </button>
    </div>
  );
}
