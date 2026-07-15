"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import type { Block } from "@/lib/blocks";
import type { PostStatus, PostType } from "@/generated/prisma/enums";
import { saveDraft, publishDraft, deletePost, type DraftPayload } from "@/app/admin/actions";
import { BlockEditor } from "./BlockEditor";
import forms from "./forms.module.css";
import styles from "./Editor.module.css";

export type EditorMedia = { id: string; url: string; width: number; height: number };

type SectionOpt = { id: string; title: string; rubrics: { id: string; title: string }[] };

type Props = {
  postId: string;
  type: PostType;
  canPublish: boolean;
  initial: {
    title: string;
    subtitle: string;
    blocks: Block[];
    sectionId: string;
    rubricId: string | null;
    coverId: string | null;
    seoTitle: string;
    seoDescription: string;
    scheduledAt: string;
    status: PostStatus;
  };
  sections: SectionOpt[];
  media: Record<string, EditorMedia>;
};

const TYPE_LABEL: Record<PostType, string> = {
  ARTICLE: "Статья",
  GALLERY: "Галерея",
  INTERVIEW: "Интервью",
  NEWS: "Новость",
  SPECIAL: "Спецпроект",
};

export function Editor({ postId, type, canPublish, initial, sections, media }: Props) {
  const [title, setTitle] = useState(initial.title);
  const [subtitle, setSubtitle] = useState(initial.subtitle);
  const [blocks, setBlocks] = useState<Block[]>(initial.blocks);
  const [sectionId, setSectionId] = useState(initial.sectionId);
  const [rubricId, setRubricId] = useState<string | null>(initial.rubricId);
  const [coverId, setCoverId] = useState<string | null>(initial.coverId);
  const [seoTitle, setSeoTitle] = useState(initial.seoTitle);
  const [seoDescription, setSeoDescription] = useState(initial.seoDescription);
  const [scheduledAt, setScheduledAt] = useState(initial.scheduledAt);

  const [mediaMap, setMediaMap] = useState<Record<string, EditorMedia>>(media);
  const [library, setLibrary] = useState<string[]>(Object.keys(media));
  const [uploading, setUploading] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const activeSection = sections.find((s) => s.id === sectionId);

  const buildPayload = useCallback(
    (): DraftPayload => ({
      title,
      subtitle,
      content: blocks,
      sectionId,
      rubricId,
      coverId,
      seoTitle,
      seoDescription,
      scheduledAt: scheduledAt || null,
    }),
    [title, subtitle, blocks, sectionId, rubricId, coverId, seoTitle, seoDescription, scheduledAt]
  );

  // --- Автосохранение (дебаунс 1200 мс), пропускаем первый рендер ---
  const firstRender = useRef(true);
  const payload = buildPayload();
  const snapshot = JSON.stringify(payload);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setSaveState("saving");
    const t = setTimeout(async () => {
      await saveDraft(postId, JSON.parse(snapshot));
      setSaveState("saved");
    }, 1200);
    return () => clearTimeout(t);
  }, [snapshot, postId]);

  // --- Блоки ---
  const addBlock = (b: Block) => setBlocks((prev) => [...prev, b]);
  const updateBlock = (i: number, next: Block) =>
    setBlocks((prev) => prev.map((b, idx) => (idx === i ? next : b)));
  const removeBlock = (i: number) => setBlocks((prev) => prev.filter((_, idx) => idx !== i));
  const moveBlock = (from: number, to: number) =>
    setBlocks((prev) => {
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });

  // --- Загрузка фото ---
  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) return [] as string[];
    setUploading(true);
    try {
      const fd = new FormData();
      list.forEach((f) => fd.append("files", f));
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error("upload failed");
      const data: { media: EditorMedia[] } = await res.json();
      setMediaMap((prev) => {
        const next = { ...prev };
        data.media.forEach((m) => (next[m.id] = m));
        return next;
      });
      const ids = data.media.map((m) => m.id);
      setLibrary((prev) => [...prev, ...ids]);
      return ids;
    } catch {
      setError("Не удалось загрузить фото");
      return [] as string[];
    } finally {
      setUploading(false);
    }
  }, []);

  const galleryFromLibrary = () => {
    if (library.length === 0) return;
    addBlock({ type: "gallery", items: library.map((id) => ({ mediaId: id })) });
  };

  const addImageToText = (id: string) => addBlock({ type: "image", mediaId: id });

  const addToGallery = (id: string) => {
    setBlocks((prev) => {
      const idx = prev.map((b) => b.type).lastIndexOf("gallery");
      if (idx === -1) return [...prev, { type: "gallery", items: [{ mediaId: id }] }];
      return prev.map((b, i) =>
        i === idx && b.type === "gallery"
          ? { ...b, items: [...b.items, { mediaId: id }] }
          : b
      );
    });
  };

  // --- Действия ---
  const doPreview = () => {
    startTransition(async () => {
      await saveDraft(postId, buildPayload());
      window.open(`/admin/preview/${postId}`, "_blank");
    });
  };

  const doPublish = () => {
    setError(null);
    startTransition(async () => {
      const res = await publishDraft(postId, buildPayload());
      if (res?.error) setError(res.error);
    });
  };

  const doDelete = () => {
    if (!confirm("Удалить материал безвозвратно?")) return;
    startTransition(() => deletePost(postId));
  };

  const cover = coverId ? mediaMap[coverId] : null;

  return (
    <div className={styles.editor}>
      {/* Левая колонка — сборка материала */}
      <div className={styles.main}>
        <div className={styles.stepHead}>
          <span className={styles.stepNo}>1</span>
          <span className={styles.stepLabel}>Заголовок · {TYPE_LABEL[type]}</span>
        </div>
        <input
          className={styles.titleInput}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Заголовок материала"
        />
        <textarea
          className={styles.leadInput}
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          placeholder="Лид — короткое вступление (по желанию)"
          rows={2}
        />

        <div className={styles.stepHead}>
          <span className={styles.stepNo}>2</span>
          <span className={styles.stepLabel}>Блоки материала</span>
        </div>

        <div className={styles.blocks}>
          {blocks.map((block, i) => (
            <BlockEditor
              key={i}
              index={i}
              block={block}
              media={mediaMap}
              onChange={(b) => updateBlock(i, b)}
              onRemove={() => removeBlock(i)}
              onMove={(dir) => moveBlock(i, i + dir)}
              onReorder={(from, to) => moveBlock(from, to)}
            />
          ))}
        </div>

        <div className={styles.addBar}>
          <button className={forms.ghost} onClick={() => addBlock({ type: "paragraph", html: "" })}>
            + Абзац
          </button>
          <button className={forms.ghost} onClick={() => addBlock({ type: "heading", text: "" })}>
            + Заголовок
          </button>
          <button className={forms.ghost} onClick={() => addBlock({ type: "quote", text: "" })}>
            + Цитата
          </button>
          <button className={forms.ghost} onClick={() => addBlock({ type: "qa", question: "", answer: "" })}>
            + Вопрос-ответ
          </button>
          <button className={forms.ghost} onClick={() => addBlock({ type: "embed", html: "" })}>
            + Видео / embed
          </button>
        </div>
      </div>

      {/* Правая колонка — медиа и публикация */}
      <aside className={styles.side}>
        <div className={styles.saveRow}>
          <span className={styles[`save_${saveState}`]}>
            {saveState === "saving" ? "Сохраняем…" : saveState === "saved" ? "Сохранено" : "Черновик"}
          </span>
        </div>

        {/* Панель загрузки фото */}
        <div className={styles.panel}>
          <p className={forms.label}>Фото</p>
          <Dropzone onFiles={uploadFiles} uploading={uploading} />
          {library.length > 0 && (
            <>
              <div className={styles.tray}>
                {library.map((id) => {
                  const m = mediaMap[id];
                  if (!m) return null;
                  return (
                    <div key={id} className={`${styles.thumb} ${coverId === id ? styles.thumbCover : ""}`}>
                      <Image src={m.url} alt="" fill sizes="80px" className={styles.thumbImg} />
                      <div className={styles.thumbActions}>
                        <button title="Сделать обложкой" onClick={() => setCoverId(id)}>О</button>
                        <button title="Вставить в текст" onClick={() => addImageToText(id)}>Ф</button>
                        <button title="Добавить в галерею" onClick={() => addToGallery(id)}>Г</button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button className={forms.ghost} onClick={galleryFromLibrary} style={{ marginTop: "var(--sp-3)" }}>
                Собрать галерею из всех фото
              </button>
            </>
          )}
        </div>

        {/* Публикация */}
        <div className={styles.panel}>
          <div className={styles.stepHead}>
            <span className={styles.stepNo}>3</span>
            <span className={styles.stepLabel}>Рубрика и обложка</span>
          </div>

          <label className={forms.label}>Раздел</label>
          <select
            className={forms.select}
            value={sectionId}
            onChange={(e) => {
              setSectionId(e.target.value);
              setRubricId(null);
            }}
          >
            {sections.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>

          {activeSection && activeSection.rubrics.length > 0 && (
            <>
              <label className={forms.label} style={{ marginTop: "var(--sp-4)" }}>Рубрика</label>
              <select
                className={forms.select}
                value={rubricId ?? ""}
                onChange={(e) => setRubricId(e.target.value || null)}
              >
                <option value="">— без рубрики —</option>
                {activeSection.rubrics.map((r) => (
                  <option key={r.id} value={r.id}>{r.title}</option>
                ))}
              </select>
            </>
          )}

          <label className={forms.label} style={{ marginTop: "var(--sp-4)" }}>Обложка</label>
          {cover ? (
            <div className={styles.coverPreview}>
              <Image src={cover.url} alt="" fill sizes="260px" className={styles.thumbImg} />
              <button className={styles.coverClear} onClick={() => setCoverId(null)}>Убрать</button>
            </div>
          ) : (
            <p className={styles.coverHint}>Наведите на фото слева и нажмите «О».</p>
          )}

          <label className={forms.label} style={{ marginTop: "var(--sp-4)" }}>
            Отложенная публикация
          </label>
          <input
            className={forms.input}
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
        </div>

        {/* SEO */}
        <details className={styles.panel}>
          <summary className={styles.seoSummary}>SEO (по желанию)</summary>
          <label className={forms.label} style={{ marginTop: "var(--sp-4)" }}>Title</label>
          <input className={forms.input} value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} />
          <label className={forms.label} style={{ marginTop: "var(--sp-4)" }}>Description</label>
          <textarea
            className={forms.textarea}
            value={seoDescription}
            onChange={(e) => setSeoDescription(e.target.value)}
            rows={2}
          />
        </details>

        {error && <p className={forms.error}>{error}</p>}

        <div className={styles.actions}>
          <button className={forms.ghost} onClick={doPreview} disabled={pending}>
            Превью
          </button>
          {canPublish ? (
            <button className={forms.primary} onClick={doPublish} disabled={pending}>
              {scheduledAt ? "Запланировать" : "Опубликовать"}
            </button>
          ) : (
            <span className={styles.noPublish}>Публикация — за редактором</span>
          )}
        </div>

        <button className={styles.delete} onClick={doDelete} disabled={pending}>
          Удалить материал
        </button>
      </aside>
    </div>
  );
}

function Dropzone({
  onFiles,
  uploading,
}: {
  onFiles: (f: FileList | File[]) => void;
  uploading: boolean;
}) {
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div
      className={`${styles.drop} ${over ? styles.dropOver : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => e.target.files && onFiles(e.target.files)}
      />
      {uploading ? "Загружаем…" : "Перетащите фото сюда или нажмите"}
    </div>
  );
}
