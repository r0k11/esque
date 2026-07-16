import Image from "next/image";
import type { FullPost } from "@/lib/queries";
import { getMediaByIds, getMediaByIdsFresh } from "@/lib/queries";
import { collectMediaIds, parseBlocks } from "@/lib/blocks";
import { mediaUrl } from "@/lib/s3";
import { absolute, jsonLdScript, SITE_NAME } from "@/lib/seo";
import { ArticleBody } from "./ArticleBody";
import { Breadcrumbs, type Crumb } from "./Breadcrumbs";
import { formatDate, postHref } from "./PostCard";
import styles from "./PostView.module.css";

export async function PostView({ post, preview }: { post: FullPost; preview?: boolean }) {
  const blocks = parseBlocks(post.content);
  const ids = collectMediaIds(blocks);
  const mediaList = preview ? await getMediaByIdsFresh(ids) : await getMediaByIds(ids);
  const media = new Map(mediaList.map((m) => [m.id, m]));

  const crumbs: Crumb[] = [
    { name: "Главная", href: "/" },
    { name: post.section.title, href: `/${post.section.slug}` },
    ...(post.rubric
      ? [{ name: post.rubric.title, href: `/${post.section.slug}/${post.rubric.slug}` }]
      : []),
    { name: post.title, href: postHref(post) },
  ];

  const coverUrl = post.cover ? absolute(mediaUrl(post.cover.key)) : undefined;
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": post.type === "NEWS" ? "NewsArticle" : "Article",
    headline: post.title,
    description: post.seoDescription ?? post.subtitle ?? undefined,
    image: coverUrl ? [coverUrl] : undefined,
    datePublished: post.publishedAt ?? undefined,
    dateModified: post.publishedAt ?? undefined,
    author: { "@type": "Person", name: post.author },
    publisher: { "@type": "Organization", name: SITE_NAME, url: absolute("/") },
    mainEntityOfPage: { "@type": "WebPage", "@id": absolute(postHref(post)) },
    articleSection: post.rubric?.title ?? post.section.title,
    inLanguage: "ru",
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: absolute(c.href),
    })),
  };

  return (
    <main className="container rise">
      {!preview && (
        <>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: jsonLdScript(articleJsonLd) }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbJsonLd) }}
          />
        </>
      )}

      <article>
        <header className={styles.header}>
          <Breadcrumbs items={crumbs.slice(0, -1)} />
          <p className={`label label--accent ${styles.rubric}`}>
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
