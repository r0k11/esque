import type { Metadata } from "next";
import { FeedGrid } from "@/components/FeedGrid";
import { searchPosts } from "@/lib/queries";
import styles from "./search.module.css";

// Поиск зависит от запроса — рендерим на запросе, кэшировать нечего
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Поиск",
  // страницы результатов в индексе не нужны
  robots: { index: false, follow: true },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const q = (await searchParams).q?.trim() ?? "";
  const posts = q ? await searchPosts(q) : [];

  return (
    <main className="container rise">
      <header className={styles.head}>
        <h1 className={styles.title}>Поиск</h1>
        {/* обычная форма с GET: работает и без JS, ссылку с результатами можно переслать */}
        <form className={styles.form} action="/search" method="get" role="search">
          <input
            className={styles.input}
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Имя, бренд, тема…"
            aria-label="Что ищем"
            autoFocus
          />
          <button className={styles.submit} type="submit">
            Найти
          </button>
        </form>
      </header>

      {q && (
        <p className={styles.count}>
          {posts.length === 0
            ? `По запросу «${q}» ничего не нашлось`
            : `Найдено материалов: ${posts.length}${posts.length === 40 ? " (показаны первые 40)" : ""}`}
        </p>
      )}

      {posts.length > 0 && <FeedGrid posts={posts} />}

      {q && posts.length === 0 && (
        <p className={styles.empty}>
          Попробуйте другое слово или более короткий запрос. Поиск идёт по
          заголовкам, лидам и тексту материалов и понимает словоформы: «дизайнеры»
          найдут и «дизайнеров». Фразу целиком можно взять в кавычки.
        </p>
      )}
    </main>
  );
}
