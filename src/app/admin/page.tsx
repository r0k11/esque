import Link from "next/link";
import { AdminBar } from "@/components/admin/AdminBar";
import { requireSession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import styles from "./admin.module.css";
import list from "./list.module.css";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  ARTICLE: "Статья",
  GALLERY: "Галерея",
  INTERVIEW: "Интервью",
  NEWS: "Новость",
  SPECIAL: "Спецпроект",
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Черновик",
  SCHEDULED: "Запланирован",
  PUBLISHED: "Опубликован",
};

export default async function AdminHome() {
  await requireSession();
  const posts = await prisma.post.findMany({
    orderBy: { updatedAt: "desc" },
    include: { section: true, rubric: true, author: { select: { name: true } } },
    take: 100,
  });

  return (
    <>
      <AdminBar />
      <div className={styles.page}>
        <header className={list.head}>
          <h1 className={list.title}>Материалы</h1>
          <Link href="/admin/new" className={list.newBtn}>
            + Новый материал
          </Link>
        </header>

        {posts.length === 0 ? (
          <p className={list.empty}>Пока нет материалов. Создайте первый.</p>
        ) : (
          <ul className={list.rows}>
            {posts.map((p) => (
              <li key={p.id} className={list.row}>
                <Link href={`/admin/edit/${p.id}`} className={list.rowMain}>
                  <span className={`${list.status} ${list["s_" + p.status]}`}>
                    {STATUS_LABEL[p.status]}
                  </span>
                  <span className={list.rowTitle}>{p.title}</span>
                </Link>
                <span className={list.meta}>{TYPE_LABEL[p.type]}</span>
                <span className={list.meta}>
                  {p.section.title}
                  {p.rubric ? ` · ${p.rubric.title}` : ""}
                </span>
                <span className={list.meta}>{p.author.name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
