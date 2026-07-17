/**
 * Миграция контента со старого esque.su (DataLife Engine) в новую БД.
 *
 * Доступа к хостингу/дампу нет → скрейпинг по sitemap.xml:
 *   sitemap → статьи → парсинг HTML (cheerio) → нормализация в блоки →
 *   загрузка изображений (оригинал) в MinIO → запись Post/Media/Redirect.
 *
 * Идемпотентность: Post по legacyId, Media по sourceUrl, Redirect по fromPath —
 * повторный запуск обновляет, не дублирует. Лог — scripts/output/migrate-log.json.
 *
 * Запуск:  npm run migrate            — весь sitemap
 *          npm run migrate -- --limit 5    — первые 5 статей (для проверки)
 *          npm run migrate -- --offset 100 --limit 50
 */
import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import * as cheerio from "cheerio";
import sharp from "sharp";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { uploadObject } from "../src/lib/storage";
import { sanitizeInline } from "../src/lib/sanitize";
import type { Block } from "../src/lib/blocks";
import {
  mapPrefix,
  newArticlePath,
  newCategoryPath,
  parseLegacyArticle,
} from "./url-map";

const BASE = "https://esque.su";
const UA = "Mozilla/5.0 (compatible; EsqueMigration/1.0)";
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// --- аргументы ---
const args = process.argv.slice(2);
const argVal = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const LIMIT = Number(argVal("--limit") ?? Infinity);
const OFFSET = Number(argVal("--offset") ?? 0);

const RU_MONTHS: Record<string, number> = {
  янв: 0, фев: 1, мар: 2, апр: 3, май: 4, июн: 5,
  июл: 6, авг: 7, сен: 8, окт: 9, ноя: 10, дек: 11,
};

function parseRuDate(text: string): Date | null {
  // формат DLE: "16-авг-2025"
  const m = text.trim().match(/(\d{1,2})-([а-я]{3})-(\d{4})/i);
  if (!m) return null;
  const month = RU_MONTHS[m[2].toLowerCase()];
  if (month === undefined) return null;
  return new Date(Date.UTC(Number(m[3]), month, Number(m[1]), 9, 0, 0));
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} для ${url}`);
  return res.text();
}

async function getSitemapUrls(): Promise<string[]> {
  const xml = await fetchText(`${BASE}/sitemap.xml`);
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}

// --- изображения ---
const mediaCache = new Map<string, string>(); // sourceUrl → media.id (в пределах запуска)

async function importImage(rawSrc: string, uploaderId: string): Promise<string | null> {
  const src = rawSrc.startsWith("http") ? rawSrc : `${BASE}${rawSrc.startsWith("/") ? "" : "/"}${rawSrc}`;
  if (mediaCache.has(src)) return mediaCache.get(src)!;

  const existing = await prisma.media.findUnique({ where: { sourceUrl: src }, select: { id: true } });
  if (existing) {
    mediaCache.set(src, existing.id);
    return existing.id;
  }

  try {
    const res = await fetch(src, { headers: { "User-Agent": UA } });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.startsWith("image/")) return null;
    const original = Buffer.from(await res.arrayBuffer());

    // Оригинал сохраняем как есть (без потерь качества), размеры/блюр — через sharp
    const pipeline = sharp(original).rotate();
    const meta = await pipeline.metadata();
    const blur = await pipeline.clone().resize(12).jpeg({ quality: 40 }).toBuffer();

    const ext = (src.split(".").pop() ?? "jpg").split(/[?#]/)[0].toLowerCase().slice(0, 4);
    const key = `migrated/${src.match(/(\d+)-/)?.[1] ?? "img"}/${crypto.randomUUID()}.${ext}`;
    await uploadObject(key, original, contentType);

    const media = await prisma.media.create({
      data: {
        key,
        width: meta.width ?? 0,
        height: meta.height ?? 0,
        mimeType: contentType,
        sourceUrl: src,
        blurDataUrl: `data:image/jpeg;base64,${blur.toString("base64")}`,
        uploadedById: uploaderId,
      },
    });
    mediaCache.set(src, media.id);
    return media.id;
  } catch {
    return null;
  }
}

// --- разбор тела статьи в блоки ---
function cleanHtml(html: string): string {
  return html.replace(/\s+/g, " ").trim();
}

/** Инлайн-разметка абзаца по общему белому списку + схлопывание пробелов скрейпа. */
function cleanInline(html: string): string {
  return cleanHtml(sanitizeInline(html));
}

async function parseArticle(
  html: string,
  legacyId: number,
  uploaderId: string
): Promise<{
  title: string;
  subtitle: string | null;
  date: Date | null;
  coverId: string | null;
  blocks: Block[];
  tags: string[];
}> {
  const $ = cheerio.load(html);

  const title =
    $("h1.entry-title").first().text().trim() ||
    $('meta[property="og:title"]').last().attr("content")?.trim() ||
    "Без названия";

  const date = parseRuDate($("[itemprop=datePublished]").first().text());

  // обложка — og:image из /uploads/posts (первая og:image — дефолтная заглушка)
  const ogImages = $('meta[property="og:image"]')
    .map((_, el) => $(el).attr("content"))
    .get()
    .filter((u): u is string => !!u);
  const coverSrc = ogImages.find((u) => u.includes("/uploads/")) ?? null;
  let coverId = coverSrc ? await importImage(coverSrc, uploaderId) : null;

  const tags = $(".tags a")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean);

  const normSrc = (s: string) => (s.startsWith("http") ? s : `${BASE}${s.startsWith("/") ? "" : "/"}${s}`);
  const used = new Set<string>();
  if (coverSrc) used.add(normSrc(coverSrc));

  const blocks: Block[] = [];
  let subtitle: string | null = null;

  // 1. Текст материала из .full-story (изображения оттуда собираем ниже, в галерею).
  //    Часть статей DLE верстает абзацы не <p>, а <div><span>…</span></div>, поэтому
  //    берём и div — но только «листовые» (без вложенных блоков), иначе текст
  //    продублируется родительским контейнером.
  const story = $(".full-story").first().clone();
  story.find("script, style, .instagram-block, .instagram-carousel, ins, .adsbygoogle, [id^=block_sub]").remove();
  const flow = story.find("p, h2, h3, blockquote, iframe, div").toArray();
  for (let i = 0; i < flow.length; i++) {
    const $el = $(flow[i]);
    const tag = ($el.prop("tagName") as string | undefined)?.toLowerCase();
    if (tag === "blockquote") {
      const text = cleanHtml($el.text());
      if (text) blocks.push({ type: "quote", text });
    } else if (tag === "h2" || tag === "h3") {
      const text = cleanHtml($el.text());
      if (!text) continue;
      if (i === 0 && !subtitle && text.length < 220) subtitle = text;
      else blocks.push({ type: "heading", text });
    } else if (tag === "iframe") {
      const html = $.html($el);
      if (html) blocks.push({ type: "embed", html });
    } else {
      // p или листовой div: сохраняем инлайн-разметку (ссылки, выделения, br),
      // картинки уйдут в галерею ниже — санитайзер их отсюда вырежет
      if (tag === "div" && $el.find("p, div, blockquote, h2, h3, iframe").length > 0) continue;
      // пустоту определяем по тексту: у абзаца с одной картинкой текста нет
      if (!cleanHtml($el.text())) continue;
      const html = cleanInline($el.html() ?? "");
      if (html) blocks.push({ type: "paragraph", html });
    }
  }

  // 2. Фото статьи: все /uploads/posts/ на странице, кроме обложки и картинок,
  //    завёрнутых в ссылку на другую статью (миниатюры блока «похожие»).
  const isArticleLink = (href: string) => /\/\d+-[^/]+\.html/.test(href);
  let galleryItems: { mediaId: string }[] = [];
  for (const img of $("img").toArray()) {
    const src = $(img).attr("src");
    if (!src || !src.includes("/uploads/posts/")) continue;
    const abs = normSrc(src);
    if (used.has(abs)) continue;
    const linkHref = $(img).closest("a[href]").attr("href") ?? "";
    if (isArticleLink(linkHref)) continue; // это превью другого материала
    used.add(abs);
    const mediaId = await importImage(src, uploaderId);
    if (mediaId) galleryItems.push({ mediaId });
  }

  // У части статей og:image — дефолтная заглушка шаблона, а не фото материала.
  // Тогда обложкой становится первое фото из тела (и в теле не дублируется).
  if (!coverId && galleryItems.length > 0) {
    coverId = galleryItems[0].mediaId;
    galleryItems = galleryItems.slice(1);
  }

  if (galleryItems.length >= 2) blocks.push({ type: "gallery", items: galleryItems });
  else if (galleryItems.length === 1) blocks.push({ type: "image", mediaId: galleryItems[0].mediaId });

  // подстраховка: если тело пустое, берём og:description абзацем
  if (blocks.length === 0) {
    const desc = $('meta[name=description]').attr("content")?.trim();
    if (desc) blocks.push({ type: "paragraph", html: desc });
  }

  if (!subtitle) {
    const desc = $('meta[name=description]').attr("content")?.trim();
    subtitle = desc ? desc.split(/(?<=[.!?])\s/)[0].slice(0, 220) : null;
  }

  return { title, subtitle, date, coverId, blocks, tags };
}

// --- запись материала ---
async function upsertTags(names: string[]) {
  const ids: string[] = [];
  for (const name of names) {
    const slug = name.toLowerCase().replace(/[^a-zа-я0-9]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 60);
    if (!slug) continue;
    const tag = await prisma.tag.upsert({
      where: { slug },
      update: {},
      create: { slug, title: name },
    });
    ids.push(tag.id);
  }
  return ids;
}

async function migrateArticle(url: string, uploaderId: string) {
  const pathname = new URL(url).pathname;
  const parsed = parseLegacyArticle(pathname);
  if (!parsed) throw new Error(`не похоже на статью: ${pathname}`);
  const { prefix, legacyId, rest } = parsed;
  const { section: sectionSlug, rubric: rubricSlug } = mapPrefix(prefix);

  const section = await prisma.section.findUniqueOrThrow({ where: { slug: sectionSlug } });
  const rubric = rubricSlug
    ? await prisma.rubric.findUniqueOrThrow({
        where: { sectionId_slug: { sectionId: section.id, slug: rubricSlug } },
      })
    : null;

  const html = await fetchText(url);
  const { title, subtitle, date, coverId, blocks, tags } = await parseArticle(html, legacyId, uploaderId);
  const tagIds = await upsertTags(tags);

  const newSlug = `${legacyId}-${rest}`;
  const publishedAt = date ?? new Date();

  await prisma.post.upsert({
    where: { legacyId },
    update: {
      title,
      subtitle,
      content: blocks as object[],
      coverId,
      sectionId: section.id,
      rubricId: rubric?.id ?? null,
      publishedAt,
      tags: { set: tagIds.map((id) => ({ id })) },
    },
    create: {
      type: "ARTICLE",
      status: "PUBLISHED",
      title,
      subtitle,
      slug: newSlug,
      content: blocks as object[],
      coverId,
      sectionId: section.id,
      rubricId: rubric?.id ?? null,
      authorId: uploaderId,
      publishedAt,
      legacyId,
      legacyUrl: pathname,
      tags: { connect: tagIds.map((id) => ({ id })) },
    },
  });

  // 301: старый путь → новый
  const toPath = newArticlePath(prefix, legacyId, rest);
  await prisma.redirect.upsert({
    where: { fromPath: pathname },
    update: { toPath },
    create: { fromPath: pathname, toPath, statusCode: 301 },
  });

  return { images: blocks.filter((b) => b.type === "image").length, toPath };
}

/** Тестовые страницы старого сайта: их URL кончается на «-test.html». */
function isLegacyTestUrl(url: string): boolean {
  return /-test\d*\.html$/.test(new URL(url).pathname);
}

/** 301 со старого адреса статьи на её раздел/рубрику (когда сам материал не переносим). */
async function redirectToSection(url: string) {
  const pathname = new URL(url).pathname;
  const parsed = parseLegacyArticle(pathname);
  if (!parsed) return;
  const toPath = newCategoryPath(parsed.prefix);
  await prisma.redirect.upsert({
    where: { fromPath: pathname },
    update: { toPath },
    create: { fromPath: pathname, toPath, statusCode: 301 },
  });
}

/**
 * Сбросить кэш сайта после миграции. Скрипт пишет в БД мимо Next, поэтому без
 * этого сайт до 5 минут отдаёт старые страницы. Недоступность сайта — не ошибка:
 * миграцию часто гоняют до его запуска, тогда и кэшу неоткуда взяться.
 */
async function revalidateSite() {
  const base = (process.env.REVALIDATE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    console.warn("Кэш сайта НЕ сброшен: не задан AUTH_SECRET");
    return;
  }
  try {
    const res = await fetch(`${base}/api/revalidate`, {
      method: "POST",
      headers: { "x-revalidate-secret": secret },
    });
    if (res.ok) console.log(`Кэш сайта сброшен (${base})`);
    else console.warn(`Кэш сайта НЕ сброшен: HTTP ${res.status} от ${base}`);
  } catch {
    console.warn(`Кэш сайта НЕ сброшен: ${base} недоступен (если сайт запущен — перезапустите web)`);
  }
}

async function migrateCategoryRedirect(url: string) {
  const pathname = new URL(url).pathname; // напр. /fashion/street-style/
  const prefix = pathname.replace(/^\/|\/$/g, "");
  const toPath = newCategoryPath(prefix);
  await prisma.redirect.upsert({
    where: { fromPath: pathname },
    update: { toPath },
    create: { fromPath: pathname, toPath, statusCode: 301 },
  });
  return toPath;
}

async function main() {
  const uploader = await prisma.user.upsert({
    where: { email: "redaktsiya@esque.su" },
    update: {},
    create: {
      email: "redaktsiya@esque.su",
      name: "Редакция Esque",
      role: "EDITOR",
      passwordHash: "!", // служебный аккаунт-автор, вход не предусмотрен
    },
  });

  const urls = await getSitemapUrls();
  const articles = urls.filter((u) => /\/\d+-[^/]+\.html$/.test(new URL(u).pathname));
  const categories = urls.filter((u) => new URL(u).pathname.endsWith("/"));

  console.log(`Sitemap: ${urls.length} URL — статей ${articles.length}, рубрик ${categories.length}`);

  const log: { url: string; status: string; detail?: string }[] = [];

  // редиректы страниц рубрик/разделов
  for (const url of categories) {
    try {
      const to = await migrateCategoryRedirect(url);
      log.push({ url, status: "redirect", detail: to });
    } catch (e) {
      log.push({ url, status: "error", detail: String(e) });
    }
  }

  // статьи
  const slice = articles.slice(OFFSET, OFFSET + LIMIT);
  let done = 0;
  for (const url of slice) {
    try {
      // Тестовые материалы старого сайта (напр. /esquevideo/643-test.html) не переносим,
      // но старый адрес всё равно ведём 301 на раздел — чтобы не отдавал 404.
      if (isLegacyTestUrl(url)) {
        await redirectToSection(url);
        log.push({ url, status: "skipped", detail: "тестовый материал" });
        continue;
      }
      const r = await migrateArticle(url, uploader.id);
      done++;
      log.push({ url, status: "ok", detail: `${r.toPath} (${r.images} фото)` });
      console.log(`[${done}/${slice.length}] ${url} → ${r.toPath}`);
    } catch (e) {
      // Исходник недоступен (устаревший URL в sitemap) — контент не спасти,
      // но старый адрес не должен давать 404: ведём 301 на раздел/рубрику.
      try {
        await redirectToSection(url);
      } catch { /* игнорируем — залогируем исходную ошибку */ }
      log.push({ url, status: "error", detail: String(e) });
      console.error(`ОШИБКА ${url}: ${e}`);
    }
  }

  await revalidateSite();

  await mkdir("scripts/output", { recursive: true });
  await writeFile("scripts/output/migrate-log.json", JSON.stringify(log, null, 2));
  const ok = log.filter((l) => l.status === "ok").length;
  const errors = log.filter((l) => l.status === "error").length;
  console.log(`Готово: статей ${ok}, редиректов ${categories.length}, ошибок ${errors}. Лог: scripts/output/migrate-log.json`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
