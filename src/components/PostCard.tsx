import Image from "next/image";
import Link from "next/link";
import type { CardPost } from "@/lib/queries";
import { mediaUrl } from "@/lib/s3";
import styles from "./PostCard.module.css";

export function postHref(p: CardPost) {
  const rubric = p.rubric ? `/${p.rubric.slug}` : "";
  return `/${p.section.slug}${rubric}/${p.slug}`;
}

export function formatDate(iso: string | null) {
  if (!iso) return "";
  // Год обязателен: в архиве материалы с 2019 года, без него дата вводит в заблуждение.
  // Канцелярское «г.» после года убираем — в журнале оно ни к чему.
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
    .format(new Date(iso))
    .replace(/\s*г\.$/, "");
}

type Props = {
  post: CardPost;
  /** Соотношение сторон плитки, например "4 / 5" */
  aspect: string;
  /** Значение sizes для next/image под ширину плитки в сетке */
  sizes: string;
  preload?: boolean;
};

export function PostCard({ post, aspect, sizes, preload }: Props) {
  return (
    <article className={styles.card}>
      <Link href={postHref(post)} className={styles.link}>
        {/* Плитка всегда занимает своё место в мозаике: у части архивных
            материалов фото нет вовсе — показываем сдержанную заглушку. */}
        <div className={styles.imageWrap} style={{ aspectRatio: aspect }}>
          {post.cover ? (
            <Image
              src={mediaUrl(post.cover.key)}
              alt={post.cover.alt ?? post.title}
              fill
              sizes={sizes}
              preload={preload}
              placeholder={post.cover.blurDataUrl ? "blur" : "empty"}
              blurDataURL={post.cover.blurDataUrl ?? undefined}
              className={styles.image}
            />
          ) : (
            <span className={styles.placeholder} aria-hidden="true">
              ESQUE
            </span>
          )}
        </div>
        <p className="label label--accent">
          {post.rubric?.title ?? post.section.title}
          {post.type === "GALLERY" && <span className={styles.badge}>Галерея</span>}
        </p>
        <h3 className={styles.title}>{post.title}</h3>
        {post.subtitle && <p className={styles.subtitle}>{post.subtitle}</p>}
      </Link>
    </article>
  );
}
