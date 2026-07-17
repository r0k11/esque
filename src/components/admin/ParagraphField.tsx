"use client";

import { useLayoutEffect, useRef, useState } from "react";
import forms from "./forms.module.css";
import styles from "./Editor.module.css";

type Props = {
  value: string;
  onChange: (html: string) => void;
};

type Tool = {
  label: string;
  title: string;
  before: string;
  after: string;
  /** Буква для Ctrl+<key> — как в Word: Ctrl+B/I/U. */
  key?: string;
  className?: string;
};

const TOOLS: Tool[] = [
  { label: "Ж", title: "Жирный (Ctrl+B)", before: "<strong>", after: "</strong>", key: "b", className: "toolBold" },
  { label: "К", title: "Курсив (Ctrl+I)", before: "<em>", after: "</em>", key: "i", className: "toolItalic" },
  { label: "Ч", title: "Подчёркнутый (Ctrl+U)", before: "<u>", after: "</u>", key: "u", className: "toolUnderline" },
  { label: "x²", title: "Надстрочный", before: "<sup>", after: "</sup>" },
  { label: "x₂", title: "Подстрочный", before: "<sub>", after: "</sub>" },
];

/**
 * Абзац хранит HTML, поэтому поле остаётся обычной textarea, а кнопки лишь
 * оборачивают выделение в теги. Набор тегов — из белого списка sanitizeInline:
 * всё, что не в нём, санитайзер вырежет при сохранении.
 */
export function ParagraphField({ value, onChange }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  // Выделение после правки восстанавливаем сами: значение идёт через React,
  // и браузер к моменту ре-рендера уже сбросил каретку в конец.
  const pending = useRef<[number, number] | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkHref, setLinkHref] = useState("");

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !pending.current) return;
    const [start, end] = pending.current;
    pending.current = null;
    el.focus();
    el.setSelectionRange(start, end);
  });

  const surround = (before: string, after: string) => {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end } = el;
    onChange(value.slice(0, start) + before + value.slice(start, end) + after + value.slice(end));
    // Пустое выделение — ставим каретку между тегами, иначе оставляем текст выделенным
    pending.current =
      start === end
        ? [start + before.length, start + before.length]
        : [start + before.length, end + before.length];
  };

  const insert = (text: string) => {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end } = el;
    onChange(value.slice(0, start) + text + value.slice(end));
    pending.current = [start + text.length, start + text.length];
  };

  const applyLink = () => {
    const href = linkHref.trim();
    setLinkOpen(false);
    setLinkHref("");
    if (!href) return;
    // Кавычки в href сломали бы атрибут; схемы фильтрует sanitizeInline при сохранении
    surround(`<a href="${href.replace(/"/g, "&quot;")}">`, "</a>");
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!e.ctrlKey && !e.metaKey) return;
    const tool = TOOLS.find((t) => t.key && t.key === e.key.toLowerCase());
    if (!tool) return;
    e.preventDefault();
    surround(tool.before, tool.after);
  };

  return (
    <div>
      <div className={styles.toolbar}>
        {TOOLS.map((t) => (
          <button
            key={t.label}
            type="button"
            title={t.title}
            className={`${styles.tool} ${t.className ? styles[t.className] : ""}`}
            // mousedown, а не click: click успевает снять выделение в textarea
            onMouseDown={(e) => {
              e.preventDefault();
              surround(t.before, t.after);
            }}
          >
            {t.label}
          </button>
        ))}
        <button
          type="button"
          title="Ссылка"
          className={styles.tool}
          onMouseDown={(e) => {
            e.preventDefault();
            setLinkOpen(true);
          }}
        >
          Ссылка
        </button>
        <button
          type="button"
          title="Перенос строки внутри абзаца"
          className={styles.tool}
          onMouseDown={(e) => {
            e.preventDefault();
            insert("<br />");
          }}
        >
          ↵
        </button>
      </div>

      {linkOpen && (
        <div className={styles.linkRow}>
          <input
            className={forms.input}
            value={linkHref}
            autoFocus
            placeholder="https://… или /fashion/interview/slug"
            onChange={(e) => setLinkHref(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyLink();
              }
              if (e.key === "Escape") setLinkOpen(false);
            }}
          />
          <button type="button" className={forms.ghost} onMouseDown={(e) => e.preventDefault()} onClick={applyLink}>
            Вставить
          </button>
        </div>
      )}

      <textarea
        ref={ref}
        className={forms.textarea}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Текст абзаца"
        rows={4}
      />
    </div>
  );
}
