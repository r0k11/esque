import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";
import type { SessionPayload } from "@/lib/session-crypto";
import type { Role } from "@/generated/prisma/enums";

/** Текущая сессия или редирект на логин. Мемоизируется в пределах одного рендера. */
export const requireSession = cache(async (): Promise<SessionPayload> => {
  const session = await readSession();
  if (!session) redirect("/admin/login");
  return session;
});

export const getSession = cache(readSession);

/** Публиковать и удалять чужое могут только редакторы и администраторы. */
export function canPublish(role: Role) {
  return role === "EDITOR" || role === "ADMIN";
}

export function canEditPost(session: SessionPayload, authorId: string) {
  return canPublish(session.role) || session.userId === authorId;
}
