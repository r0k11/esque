"use server";

import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession, canPublish, canEditPost } from "@/lib/dal";
import { slugify } from "@/lib/slug";
import type { Block } from "@/lib/blocks";
import type { PostType } from "@/generated/prisma/enums";

const DEFAULT_SECTION = "fashion";

/** Создать пустой черновик выбранного типа и открыть его в редакторе. */
export async function createDraft(type: PostType) {
  const session = await requireSession();
  const section = await prisma.section.findUniqueOrThrow({ where: { slug: DEFAULT_SECTION } });
  const post = await prisma.post.create({
    data: {
      type,
      status: "DRAFT",
      title: "Без названия",
      slug: `draft-${Date.now().toString(36)}`,
      content: [],
      sectionId: section.id,
      authorId: session.userId,
    },
  });
  redirect(`/admin/edit/${post.id}`);
}

export type DraftPayload = {
  title: string;
  subtitle: string;
  content: Block[];
  sectionId: string;
  rubricId: string | null;
  coverId: string | null;
  seoTitle: string;
  seoDescription: string;
  scheduledAt: string | null;
};

async function loadEditable(id: string) {
  const session = await requireSession();
  const post = await prisma.post.findUnique({ where: { id }, select: { authorId: true } });
  if (!post) throw new Error("Материал не найден");
  if (!canEditPost(session, post.authorId)) throw new Error("Нет прав на редактирование");
  return session;
}

/** Автосохранение черновика. Возвращает время сохранения для индикатора. */
export async function saveDraft(id: string, data: DraftPayload) {
  await loadEditable(id);
  await prisma.post.update({
    where: { id },
    data: {
      title: data.title || "Без названия",
      subtitle: data.subtitle || null,
      content: data.content as object[],
      sectionId: data.sectionId,
      rubricId: data.rubricId,
      coverId: data.coverId,
      seoTitle: data.seoTitle || null,
      seoDescription: data.seoDescription || null,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
    },
  });
  // если материал уже опубликован, правки должны попадать на сайт
  revalidateTag("posts", "max");
  return { savedAt: new Date().toISOString() };
}

async function uniqueSlug(base: string, exceptId: string) {
  const slug = slugify(base);
  const clash = await prisma.post.findFirst({
    where: { slug, NOT: { id: exceptId } },
    select: { id: true },
  });
  return clash ? `${slug}-${Date.now().toString(36).slice(-4)}` : slug;
}

/** Опубликовать (или запланировать, если задана дата в будущем). */
export async function publishDraft(id: string, data: DraftPayload) {
  const session = await loadEditable(id);
  if (!canPublish(session.role)) {
    return { error: "Публиковать может только редактор или администратор" };
  }
  const scheduled = data.scheduledAt ? new Date(data.scheduledAt) : null;
  const future = scheduled && scheduled.getTime() > Date.now();
  const slug = await uniqueSlug(data.title, id);

  await prisma.post.update({
    where: { id },
    data: {
      title: data.title || "Без названия",
      subtitle: data.subtitle || null,
      content: data.content as object[],
      sectionId: data.sectionId,
      rubricId: data.rubricId,
      coverId: data.coverId,
      seoTitle: data.seoTitle || null,
      seoDescription: data.seoDescription || null,
      slug,
      status: future ? "SCHEDULED" : "PUBLISHED",
      publishedAt: future ? scheduled : new Date(),
      scheduledAt: future ? scheduled : null,
    },
  });
  revalidateTag("posts", "max");
  redirect("/admin");
}

export async function deletePost(id: string) {
  const session = await requireSession();
  const post = await prisma.post.findUnique({ where: { id }, select: { authorId: true } });
  if (!post) return;
  if (!canEditPost(session, post.authorId)) throw new Error("Нет прав на удаление");
  await prisma.post.delete({ where: { id } });
  revalidateTag("posts", "max");
  redirect("/admin");
}
