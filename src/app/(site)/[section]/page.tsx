import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FeedPage } from "@/components/FeedPage";
import { getFeed } from "@/lib/queries";
import { SECTIONS } from "@/lib/structure";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { section } = await params;
  const s = SECTIONS.find((x) => x.slug === section);
  return s ? { title: s.title } : {};
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
