/**
 * Карта соответствия старой структуры esque.su (DataLife Engine) → новой.
 * Ключ — префикс-директория старого URL (без /{id}-slug.html и без ведущего слэша).
 * Значение — [раздел, рубрика|null] в новой структуре.
 *
 * Решения согласованы с заказчиком (progress.md):
 *  Street Style → Мода/Тренды; Pro Fashion Russia → Мода/Подиум;
 *  «В мире» → События; «От редакции» (slovo-redaktora) → Персона;
 *  Fashion Bitva / Russian Fashion Display → Проекты; Esque.kids → архивная рубрика.
 * Разделы «События» без рубрик — всё в раздел. Культурные подрубрики старых
 * «Событий» (кино/искусство/театр/музыка/архитектура) уезжают в раздел «Культура».
 */
export type Target = { section: string; rubric: string | null };

const MAP: Record<string, Target> = {
  // МОДА
  "fashion": { section: "fashion", rubric: null },
  "fashion/news-2": { section: "fashion", rubric: "news" },
  "fashion/podium": { section: "fashion", rubric: "runway" },
  "fashion/street-style": { section: "fashion", rubric: "trends" },
  "fashion/pro-fashion-russia": { section: "fashion", rubric: "runway" },
  "fashion/interview": { section: "fashion", rubric: "interview" },
  "fashion/gid": { section: "fashion", rubric: "trends" },
  "trand": { section: "fashion", rubric: "trends" },
  "magazine": { section: "fashion", rubric: null },
  "slider": { section: "fashion", rubric: null },
  "special": { section: "fashion", rubric: null },

  // КРАСОТА
  "beauty": { section: "beauty", rubric: null },
  "beauty/news-3": { section: "beauty", rubric: "news" },
  "beauty/tendencii": { section: "beauty", rubric: "cosmetic-bag" },
  "beauty/mnenie": { section: "beauty", rubric: "opinion" },
  "beauty/gid2": { section: "beauty", rubric: "cosmetic-bag" },

  // КУЛЬТУРА (из старых «Событий» и «Жизни»)
  "sobytija/kino": { section: "culture", rubric: "cinema" },
  "sobytija/iskusstvo": { section: "culture", rubric: "art" },
  "sobytija/teatr": { section: "culture", rubric: "theatre" },
  "sobytija/muzyka": { section: "culture", rubric: "music" },
  "sobytija/arhitektura": { section: "culture", rubric: "architecture" },
  "zhizn/music": { section: "culture", rubric: "music" },
  "zhizn/cinema": { section: "culture", rubric: "cinema" },
  "esquevideo": { section: "culture", rubric: null },

  // СОБЫТИЯ (без рубрик)
  "sobytija": { section: "events", rubric: null },
  "sobytija/news-5": { section: "events", rubric: null },
  "sobytija/afisha": { section: "events", rubric: null },
  "sobytija/novosti": { section: "events", rubric: null },
  "sobytija/jekspert": { section: "events", rubric: null },
  "sobytija/moda2": { section: "fashion", rubric: "news" },
  "svetskaja-hronika": { section: "events", rubric: null },
  "v-mire": { section: "events", rubric: null },
  "newsweek": { section: "events", rubric: null },

  // ПЕРСОНА
  "persona": { section: "persona", rubric: null },
  "persona/about-life": { section: "persona", rubric: "news" },
  "persona/intervju": { section: "persona", rubric: "interview" },
  "persona/dostizhenija": { section: "persona", rubric: "news" },
  "slovo-redaktora": { section: "persona", rubric: null },
  "kolumnist-nedeli": { section: "persona", rubric: null },
  "nashi-partnery": { section: "persona", rubric: null },

  // ПСИХОЛОГИЯ
  "psihologija": { section: "psychology", rubric: null },
  "psihologija/samosovershenstvovanie": { section: "psychology", rubric: "lifestyle" },
  "psihologija/intervju-2": { section: "psychology", rubric: "interview" },
  "psihologija/gid-3": { section: "psychology", rubric: "lifestyle" },
  "zhizn": { section: "psychology", rubric: "lifestyle" },

  // ПРОЕКТЫ (легаси-проекты — в раздел без рубрики, новые рубрики под новые инициативы)
  "projects-esque": { section: "projects", rubric: null },
  "projects-esque/fashion-bitva": { section: "projects", rubric: null },
  "projects-esque/russian-fashion-display": { section: "projects", rubric: null },
  "projects-esque/fashion-department-association": { section: "projects", rubric: null },
};

// Esque.kids (и все подрубрики) → архивная рубрика Персона/Esque.kids
const KIDS: Target = { section: "persona", rubric: "esque-kids" };

// Материалы без узнаваемого префикса
const FALLBACK: Target = { section: "events", rubric: null };

/** Целевой раздел/рубрика по префиксу старого URL. */
export function mapPrefix(prefix: string): Target {
  if (prefix.startsWith("esquekids")) return KIDS;
  return MAP[prefix] ?? FALLBACK;
}

/** Разобрать старый путь статьи `/a/b/123-slug.html` → части. null, если не статья. */
export function parseLegacyArticle(pathname: string): {
  prefix: string;
  legacyId: number;
  rest: string;
} | null {
  const m = pathname.match(/^\/(?:(.+)\/)?(\d+)-([^/]+)\.html$/);
  if (!m) return null;
  return { prefix: m[1] ?? "", legacyId: Number(m[2]), rest: m[3] };
}

/** Новый путь материала из частей старого URL. */
export function newArticlePath(prefix: string, legacyId: number, rest: string): string {
  const { section, rubric } = mapPrefix(prefix);
  const slug = `${legacyId}-${rest}`;
  return rubric ? `/${section}/${rubric}/${slug}` : `/${section}/${slug}`;
}

/** Новый путь для старой страницы рубрики/раздела (для 301 категорий). */
export function newCategoryPath(prefix: string): string {
  const { section, rubric } = mapPrefix(prefix);
  // Архивная рубрика Esque.kids не имеет индекса в навигации — ведём на раздел.
  if (!rubric || rubric === "esque-kids") return `/${section}`;
  return `/${section}/${rubric}`;
}
