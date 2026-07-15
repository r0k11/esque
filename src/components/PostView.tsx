import Image from "next/image";
import type { FullPost } from "@/lib/queries";
import { getMediaByIds } from "@/lib/queries";
import { collectMediaIds, parseBlocks } from "@/lib/blocks";
import { mediaUrl } from "@/lib/s3";
import { ArticleBody } from "./ArticleBody";
import { formatDate } from "./PostCard";
import styles from "./PostView.module.css";

export async function PostView({ post }: { post: FullPost }) {
  const blocks = parseBlocks(post.content);
  const mediaList = await getMediaByIds(collectMediaIds(blocks));
  const media = new Map(mediaList.map((m) => [m.id, m]));

  return (
    <main className="container rise">
      <article>
        <header className={styles.header}>
          <p className="label label--accent">
            {post.rubric?.title ?? post.section.title}
          </p>
          <h1 className={styles.title}>{post.title}</h1>
          {post.subtitle && <p className={styles.subtitle}>{post.subtitle}</p>}
          <p className={`label ${styles.meta}`}>
            {post.author} · {formatDate(post.publishedAt)}
          </p>
        </header>

        {post.cover && (
          <div className={styles.cover}>
            <Image
              src={mediaUrl(post.cover.key)}
              alt={post.cover.alt ?? post.title}
              width={post.cover.width}
              height={post.cover.height}
              sizes="(max-width: 767px) 100vw, 1080px"
              preload
              placeholder={post.cover.blurDataUrl ? "blur" : "empty"}
              blurDataURL={post.cover.blurDataUrl ?? undefined}
              className={styles.coverImage}
            />
          </div>
        )}

        <ArticleBody blocks={blocks} media={media} />
      </article>
    </main>
  );
}
