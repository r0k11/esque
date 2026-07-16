/**
 * Проверка миграции ссылок: каждый URL из старого sitemap на новом сайте
 * должен открываться (200) или редиректить (301/308) — но НЕ отдавать 404.
 *
 * Запуск (сайт должен быть поднят):  npm run check-links
 *   переопределить базу:  CHECK_BASE=http://localhost:3000 npm run check-links
 */
import "dotenv/config";
import { writeFile, mkdir } from "node:fs/promises";

const OLD = "https://esque.su";
const BASE = process.env.CHECK_BASE ?? "http://localhost:3000";
const UA = "Mozilla/5.0 (compatible; EsqueLinkCheck/1.0)";
const CONCURRENCY = 8;

async function sitemapPaths(): Promise<string[]> {
  const xml = await (await fetch(`${OLD}/sitemap.xml`, { headers: { "User-Agent": UA } })).text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1].trim()).pathname);
  return [...new Set(urls)];
}

type Result = { path: string; status: number; finalUrl: string };

async function once(path: string): Promise<Result> {
  // редиректы разворачиваем сами (redirect: manual), чтобы поймать всю цепочку
  let url = `${BASE}${path}`;
  let status = 0;
  let finalUrl = url;
  for (let hop = 0; hop < 5; hop++) {
    const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "manual" });
    status = res.status;
    finalUrl = url;
    if (status >= 300 && status < 400) {
      const loc = res.headers.get("location");
      if (!loc) break;
      url = new URL(loc, url).toString();
      continue;
    }
    break;
  }
  return { path, status, finalUrl };
}

async function check(path: string): Promise<Result> {
  const r = await once(path);
  // 5xx под нагрузкой бывает транзиентным (dev-сервер) — даём один спокойный повтор
  if (r.status >= 500 || r.status === 0) {
    await new Promise((res) => setTimeout(res, 800));
    return once(path);
  }
  return r;
}

async function main() {
  const paths = await sitemapPaths();
  console.log(`Проверяю ${paths.length} старых URL против ${BASE}`);

  const results: Result[] = [];
  for (let i = 0; i < paths.length; i += CONCURRENCY) {
    const batch = paths.slice(i, i + CONCURRENCY);
    results.push(...(await Promise.all(batch.map(check))));
    process.stdout.write(`\r${Math.min(i + CONCURRENCY, paths.length)}/${paths.length}`);
  }
  process.stdout.write("\n");

  const bad = results.filter((r) => r.status === 404 || r.status >= 500 || r.status === 0);
  const ok200 = results.filter((r) => r.status === 200).length;

  await mkdir("scripts/output", { recursive: true });
  await writeFile("scripts/output/check-links.json", JSON.stringify(results, null, 2));

  console.log(`Итог: открываются — ${ok200}, проблемных — ${bad.length} (из ${paths.length})`);
  if (bad.length) {
    console.log("ПРОБЛЕМНЫЕ (не открываются и не 301):");
    for (const b of bad.slice(0, 40)) console.log(`  ${b.status}  ${b.path}`);
    process.exitCode = 1;
  } else {
    console.log("✓ Ни один старый URL не отдаёт 404/5xx.");
  }
}

main();
