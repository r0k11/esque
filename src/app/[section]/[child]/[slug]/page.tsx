import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostView } from "@/components/PostView";
import { getPostBySlug } from "@/lib/queries";

export const dynamic = "force-dynamic";

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
  return {
    title: post.seoTitle ?? post.title,
    description: post.seoDescription ?? post.subtitle ?? undefined,
  };
}

export default async function PostPage(props: Props) {
  const post = await resolvePost(props);
  if (!post) notFound();
  return <PostView post={post} />;
}
