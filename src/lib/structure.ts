/**
 * Структура разделов и рубрик издания (зафиксирована в ТЗ).
 * Единый источник: используется сидом БД, навигацией и генерацией sitemap.
 */
export type RubricDef = { slug: string; title: string };
export type SectionDef = { slug: string; title: string; rubrics: RubricDef[] };

export const SECTIONS: SectionDef[] = [
  {
    slug: "fashion",
    title: "Мода",
    rubrics: [
      { slug: "trends", title: "Тренды" },
      { slug: "runway", title: "Подиум" },
      { slug: "made-in-russia", title: "Сделано в России" },
      { slug: "news", title: "Новости" },
      { slug: "interview", title: "Интервью" },
      { slug: "business", title: "Бизнес" },
    ],
  },
  {
    slug: "beauty",
    title: "Красота",
    rubrics: [
      { slug: "cosmetic-bag", title: "Косметичка" },
      { slug: "news", title: "Новости" },
      { slug: "opinion", title: "Мнение" },
      { slug: "interview", title: "Интервью" },
    ],
  },
  {
    slug: "culture",
    title: "Культура",
    rubrics: [
      { slug: "cinema", title: "Кино" },
      { slug: "art", title: "Искусство" },
      { slug: "theatre", title: "Театр" },
      { slug: "music", title: "Музыка" },
      { slug: "architecture", title: "Архитектура" },
    ],
  },
  {
    slug: "persona",
    title: "Персона",
    rubrics: [
      { slug: "interview", title: "Интервью" },
      { slug: "news", title: "Новости" },
      { slug: "hero-of-month", title: "Герой месяца" },
    ],
  },
  {
    slug: "psychology",
    title: "Психология",
    rubrics: [
      { slug: "relationships", title: "Отношения" },
      { slug: "lifestyle", title: "Образ жизни" },
      { slug: "interview", title: "Интервью" },
    ],
  },
  { slug: "events", title: "События", rubrics: [] },
  {
    slug: "projects",
    title: "Проекты Esque.su",
    rubrics: [
      { slug: "industry", title: "Индустрия" },
      { slug: "eco-fashion-week", title: "Экологичная неделя моды" },
      { slug: "designers-festival", title: "Фестиваль российских дизайнеров" },
      { slug: "industry-club", title: "Industry.club" },
    ],
  },
];
