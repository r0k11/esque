/**
 * Перелив выборки материалов из локальной базы (Postgres + MinIO) на демо-стенд
 * (Neon + Vercel Blob) для показа заказчику.
 *
 * Весь архив на демо не нужен: 546 статей и 357 МБ фото упираются в бесплатные
 * лимиты и льются долго. Берём свежие материалы по кругу разделов, чтобы главная,
 * ленты всех рубрик и поиск выглядели заполненными.
 *
 * Что переносится: структура (разделы/рубрики) → пользователи (с НОВЫМИ паролями,
 * демо публичное) → выбранные Post → их Media (строки + сами файлы в Blob).
 *
 * Редиректы НЕ переносятся намеренно: они ведут на материалы, которых в выборке
 * нет, и старый URL отдал бы 404. Без них proxy уводит любой старый .html на
 * главную (200) — для демо честнее.
 *
 * Идемпотентно: повторный запуск обновляет, не дублирует. Файл в Blob не
 * перезаливается, если объект с таким ключом уже есть.
 *
 * Требует в .env (кроме обычных локальных переменных):
 *   DEMO_DATABASE_URL   — строка подключения Neon
 *   DEMO_BLOB_TOKEN     — BLOB_READ_WRITE_TOKEN хранилища Vercel Blob
 *   DEMO_ADMIN_PASSWORD — пароль для всех демо-пользователей
 *
 * Запуск: npm run export-demo [-- --limit 150 --dry]
 */
import "dotenv/config";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { head, put } from "@vercel/blob";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { collectMediaIds, parseBlocks } from "../src/lib/blocks";

const args = process.argv.slice(2);
const argValue = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? undefined : args[i + 1];
};
const LIMIT = Number(argValue("limit") ?? 150);
const DRY = args.includes("--dry");

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Не задана переменная ${name} — см. шапку scripts/export-demo.ts`);
  return v;
}

const source = new PrismaClient({
  adapter: new PrismaPg({ connectionString: required("DATABASE_URL") }),
});

const sourceS3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: "us-east-1",
  forcePathStyle: true,
  credentials: {
    accessKeyId: required("S3_ACCESS_KEY"),
    secretAccessKey: required("S3_SECRET_KEY"),
  },
});
const SOURCE_BUCKET = process.env.S3_BUCKET ?? "media";

// Подключение к базе демо — лениво: пробный прогон (--dry) читает только
// локальную базу, и требовать строку Neon ради него незачем
let _target: PrismaClient | null = null;
const target = () =>
  (_target ??= new PrismaClient({
    adapter: new PrismaPg({ connectionString: required("DEMO_DATABASE_URL") }),
  }));

/**
 * Выбор материалов: по кругу разделов, внутри раздела — свежие сверху. Простое
 * «последние 150» перекосило бы демо в «События» (196 из 546) и оставило бы
 * ленты других разделов пустыми.
 */
async function pickPosts(limit: number) {
  const sections = await source.section.findMany({ select: { id: true }, orderBy: { order: "asc" } });
  const perSection = await Promise.all(
    sections.map((s) =>
      source.post.findMany({
        where: { sectionId: s.id, status: "PUBLISHED" },
        orderBy: { publishedAt: "desc" },
        take: limit,
      })
    )
  );

  const picked: (typeof perSection)[number] = [];
  for (let round = 0; picked.length < limit; round++) {
    let added = false;
    for (const list of perSection) {
      if (round < list.length && picked.length < limit) {
        picked.push(list[round]);
        added = true;
      }
    }
    if (!added) break; // материалы кончились раньше лимита
  }
  return picked;
}

/** Публичный адрес хранилища Blob — выводится из токена (см. src/lib/storage.ts). */
function blobBase(token: string): string {
  const explicit = process.env.DEMO_BLOB_PUBLIC_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  return `https://${token.split("_")[3]}.public.blob.vercel-storage.com`;
}

async function copyObject(key: string): Promise<"copied" | "exists" | "missing"> {
  const token = required("DEMO_BLOB_TOKEN");
  try {
    await head(`${blobBase(token)}/${key}`, { token });
    return "exists";
  } catch {
    // объекта нет — качаем из MinIO и кладём в Blob
  }
  try {
    const res = await sourceS3.send(new GetObjectCommand({ Bucket: SOURCE_BUCKET, Key: key }));
    const body = Buffer.from(await res.Body!.transformToByteArray());
    // addRandomSuffix по умолчанию false — адрес остаётся предсказуемым из ключа,
    // иначе mediaUrl() на сайте не собрал бы ссылку
    await put(key, body, {
      access: "public",
      contentType: res.ContentType ?? "image/webp",
      token,
      allowOverwrite: true,
    });
    return "copied";
  } catch {
    return "missing";
  }
}

async function main() {
  console.log(`Демо-перелив: лимит ${LIMIT}${DRY ? " (пробный прогон)" : ""}`);

  const posts = await pickPosts(LIMIT);
  console.log(`Выбрано материалов: ${posts.length}`);

  // --- медиа выбранных материалов ---
  const mediaIds = new Set<string>();
  for (const p of posts) {
    if (p.coverId) mediaIds.add(p.coverId);
    collectMediaIds(parseBlocks(p.content)).forEach((id) => mediaIds.add(id));
  }
  const media = await source.media.findMany({ where: { id: { in: [...mediaIds] } } });
  console.log(`Их фото: ${media.length}`);

  if (DRY) {
    const bySection = new Map<string, number>();
    for (const p of posts) bySection.set(p.sectionId, (bySection.get(p.sectionId) ?? 0) + 1);
    const sections = await source.section.findMany();
    for (const s of sections) console.log(`  ${s.title}: ${bySection.get(s.id) ?? 0}`);
    return;
  }

  const password = required("DEMO_ADMIN_PASSWORD");

  // --- структура: id сохраняем, чтобы ссылки материалов остались валидными ---
  const sections = await source.section.findMany();
  for (const s of sections) {
    await target().section.upsert({ where: { id: s.id }, create: s, update: s });
  }
  const rubrics = await source.rubric.findMany();
  for (const r of rubrics) {
    await target().rubric.upsert({ where: { id: r.id }, create: r, update: r });
  }
  console.log(`Структура: ${sections.length} разделов, ${rubrics.length} рубрик`);

  // --- пользователи: пароли НОВЫЕ, демо публичное и репозиторий открыт ---
  const users = await source.user.findMany();
  const passwordHash = await bcrypt.hash(password, 10);
  for (const u of users) {
    const data = { ...u, passwordHash };
    await target().user.upsert({ where: { id: u.id }, create: data, update: data });
  }
  console.log(`Пользователей: ${users.length} (пароль у всех — из DEMO_ADMIN_PASSWORD)`);

  // --- медиа: сначала строки, потом файлы ---
  let copied = 0;
  let missing = 0;
  for (const m of media) {
    await target().media.upsert({ where: { id: m.id }, create: m, update: m });
    const res = await copyObject(m.key);
    if (res === "copied") copied++;
    if (res === "missing") missing++;
  }
  console.log(`Файлы в Blob: ${copied} залито, ${media.length - copied - missing} уже было, ${missing} не найдено`);

  // --- материалы ---
  for (const p of posts) {
    // searchVector — генерируемая колонка, Postgres посчитает её сам;
    // content на чтении типизирован с null, на запись такой тип не принимается
    const { searchVector: _ignored, ...rest } = p as typeof p & { searchVector?: unknown };
    const data = { ...rest, content: (p.content ?? []) as object[] };
    await target().post.upsert({ where: { id: p.id }, create: data, update: data });
  }
  console.log(`Материалов перенесено: ${posts.length}`);
  console.log("Готово. Проверьте демо и не забудьте NEXT_PUBLIC_IS_DEMO=1.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await source.$disconnect();
    await _target?.$disconnect();
  });
