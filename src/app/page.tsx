import { Hero } from "@/components/Hero";
import { PromoMadeInRussia } from "@/components/PromoMadeInRussia";
import { SectionBlock } from "@/components/SectionBlock";
import { getLatestPosts } from "@/lib/queries";
import { SECTIONS } from "@/lib/structure";

// БД недоступна при docker-сборке, поэтому страница рендерится на запросе;
// данные кэшируются в getLatestPosts (unstable_cache, тег "posts").
export const dynamic = "force-dynamic";

export default async function Home() {
  const posts = await getLatestPosts();
  const hero = posts[0];
  const rest = posts.slice(1);
  const showPromo = process.env.PROMO_MADE_IN_RUSSIA !== "0";

  return (
    <main className="container">
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
