import { SECTIONS } from "@/lib/structure";
import { SITE_URL } from "@/lib/seo";

// Индекс карт сайта: отдельная карта на каждый раздел + карта статических страниц.
export const dynamic = "force-dynamic";

export function GET() {
  const maps = ["pages", ...SECTIONS.map((s) => s.slug)];
  const body = maps
    .map((m) => `  <sitemap><loc>${SITE_URL}/sitemaps/${m}.xml</loc></sitemap>`)
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</sitemapindex>`;
  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
