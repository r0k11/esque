import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SECTIONS } from "@/lib/structure";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

type Entry = { loc: string; lastmod?: Date | null; priority: number };

function render(entries: Entry[]) {
  const body = entries
    .map((e) => {
      const lastmod = e.lastmod ? `\n    <lastmod>${e.lastmod.toISOString()}</lastmod>` : "";
      return `  <url>\n    <loc>${e.loc}</loc>${lastmod}\n    <priority>${e.priority}</priority>\n  </url>`;
    })
    .join("\n");
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`,
    { headers: { "Content-Type": "application/xml; charset=utf-8" } }
  );
}

export async function GET(_req: Request, { params }: { params: Promise<{ section: string }> }) {
  const slug = (await params).section.replace(/\.xml$/, "");

  // Карта статических страниц: главная + страницы разделов
  if (slug === "pages") {
    return render([
      { loc: SITE_URL, priority: 1 },
      ...SECTIONS.map((s) => ({ loc: `${SITE_URL}/${s.slug}`, priority: 0.8 })),
    ]);
  }

  const section = SECTIONS.find((s) => s.slug === slug);
  if (!section) notFound();

  const posts = await prisma.post.findMany({
    where: {
      status: "PUBLISHED",
      publishedAt: { lte: new Date() },
      section: { slug: section.slug },
    },
    orderBy: { publishedAt: "desc" },
    select: { slug: true, updatedAt: true, rubric: { select: { slug: true } } },
  });

  return render([
    { loc: `${SITE_URL}/${section.slug}`, priority: 0.8 },
    ...section.rubrics.map((r) => ({
      loc: `${SITE_URL}/${section.slug}/${r.slug}`,
      priority: 0.7,
    })),
    ...posts.map((p) => ({
      loc: p.rubric
        ? `${SITE_URL}/${section.slug}/${p.rubric.slug}/${p.slug}`
        : `${SITE_URL}/${section.slug}/${p.slug}`,
      lastmod: p.updatedAt,
      priority: 0.6,
    })),
  ]);
}
