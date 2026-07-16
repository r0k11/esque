import Link from "next/link";
import styles from "./Breadcrumbs.module.css";

export type Crumb = { name: string; href: string };

/**
 * Видимые крошки — только путь до материала (сам заголовок не дублируем: он
 * стоит рядом как H1). Полная цепочка с заголовком уходит в JSON-LD.
 */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className={styles.crumbs} aria-label="Хлебные крошки">
      {items.map((c, i) => (
        <span key={c.href} className={styles.item}>
          {i > 0 && <span className={styles.sep}>/</span>}
          <Link href={c.href}>{c.name}</Link>
        </span>
      ))}
    </nav>
  );
}
