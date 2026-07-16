import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostView } from "@/components/PostView";
import { postHref } from "@/components/PostCard";
import { getPostBySlug } from "@/lib/queries";
import { mediaUrl } from "@/lib/s3";
import { absolute } from "@/lib/seo";

// ISR: пустой generateStaticParams — обязательное условие, чтобы Next кэшировал
// динамический маршрут. На сборке не пререндерим ничего (БД тогда недоступна),
// а посещённые страницы генерируются один раз и отдаются из кэша.
// Публикация материала сбрасывает кэш через revalidateTag("posts").
export const revalidate = 300;

export function generateStaticParams() {
  return [];
}

type Props = {
  params: Promise<{ section: string; child: string; slug: string }>;
};

async function resolvePost(props: Props) {
  const { section, child, slug } = await props.params;
  const post = await getPostBySlug(slug);
  if (!post || post.section.slug !== section || post.rubric?.slug !== child) {
    return null;
  }
  return post;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const post = await resolvePost(props);
  if (!post) return {};
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
      section: post.rubric?.title ?? post.section.title,
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

export default async function PostPage(props: Props) {
  const post = await resolvePost(props);
  if (!post) notFound();
  return <PostView post={post} />;
}
