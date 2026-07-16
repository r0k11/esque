import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FeedPage } from "@/components/FeedPage";
import { getFeed } from "@/lib/queries";
import { SECTIONS } from "@/lib/structure";
import { absolute } from "@/lib/seo";

// ISR: страница генерируется при первом запросе и дальше отдаётся из кэша.
export const revalidate = 300;

type Props = {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { section } = await params;
  const s = SECTIONS.find((x) => x.slug === section);
  if (!s) return {};
  const url = absolute(`/${s.slug}`);
  const description = `${s.title} — материалы журнала ESQUE.`;
  return {
    title: s.title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", url, title: s.title, description },
  };
}

export default async function SectionPage({ params, searchParams }: Props) {
  const { section } = await params;
  const s = SECTIONS.find((x) => x.slug === section);
  if (!s) notFound();

  const page = Math.max(1, Number((await searchParams).page) || 1);
  const { posts, hasNext } = await getFeed(s.slug, null, page);

  return (
    <FeedPage
      section={s}
      posts={posts}
      hasNext={hasNext}
      page={page}
      basePath={`/${s.slug}`}
    />
  );
}
