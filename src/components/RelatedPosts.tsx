import Image from "next/image";
import Link from "next/link";
import type { CardPost } from "@/lib/queries";
import { mediaUrl } from "@/lib/storage";
import { formatDate, postHref } from "./PostCard";
import styles from "./RelatedPosts.module.css";

/** «Читайте также» — перелинковка материалов одной рубрики. */
export function RelatedPosts({ posts }: { posts: CardPost[] }) {
  if (posts.length === 0) return null;

  return (
    <aside className={styles.related}>
      <h2 className={styles.head}>Читайте также</h2>
      <div className={styles.grid}>
        {posts.map((post) => (
          <article key={post.id}>
            <Link href={postHref(post)} className={styles.link}>
              <div className={styles.imageWrap}>
                {post.cover ? (
                  <Image
                    src={mediaUrl(post.cover.key)}
                    alt={post.cover.alt ?? post.title}
                    fill
                    sizes="(max-width: 767px) 100vw, 33vw"
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
              <p className="label label--accent">{post.rubric?.title ?? post.section.title}</p>
              <h3 className={styles.title}>{post.title}</h3>
              <p className={`label ${styles.date}`}>{formatDate(post.publishedAt)}</p>
            </Link>
          </article>
        ))}
      </div>
    </aside>
  );
}
