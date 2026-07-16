import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FeedPage } from "@/components/FeedPage";
import { PostView } from "@/components/PostView";
import { postHref } from "@/components/PostCard";
import { getFeed, getPostBySlug } from "@/lib/queries";
import { SECTIONS } from "@/lib/structure";
import { mediaUrl } from "@/lib/s3";
import { absolute } from "@/lib/seo";

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

  if (s && rubric) {
    const url = absolute(`/${s.slug}/${rubric.slug}`);
    const description = `${rubric.title} — ${s.title} в журнале ESQUE.`;
    return {
      title: `${rubric.title} — ${s.title}`,
      description,
      alternates: { canonical: url },
      openGraph: { type: "website", url, title: `${rubric.title} — ${s.title}`, description },
    };
  }

  const post = await getPostBySlug(child);
  if (post && post.section.slug === section && !post.rubric) {
    const url = absolute(postHref(post));
    const description = post.seoDescription ?? post.subtitle ?? undefined;
    const image = post.cover ? absolute(mediaUrl(post.cover.key)) : undefined;
    return {
      title: post.seoTitle ?? post.title,
      description,
      alternates: { canonical: url },
      openGraph: {
        type: "article",
        url,
        title: post.seoTitle ?? post.title,
        description,
        publishedTime: post.publishedAt ?? undefined,
        authors: [post.author],
        section: post.section.title,
        images: image ? [image] : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title: post.seoTitle ?? post.title,
        description,
        images: image ? [image] : undefined,
      },
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
