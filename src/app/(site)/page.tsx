import type { Metadata } from "next";
import { Hero } from "@/components/Hero";
import { PromoMadeInRussia } from "@/components/PromoMadeInRussia";
import { SectionBlock } from "@/components/SectionBlock";
import { getLatestPosts } from "@/lib/queries";
import { SECTIONS } from "@/lib/structure";
import { absolute, jsonLdScript, organizationJsonLd } from "@/lib/seo";

// Главная рендерится на запросе, а не по ISR: это статический маршрут, и Next
// пререндерил бы его на сборке — а при docker-сборке БД недоступна (образ должен
// собираться где угодно). Данные при этом кэшируются в getLatestPosts
// (unstable_cache, тег "posts"), так что запрос к БД идёт раз в 5 минут.
// Ленты и материалы — на ISR (динамические маршруты пререндер не требуют).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: absolute("/") },
};

export default async function Home() {
  const posts = await getLatestPosts();
  const hero = posts[0];
  const rest = posts.slice(1);
  const showPromo = process.env.PROMO_MADE_IN_RUSSIA !== "0";

  return (
    <main className="container">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(organizationJsonLd) }}
      />
      {hero && <Hero post={hero} />}
      {showPromo && <PromoMadeInRussia />}
      {SECTIONS.map((section, i) => (
        <SectionBlock
          key={section.slug}
          title={section.title}
          href={`/${section.slug}`}
          posts={rest.filter((p) => p.section.slug === section.slug)}
          index={i}
        />
      ))}
    </main>
  );
}
