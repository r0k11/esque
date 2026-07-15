import Image from "next/image";
import Link from "next/link";
import type { CardPost } from "@/lib/queries";
import { mediaUrl } from "@/lib/s3";
import { formatDate, postHref } from "./PostCard";
import styles from "./Hero.module.css";

export function Hero({ post }: { post: CardPost }) {
  return (
    <section className={`${styles.hero} rise`}>
      <Link href={postHref(post)} className={styles.link}>
        {post.cover && (
          <div className={styles.imageWrap}>
            <Image
              src={mediaUrl(post.cover.key)}
              alt={post.cover.alt ?? post.title}
              fill
              sizes="(max-width: 767px) 100vw, 66vw"
              preload
              placeholder={post.cover.blurDataUrl ? "blur" : "empty"}
              blurDataURL={post.cover.blurDataUrl ?? undefined}
              className={styles.image}
            />
          </div>
        )}
        <div className={styles.text}>
          <p className="label label--accent">{post.rubric?.title ?? post.section.title}</p>
          <h1 className={styles.title}>{post.title}</h1>
          {post.subtitle && <p className={styles.subtitle}>{post.subtitle}</p>}
          <p className={`label ${styles.date}`}>{formatDate(post.publishedAt)}</p>
        </div>
      </Link>
    </section>
  );
}
