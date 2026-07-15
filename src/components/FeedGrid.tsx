import type { CardPost } from "@/lib/queries";
import { PostCard } from "./PostCard";
import styles from "./FeedGrid.module.css";

/**
 * Лента раздела/рубрики: мозаика без повторов — плитки циклически
 * проходят последовательность форматов (приём pravilamag).
 */
type Slot = { col: number; rows?: number; aspect: string; sizes: string };

const SEQUENCE: Slot[] = [
  { col: 7, rows: 2, aspect: "4 / 5", sizes: "(max-width: 767px) 100vw, 55vw" },
  { col: 5, aspect: "3 / 2", sizes: "(max-width: 767px) 100vw, 40vw" },
  { col: 5, aspect: "3 / 2", sizes: "(max-width: 767px) 100vw, 40vw" },
  { col: 4, aspect: "4 / 5", sizes: "(max-width: 767px) 100vw, 31vw" },
  { col: 4, aspect: "4 / 5", sizes: "(max-width: 767px) 100vw, 31vw" },
  { col: 4, aspect: "4 / 5", sizes: "(max-width: 767px) 100vw, 31vw" },
  { col: 5, rows: 2, aspect: "4 / 5", sizes: "(max-width: 767px) 100vw, 40vw" },
  { col: 7, aspect: "16 / 9", sizes: "(max-width: 767px) 100vw, 55vw" },
  { col: 4, aspect: "1 / 1", sizes: "(max-width: 767px) 100vw, 31vw" },
  { col: 3, aspect: "1 / 1", sizes: "(max-width: 767px) 100vw, 23vw" },
];

export function FeedGrid({ posts }: { posts: CardPost[] }) {
  return (
    <div className={styles.grid}>
      {posts.map((post, i) => {
        const slot = SEQUENCE[i % SEQUENCE.length];
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
  );
}
