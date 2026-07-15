import Link from "next/link";
import type { CardPost } from "@/lib/queries";
import { PostCard } from "./PostCard";
import styles from "./SectionBlock.module.css";

/**
 * Мозаичные паттерны раскладки (приём pravilamag): плитки разных
 * пропорций и ширин, блоки разделов чередуют паттерны.
 * col — колонки из 12, rows — высота в грид-рядах, aspect — пропорция плитки.
 */
type Slot = { col: number; rows?: number; aspect: string; sizes: string };

const PATTERNS: Slot[][] = [
  // Крупная портретная слева, две горизонтальные справа
  [
    { col: 7, rows: 2, aspect: "4 / 5", sizes: "(max-width: 767px) 100vw, 55vw" },
    { col: 5, aspect: "3 / 2", sizes: "(max-width: 767px) 100vw, 40vw" },
    { col: 5, aspect: "3 / 2", sizes: "(max-width: 767px) 100vw, 40vw" },
  ],
  // Три портретные в ряд
  [
    { col: 4, aspect: "4 / 5", sizes: "(max-width: 767px) 100vw, 31vw" },
    { col: 4, aspect: "4 / 5", sizes: "(max-width: 767px) 100vw, 31vw" },
    { col: 4, aspect: "4 / 5", sizes: "(max-width: 767px) 100vw, 31vw" },
  ],
  // Портретная слева, широкая и две квадратные справа
  [
    { col: 5, rows: 2, aspect: "4 / 5", sizes: "(max-width: 767px) 100vw, 40vw" },
    { col: 7, aspect: "16 / 9", sizes: "(max-width: 767px) 100vw, 55vw" },
    { col: 4, aspect: "1 / 1", sizes: "(max-width: 767px) 100vw, 31vw" },
    { col: 3, aspect: "1 / 1", sizes: "(max-width: 767px) 100vw, 23vw" },
  ],
];

type Props = {
  title: string;
  href: string;
  posts: CardPost[];
  /** Индекс блока на странице — определяет паттерн раскладки */
  index: number;
};

export function SectionBlock({ title, href, posts, index }: Props) {
  if (posts.length === 0) return null;
  const pattern = PATTERNS[index % PATTERNS.length];
  const shown = posts.slice(0, pattern.length);

  return (
    <section className={styles.block}>
      <header className={styles.header}>
        <h2 className={styles.title}>
          <Link href={href}>{title}</Link>
        </h2>
        <Link href={href} className={`label ${styles.all}`}>
          Все материалы
        </Link>
      </header>
      <div className={styles.grid}>
        {shown.map((post, i) => {
          const slot = pattern[i];
          return (
            <div
              key={post.id}
              className={styles.cell}
              style={{
                gridColumn: `span ${slot.col}`,
                gridRow: slot.rows ? `span ${slot.rows}` : undefined,
              }}
            >
              <PostCard post={post} aspect={slot.aspect} sizes={slot.sizes} />
            </div>
          );
        })}
      </div>
    </section>
  );
}
