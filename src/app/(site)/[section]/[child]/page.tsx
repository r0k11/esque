import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FeedPage } from "@/components/FeedPage";
import { PostView } from "@/components/PostView";
import { getFeed, getPostBySlug } from "@/lib/queries";
import { SECTIONS } from "@/lib/structure";

export const dynamic = "force-dynamic";

/**
 * Второй сегмент URL — либо рубрика раздела (/fashion/trends),
 * либо материал раздела без рубрик (/events/kak-proshla-nedelya-mody).
 */
type Props = {
  params: Promise<{ section: string; child: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { section, child } = await params;
  const s = SECTIONS.find((x) => x.slug === section);
  const rubric = s?.rubrics.find((r) => r.slug === child);
  if (s && rubric) return { title: `${rubric.title} — ${s.title}` };
  const post = await getPostBySlug(child);
  if (post && post.section.slug === section && !post.rubric) {
    return {
      title: post.seoTitle ?? post.title,
      description: post.seoDescription ?? post.subtitle ?? undefined,
    };
  }
  return {};
}

export default async function ChildPage({ params, searchParams }: Props) {
  const { section, child } = await params;
  const s = SECTIONS.find((x) => x.slug === section);
  if (!s) notFound();

  const rubric = s.rubrics.find((r) => r.slug === child);
  if (rubric) {
    const page = Math.max(1, Number((await searchParams).page) || 1);
    const { posts, hasNext } = await getFeed(s.slug, rubric.slug, page);
    return (
      <FeedPage
        section={s}
        activeRubric={rubric.slug}
        posts={posts}
        hasNext={hasNext}
        page={page}
        basePath={`/${s.slug}/${rubric.slug}`}
      />
    );
  }

  const post = await getPostBySlug(child);
  if (!post || post.section.slug !== section || post.rubric) notFound();
  return <PostView post={post} />;
}
