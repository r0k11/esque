"use client";

import Image from "next/image";
import type { Block } from "@/lib/blocks";
import type { EditorMedia } from "./Editor";
import { ParagraphField } from "./ParagraphField";
import forms from "./forms.module.css";
import styles from "./Editor.module.css";

const TITLES: Record<Block["type"], string> = {
  lead: "Лид",
  paragraph: "Абзац",
  heading: "Заголовок",
  quote: "Цитата",
  image: "Фото",
  gallery: "Галерея",
  embed: "Видео / embed",
  qa: "Вопрос — ответ",
};

type Props = {
  index: number;
  block: Block;
  media: Record<string, EditorMedia>;
  onChange: (b: Block) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  onReorder: (from: number, to: number) => void;
};

export function BlockEditor({ index, block, media, onChange, onRemove, onMove, onReorder }: Props) {
  return (
    <div
      className={styles.block}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const from = Number(e.dataTransfer.getData("text/plain"));
        if (!Number.isNaN(from)) onReorder(from, index);
      }}
    >
      <div className={styles.blockHead}>
        <span
          className={styles.handle}
          draggable
          onDragStart={(e) => e.dataTransfer.setData("text/plain", String(index))}
          title="Перетащить"
        >
          ⠿
        </span>
        <span className={styles.blockType}>{TITLES[block.type]}</span>
        <span className={styles.blockTools}>
          <button onClick={() => onMove(-1)} title="Выше">↑</button>
          <button onClick={() => onMove(1)} title="Ниже">↓</button>
          <button onClick={onRemove} title="Удалить">✕</button>
        </span>
      </div>

      <div className={styles.blockBody}>
        {block.type === "paragraph" && (
          <ParagraphField value={block.html} onChange={(html) => onChange({ ...block, html })} />
        )}

        {block.type === "lead" && (
          <textarea
            className={forms.textarea}
            value={block.text}
            onChange={(e) => onChange({ ...block, text: e.target.value })}
            rows={2}
          />
        )}

        {block.type === "heading" && (
          <input
            className={forms.input}
            value={block.text}
            onChange={(e) => onChange({ ...block, text: e.target.value })}
            placeholder="Подзаголовок"
          />
        )}

        {block.type === "quote" && (
          <div className={forms.stack}>
            <textarea
              className={forms.textarea}
              value={block.text}
              onChange={(e) => onChange({ ...block, text: e.target.value })}
              placeholder="Текст цитаты"
              rows={2}
            />
            <input
              className={forms.input}
              value={block.author ?? ""}
              onChange={(e) => onChange({ ...block, author: e.target.value })}
              placeholder="Автор цитаты (по желанию)"
            />
          </div>
        )}

        {block.type === "embed" && (
          <textarea
            className={forms.textarea}
            value={block.html}
            onChange={(e) => onChange({ ...block, html: e.target.value })}
            placeholder="Код вставки (iframe видео, соцсети)"
            rows={3}
          />
        )}

        {block.type === "qa" && (
          <div className={forms.stack}>
            <input
              className={forms.input}
              value={block.question}
              onChange={(e) => onChange({ ...block, question: e.target.value })}
              placeholder="Вопрос"
            />
            <textarea
              className={forms.textarea}
              value={block.answer}
              onChange={(e) => onChange({ ...block, answer: e.target.value })}
              placeholder="Ответ"
              rows={3}
            />
          </div>
        )}

        {block.type === "image" && (
          <div className={styles.blockImage}>
            {media[block.mediaId] && (
              <Image
                src={media[block.mediaId].url}
                alt=""
                width={120}
                height={90}
                className={styles.blockImageThumb}
              />
            )}
            <input
              className={forms.input}
              value={block.caption ?? ""}
              onChange={(e) => onChange({ ...block, caption: e.target.value })}
              placeholder="Подпись к фото"
            />
          </div>
        )}

        {block.type === "gallery" && (
          <div className={styles.galleryEdit}>
            <p className={styles.galleryCount}>{block.items.length} фото</p>
            <div className={styles.galleryThumbs}>
              {block.items.map((item, j) => (
                <div key={j} className={styles.galleryItem}>
                  <div className={styles.galleryImageBox}>
                    {media[item.mediaId] && (
                      <Image
                        src={media[item.mediaId].url}
                        alt=""
                        fill
                        sizes="90px"
                        className={styles.thumbImg}
                      />
                    )}
                    <button
                      className={styles.galleryRemove}
                      title="Убрать"
                      onClick={() =>
                        onChange({ ...block, items: block.items.filter((_, k) => k !== j) })
                      }
                    >
                      ✕
                    </button>
                  </div>
                  <input
                    className={styles.galleryCaption}
                    value={item.caption ?? ""}
                    onChange={(e) =>
                      onChange({
                        ...block,
                        items: block.items.map((it, k) =>
                          k === j ? { ...it, caption: e.target.value } : it
                        ),
                      })
                    }
                    placeholder="Подпись"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
