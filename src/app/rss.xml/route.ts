import { prisma } from "@/lib/prisma";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/seo";

export const dynamic = "force-dynamic";

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function GET() {
  const posts = await prisma.post.findMany({
    where: { status: "PUBLISHED", publishedAt: { lte: new Date() } },
    orderBy: { publishedAt: "desc" },
    take: 50,
    select: {
      title: true,
      subtitle: true,
      slug: true,
      publishedAt: true,
      section: { select: { slug: true, title: true } },
      rubric: { select: { slug: true, title: true } },
    },
  });

  const items = posts
    .map((p) => {
      const path = p.rubric
        ? `/${p.section.slug}/${p.rubric.slug}/${p.slug}`
        : `/${p.section.slug}/${p.slug}`;
      const link = `${SITE_URL}${path}`;
      return `  <item>
    <title>${escape(p.title)}</title>
    <link>${link}</link>
    <guid isPermaLink="true">${link}</guid>
    <category>${escape(p.rubric?.title ?? p.section.title)}</category>
    <pubDate>${p.publishedAt?.toUTCString() ?? ""}</pubDate>
    <description>${escape(p.subtitle ?? "")}</description>
  </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${SITE_NAME}</title>
  <link>${SITE_URL}</link>
  <description>${escape(SITE_DESCRIPTION)}</description>
  <language>ru</language>
  <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />
${items}
</channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
