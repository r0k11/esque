import { notFound } from "next/navigation";
import { AdminBar } from "@/components/admin/AdminBar";
import { Editor, type EditorMedia } from "@/components/admin/Editor";
import { requireSession, canEditPost, canPublish } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { parseBlocks, collectMediaIds } from "@/lib/blocks";
import { getMediaByIdsFresh } from "@/lib/queries";
import { mediaUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;

  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) notFound();
  if (!canEditPost(session, post.authorId)) notFound();

  const sections = await prisma.section.findMany({
    orderBy: { order: "asc" },
    include: { rubrics: { orderBy: { order: "asc" }, where: { archived: false } } },
  });

  const blocks = parseBlocks(post.content);
  const ids = collectMediaIds(blocks);
  if (post.coverId) ids.push(post.coverId);
  const mediaRows = await getMediaByIdsFresh([...new Set(ids)]);
  const media: Record<string, EditorMedia> = {};
  for (const m of mediaRows) {
    media[m.id] = { id: m.id, url: mediaUrl(m.key), width: m.width, height: m.height };
  }

  return (
    <>
      <AdminBar />
      <Editor
        postId={post.id}
        type={post.type}
        canPublish={canPublish(session.role)}
        initial={{
          title: post.title === "Без названия" ? "" : post.title,
          subtitle: post.subtitle ?? "",
          blocks,
          sectionId: post.sectionId,
          rubricId: post.rubricId,
          coverId: post.coverId,
          seoTitle: post.seoTitle ?? "",
          seoDescription: post.seoDescription ?? "",
          scheduledAt: post.scheduledAt ? post.scheduledAt.toISOString().slice(0, 16) : "",
          status: post.status,
        }}
        sections={sections.map((s) => ({
          id: s.id,
          title: s.title,
          rubrics: s.rubrics.map((r) => ({ id: r.id, title: r.title })),
        }))}
        media={media}
      />
    </>
  );
}
