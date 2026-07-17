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

export const FEED_PAGE_SIZE = 18;

/**
 * Лента раздела или рубрики. rubricSlug === null — весь раздел.
 * Возвращает на один материал больше, чем страница: так узнаём про следующую.
 */
export const getFeed = unstable_cache(
  async (sectionSlug: string, rubricSlug: string | null, page: number) => {
    const posts = await prisma.post.findMany({
      where: {
        status: "PUBLISHED",
        publishedAt: { lte: new Date() },
        section: { slug: sectionSlug },
        ...(rubricSlug ? { rubric: { slug: rubricSlug } } : {}),
      },
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * FEED_PAGE_SIZE,
      take: FEED_PAGE_SIZE + 1,
      include: { cover: true, rubric: true, section: true },
    });
    return {
      posts: posts.slice(0, FEED_PAGE_SIZE).map(toCard),
      hasNext: posts.length > FEED_PAGE_SIZE,
    };
  },
  ["feed"],
  { revalidate: 300, tags: ["posts"] }
);

/**
 * Поиск по материалам: заголовок, лид и текст.
 *
 * Полнотекстовый поиск Postgres со словарём russian — он знает словоформы:
 * запрос «дизайнеры» находит и «дизайнеров» (178 материалов против 81 у поиска
 * по подстроке). Вектор лежит в generated-колонке Post.searchVector с GIN-индексом
 * (см. миграцию post_search_vector), Postgres пересчитывает её сам.
 *
 * websearch_to_tsquery разбирает пользовательский ввод «как в поисковике»
 * (кавычки для фразы, OR, минус) и не падает на произвольном тексте, в отличие
 * от to_tsquery. Ранжируем ts_rank: заголовок весит больше текста (веса A/B/C).
 * Запрос параметризован — инъекция исключена.
 */
export async function searchPosts(query: string): Promise<CardPost[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Post"
    WHERE status = 'PUBLISHED'
      AND "publishedAt" <= NOW()
      AND "searchVector" @@ websearch_to_tsquery('russian', ${q})
    ORDER BY ts_rank("searchVector", websearch_to_tsquery('russian', ${q})) DESC,
             "publishedAt" DESC
    LIMIT 40
  `;
  if (rows.length === 0) return [];

  const posts = await prisma.post.findMany({
    where: { id: { in: rows.map((r) => r.id) } },
    include: { cover: true, rubric: true, section: true },
  });
  // порядок из SQL важен (он по релевантности) — findMany его не сохраняет
  const byId = new Map(posts.map((p) => [p.id, p]));
  return rows.flatMap((r) => {
    const p = byId.get(r.id);
    return p ? [toCard(p)] : [];
  });
}

/**
 * «Читайте также»: свежие материалы той же рубрики (или раздела, если рубрики нет),
 * кроме текущего. Перелинковка — это и глубина просмотра, и вес страниц для поиска.
 */
export const getRelatedPosts = unstable_cache(
  async (sectionSlug: string, rubricSlug: string | null, excludeId: string) => {
    const posts = await prisma.post.findMany({
      where: {
        status: "PUBLISHED",
        publishedAt: { lte: new Date() },
        NOT: { id: excludeId },
        section: { slug: sectionSlug },
        ...(rubricSlug ? { rubric: { slug: rubricSlug } } : {}),
      },
      orderBy: { publishedAt: "desc" },
      take: 3,
      include: { cover: true, rubric: true, section: true },
    });
    return posts.map(toCard);
  },
  ["related-posts"],
  { revalidate: 300, tags: ["posts"] }
);

/** Полный материал со связями — для страницы материала. */
export const getPostBySlug = unstable_cache(
  async (slug: string) => {
    const p = await prisma.post.findFirst({
      where: { slug, status: "PUBLISHED", publishedAt: { lte: new Date() } },
      include: {
        cover: true,
        rubric: true,
        section: true,
        author: { select: { name: true } },
        tags: true,
      },
    });
    if (!p) return null;
    return {
      ...toCard(p),
      content: p.content,
      author: p.author.name,
      seoTitle: p.seoTitle,
      seoDescription: p.seoDescription,
      tags: p.tags.map((t) => ({ slug: t.slug, title: t.title })),
    };
  },
  ["post"],
  { revalidate: 300, tags: ["posts"] }
);

export type FullPost = NonNullable<Awaited<ReturnType<typeof getPostBySlug>>>;

/**
 * Материал по id независимо от статуса — для превью в админке (без кэша:
 * редактор должен видеть последнюю правку сразу). Доступ ограничен сессией
 * на уровне страницы превью.
 */
export async function getPostForPreview(id: string): Promise<FullPost | null> {
  const p = await prisma.post.findUnique({
    where: { id },
    include: {
      cover: true,
      rubric: true,
      section: true,
      author: { select: { name: true } },
      tags: true,
    },
  });
  if (!p) return null;
  return {
    ...toCard(p),
    content: p.content,
    author: p.author.name,
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
    tags: p.tags.map((t) => ({ slug: t.slug, title: t.title })),
  };
}

/** Медиа по id без кэша — для рендера превью сразу после загрузки/правки. */
export async function getMediaByIdsFresh(ids: string[]): Promise<MediaItem[]> {
  if (ids.length === 0) return [];
  return prisma.media.findMany({
    where: { id: { in: ids } },
    select: {
      id: true, key: true, width: true, height: true,
      alt: true, caption: true, credit: true, blurDataUrl: true,
    },
  });
}

/** Медиа по списку id — для блоков image/gallery. */
export const getMediaByIds = unstable_cache(
  async (ids: string[]) => {
    if (ids.length === 0) return [];
    return prisma.media.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        key: true,
        width: true,
        height: true,
        alt: true,
        caption: true,
        credit: true,
        blurDataUrl: true,
      },
    });
  },
  ["media-by-ids"],
  { revalidate: 3600, tags: ["media"] }
);

export type MediaItem = Awaited<ReturnType<typeof getMediaByIds>>[number];
