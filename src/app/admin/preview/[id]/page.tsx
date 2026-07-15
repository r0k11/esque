import { notFound } from "next/navigation";
import Link from "next/link";
import { PostView } from "@/components/PostView";
import { requireSession, canEditPost } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { getPostForPreview } from "@/lib/queries";
import styles from "./preview.module.css";

export const dynamic = "force-dynamic";

export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;

  const owner = await prisma.post.findUnique({ where: { id }, select: { authorId: true } });
  if (!owner || !canEditPost(session, owner.authorId)) notFound();

  const post = await getPostForPreview(id);
  if (!post) notFound();

  return (
    <>
      <div className={styles.bar}>
        <span>Превью · так материал увидят читатели</span>
        <Link href={`/admin/edit/${id}`} className={styles.back}>
          ← Вернуться в редактор
        </Link>
      </div>
      <div style={{ background: "var(--paper)", minHeight: "100vh" }}>
        <PostView post={post} preview />
      </div>
    </>
  );
}
