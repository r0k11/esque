import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

/**
 * Плоское представление материала для карточек лент.
 * Даты — ISO-строки: unstable_cache сериализует результат в JSON.
 */
export type CardPost = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  type: "ARTICLE" | "GALLERY" | "INTERVIEW" | "NEWS" | "SPECIAL";
  publishedAt: string | null;
  section: { slug: string; title: string };
  rubric: { slug: string; title: string } | null;
  cover: {
    key: string;
    width: number;
    height: number;
    alt: string | null;
    blurDataUrl: string | null;
  } | null;
};

type PostWithRelations = Awaited<ReturnType<typeof fetchLatestPosts>>[number];

function fetchLatestPosts(take: number) {
  return prisma.post.findMany({
    where: { status: "PUBLISHED", publishedAt: { lte: new Date() } },
    orderBy: { publishedAt: "desc" },
    take,
    include: { cover: true, rubric: true, section: true },
  });
}

function toCard(p: PostWithRelations): CardPost {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    subtitle: p.subtitle,
    type: p.type,
    publishedAt: p.publishedAt?.toISOString() ?? null,
    section: { slug: p.section.slug, title: p.section.title },
    rubric: p.rubric ? { slug: p.rubric.slug, title: p.rubric.title } : null,
    cover: p.cover
      ? {
          key: p.cover.key,
          width: p.cover.width,
          height: p.cover.height,
          alt: p.cover.alt,
          blurDataUrl: p.cover.blurDataUrl,
        }
      : null,
  };
}

/** Свежие материалы для лент главной. Кэш сбрасывается по тегу "posts" или раз в 5 минут. */
export const getLatestPosts = unstable_cache(
  async () => (await fetchLatestPosts(60)).map(toCard),
  ["latest-posts"],
  { revalidate: 300, tags: ["posts"] }
);
