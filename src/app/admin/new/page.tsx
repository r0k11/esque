import { AdminBar } from "@/components/admin/AdminBar";
import { requireSession } from "@/lib/dal";
import { createDraft } from "@/app/admin/actions";
import type { PostType } from "@/generated/prisma/enums";
import styles from "../admin.module.css";
import ntypes from "./new.module.css";

const TYPES: { type: PostType; title: string; desc: string }[] = [
  { type: "ARTICLE", title: "Статья", desc: "Текст с врезками, цитатами и медиа" },
  { type: "INTERVIEW", title: "Интервью", desc: "Вёрстка «вопрос — ответ»" },
  { type: "GALLERY", title: "Галерея", desc: "Полноэкранный просмотр серии фото" },
  { type: "NEWS", title: "Новость", desc: "Короткий формат" },
  { type: "SPECIAL", title: "Спецпроект", desc: "Кастомная посадочная страница" },
];

export default async function NewPost() {
  await requireSession();
  return (
    <>
      <AdminBar />
      <div className={styles.page}>
        <h1 className={ntypes.title}>Новый материал</h1>
        <p className={ntypes.sub}>Выберите тип — откроется редактор.</p>
        <div className={ntypes.grid}>
          {TYPES.map((t) => (
            <form key={t.type} action={createDraft.bind(null, t.type)}>
              <button type="submit" className={ntypes.card}>
                <span className={ntypes.cardTitle}>{t.title}</span>
                <span className={ntypes.cardDesc}>{t.desc}</span>
              </button>
            </form>
          ))}
        </div>
      </div>
    </>
  );
}
