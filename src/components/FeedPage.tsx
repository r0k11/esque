import Link from "next/link";
import type { CardPost } from "@/lib/queries";
import type { SectionDef } from "@/lib/structure";
import { FeedGrid } from "./FeedGrid";
import styles from "./FeedPage.module.css";

type Props = {
  section: SectionDef;
  activeRubric?: string; // slug активной рубрики
  posts: CardPost[];
  hasNext: boolean;
  page: number;
  basePath: string; // «/fashion» или «/fashion/trends»
};

export function FeedPage({ section, activeRubric, posts, hasNext, page, basePath }: Props) {
  const active = section.rubrics.find((r) => r.slug === activeRubric);
  return (
    <main className={`container rise`}>
      <header className={styles.header}>
        <p className="label">{active ? section.title : "Раздел"}</p>
        <h1 className={styles.title}>{active ? active.title : section.title}</h1>
        {section.rubrics.length > 0 && (
          <nav className={styles.rubrics} aria-label="Рубрики раздела">
            <Link
              href={`/${section.slug}`}
              className={!active ? styles.activeRubric : undefined}
            >
              Все
            </Link>
            {section.rubrics.map((r) => (
              <Link
                key={r.slug}
                href={`/${section.slug}/${r.slug}`}
                className={r.slug === activeRubric ? styles.activeRubric : undefined}
              >
                {r.title}
              </Link>
            ))}
          </nav>
        )}
      </header>

      {posts.length === 0 ? (
        <p className={styles.empty}>В этой рубрике пока нет материалов.</p>
      ) : (
        <FeedGrid posts={posts} />
      )}

      {(page > 1 || hasNext) && (
        <nav className={styles.pager} aria-label="Страницы">
          {page > 1 && (
            <Link href={`${basePath}?page=${page - 1}`} className="label">
              ← Новее
            </Link>
          )}
          {hasNext && (
            <Link href={`${basePath}?page=${page + 1}`} className="label">
              Раньше →
            </Link>
          )}
        </nav>
      )}
    </main>
  );
}
