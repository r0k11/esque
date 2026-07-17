/**
 * Сид: разделы/рубрики из ТЗ, пользователи трёх ролей, демо-контент.
 * Идемпотентен — повторный запуск ничего не дублирует (upsert по уникальным ключам).
 * Изображения-плейсхолдеры генерируются sharp и заливаются в MinIO.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import sharp from "sharp";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import type { Block } from "../src/lib/blocks";
import { uploadObject } from "../src/lib/storage";
import { SECTIONS } from "../src/lib/structure";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// Приглушённая редакционная палитра для плейсхолдеров
const HUES: [string, string][] = [
  ["#c3b5a0", "#8a8f84"],
  ["#b45a4b", "#2e2b28"],
  ["#a9b4bd", "#6e6a63"],
  ["#d8cfc2", "#b45a4b"],
  ["#6e6a63", "#c3b5a0"],
  ["#2e2b28", "#a9b4bd"],
];

async function makeImage(key: string, w: number, h: number, hue: number, alt: string) {
  const [c1, c2] = HUES[hue % HUES.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
    </linearGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#g)"/>
    <circle cx="${w * 0.72}" cy="${h * 0.3}" r="${Math.min(w, h) * 0.22}" fill="${c2}" opacity="0.35"/>
  </svg>`;
  const buf = await sharp(Buffer.from(svg)).jpeg({ quality: 82 }).toBuffer();
  const blur = await sharp(buf).resize(12).jpeg({ quality: 40 }).toBuffer();
  await uploadObject(key, buf, "image/jpeg");
  return prisma.media.upsert({
    where: { key },
    update: {},
    create: {
      key,
      width: w,
      height: h,
      mimeType: "image/jpeg",
      alt,
      blurDataUrl: `data:image/jpeg;base64,${blur.toString("base64")}`,
    },
  });
}

async function main() {
  // 1. Разделы и рубрики
  for (const [i, s] of SECTIONS.entries()) {
    const section = await prisma.section.upsert({
      where: { slug: s.slug },
      update: { title: s.title, order: i },
      create: { slug: s.slug, title: s.title, order: i },
    });
    for (const [j, r] of s.rubrics.entries()) {
      await prisma.rubric.upsert({
        where: { sectionId_slug: { sectionId: section.id, slug: r.slug } },
        update: { title: r.title, order: j },
        create: { sectionId: section.id, slug: r.slug, title: r.title, order: j },
      });
    }
  }
  // Архивная рубрика для контента Esque.kids (в навигации не показывается)
  const persona = await prisma.section.findUniqueOrThrow({ where: { slug: "persona" } });
  await prisma.rubric.upsert({
    where: { sectionId_slug: { sectionId: persona.id, slug: "esque-kids" } },
    update: {},
    create: { sectionId: persona.id, slug: "esque-kids", title: "Esque.kids", order: 99, archived: true },
  });
  console.log("Разделы и рубрики: ok");

  // 2. Пользователи
  const users = [
    { email: "admin@esque.su", name: "Администратор", role: "ADMIN" as const },
    { email: "editor@esque.su", name: "Мария Редакторова", role: "EDITOR" as const },
    { email: "author@esque.su", name: "Анна Авторова", role: "AUTHOR" as const },
  ];
  const password = process.env.SEED_PASSWORD ?? "esque-dev";
  const passwordHash = await bcrypt.hash(password, 10);
  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { role: u.role },
      create: { ...u, passwordHash },
    });
  }
  const editor = await prisma.user.findUniqueOrThrow({ where: { email: "editor@esque.su" } });
  console.log("Пользователи: ok (пароль для всех: " + password + ")");

  // 3. Демо-материалы — только в пустую базу.
  // Иначе `docker compose up` на рабочей базе подмешал бы демо к реальным
  // материалам (в т.ч. к мигрированным со старого сайта).
  const existing = await prisma.post.count();
  if (existing > 0) {
    console.log(`Демо-материалы: пропущены — в базе уже есть материалы (${existing})`);
    return;
  }
  const rubricOf = async (section: string, rubric?: string) => {
    const s = await prisma.section.findUniqueOrThrow({ where: { slug: section } });
    if (!rubric) return { sectionId: s.id, rubricId: null };
    const r = await prisma.rubric.findUniqueOrThrow({
      where: { sectionId_slug: { sectionId: s.id, slug: rubric } },
    });
    return { sectionId: s.id, rubricId: r.id };
  };

  const para = (t: string): Block => ({ type: "paragraph", html: t });
  const demoText = [
    para(
      "Российская мода переживает момент, когда локальное перестало быть нишевым: молодые марки выходят из шоурумов в универмаги, а байеры всё чаще смотрят не на лейбл, а на крой."
    ),
    para(
      "Мы поговорили с теми, кто делает индустрию руками — от закройщиков до основателей брендов — и собрали главное: цифры, имена и вещи, которые стоит запомнить в этом сезоне."
    ),
    { type: "quote", text: "Хороший дизайн не кричит. Он держит спину.", author: "Из разговора с дизайнером" } as Block,
    para(
      "Сезон подтверждает: аккуратная работа с тканью и честная цена собирают вокруг марки постоянную аудиторию быстрее любой рекламы. Дальше — больше: календарь показов уже свёрстан."
    ),
  ];

  type Demo = {
    slug: string;
    title: string;
    subtitle?: string;
    type: "ARTICLE" | "GALLERY" | "INTERVIEW" | "NEWS" | "SPECIAL";
    section: string;
    rubric?: string;
    ratio: [number, number];
    daysAgo: number;
  };
  const demos: Demo[] = [
    { slug: "veshchi-sezona-oseni", title: "Двенадцать вещей сезона: что носить этой осенью", subtitle: "От пальто-халата до правильного трикотажа — выбор редакции", type: "ARTICLE", section: "fashion", rubric: "trends", ratio: [1600, 2000], daysAgo: 1 },
    { slug: "pokaz-kruzhevo-i-beton", title: "Кружево и бетон: главный показ недели", subtitle: "Репортаж из первого ряда", type: "ARTICLE", section: "fashion", rubric: "runway", ratio: [1920, 1080], daysAgo: 2 },
    { slug: "sdelano-v-rossii-kollekcia-one", title: "Сделано в России: съёмка первой коллекции", subtitle: "Галерея: двенадцать образов, снятых в первый день показов", type: "GALLERY", section: "fashion", rubric: "made-in-russia", ratio: [1600, 2000], daysAgo: 0 },
    { slug: "novost-otkrytie-shourooma", title: "В Москве открылся шоурум молодых дизайнеров", type: "NEWS", section: "fashion", rubric: "news", ratio: [1600, 1600], daysAgo: 1 },
    { slug: "intervyu-osnovatelnica-marki", title: "«Мы шьём то, что сами хотим носить»: разговор с основательницей марки", subtitle: "О производстве в регионах, ценах на ткань и планах на сезон", type: "INTERVIEW", section: "fashion", rubric: "interview", ratio: [1600, 2000], daysAgo: 3 },
    { slug: "biznes-strategiya-lokalnogo-brenda", title: "Стратегия локального бренда: как расти без инвестора", type: "ARTICLE", section: "fashion", rubric: "business", ratio: [1920, 1080], daysAgo: 5 },
    { slug: "kosmetichka-uhod-osenyu", title: "Косметичка: уход, который работает осенью", type: "ARTICLE", section: "beauty", rubric: "cosmetic-bag", ratio: [1600, 1600], daysAgo: 2 },
    { slug: "mnenie-o-chistoy-krasote", title: "Мнение: «чистая красота» — маркетинг или новая норма?", type: "ARTICLE", section: "beauty", rubric: "opinion", ratio: [1600, 2000], daysAgo: 4 },
    { slug: "beauty-novost-zapusk-linii", title: "Российская марка запустила линию ухода за волосами", type: "NEWS", section: "beauty", rubric: "news", ratio: [1920, 1080], daysAgo: 1 },
    { slug: "kino-premiery-mesyaca", title: "Кино месяца: пять премьер, ради которых стоит выйти из дома", type: "ARTICLE", section: "culture", rubric: "cinema", ratio: [1920, 1080], daysAgo: 2 },
    { slug: "iskusstvo-yarmarka-sovremennogo", title: "Ярмарка современного искусства: имена, цены, впечатления", type: "ARTICLE", section: "culture", rubric: "art", ratio: [1600, 2000], daysAgo: 6 },
    { slug: "teatr-premiere-sezona", title: "Театральная премьера сезона: зачем идти и что читать до", type: "ARTICLE", section: "culture", rubric: "theatre", ratio: [1600, 1600], daysAgo: 7 },
    { slug: "muzyka-novye-imena", title: "Новые имена: кого слушать этой осенью", type: "ARTICLE", section: "culture", rubric: "music", ratio: [1920, 1080], daysAgo: 8 },
    { slug: "arhitektura-novaya-moskva", title: "Архитектура новой Москвы: десять зданий последних лет", type: "ARTICLE", section: "culture", rubric: "architecture", ratio: [1600, 2000], daysAgo: 9 },
    { slug: "geroy-mesyaca-khoreograf", title: "Герой месяца: хореограф, который ставит моду в движение", subtitle: "Большой разговор о теле, сцене и дисциплине", type: "INTERVIEW", section: "persona", rubric: "hero-of-month", ratio: [1600, 2000], daysAgo: 0 },
    { slug: "persona-intervyu-hudozhnica", title: "«Я не выбирала искусство — оно само»: интервью с художницей", type: "INTERVIEW", section: "persona", rubric: "interview", ratio: [1600, 2000], daysAgo: 4 },
    { slug: "psihologiya-otnosheniya-granicy", title: "Личные границы: почему «нет» — полное предложение", type: "ARTICLE", section: "psychology", rubric: "relationships", ratio: [1600, 1600], daysAgo: 3 },
    { slug: "obraz-zhizni-utro-bez-telefona", title: "Образ жизни: неделя без телефона по утрам — опыт редакции", type: "ARTICLE", section: "psychology", rubric: "lifestyle", ratio: [1920, 1080], daysAgo: 5 },
    { slug: "sobytie-nedelya-mody", title: "Как прошла неделя моды: главные вечера и гости", type: "NEWS", section: "events", ratio: [1920, 1080], daysAgo: 1 },
    { slug: "proekt-eko-nedelya-mody", title: "Экологичная неделя моды: манифест и программа", subtitle: "Спецпроект Esque.su об осознанном производстве", type: "SPECIAL", section: "projects", rubric: "eco-fashion-week", ratio: [1920, 1080], daysAgo: 2 },
    { slug: "proekt-festival-dizaynerov", title: "Фестиваль российских дизайнеров: как это было", type: "ARTICLE", section: "projects", rubric: "designers-festival", ratio: [1600, 2000], daysAgo: 10 },
  ];

  for (const [i, d] of demos.entries()) {
    const cover = await makeImage(`seed/${d.slug}.jpg`, d.ratio[0], d.ratio[1], i, d.title);
    const where = await rubricOf(d.section, d.rubric);
    let content: Block[] = [];
    if (d.type === "GALLERY") {
      const items = [];
      for (let n = 1; n <= 12; n++) {
        const img = await makeImage(`seed/${d.slug}-${n}.jpg`, 1600, 2000, i + n, `Образ ${n}`);
        items.push({ mediaId: img.id, caption: `Образ ${n} из коллекции` });
      }
      content = [{ type: "gallery", items }];
    } else if (d.type === "INTERVIEW") {
      content = [
        para("Мы встретились в мастерской — среди отрезов ткани, лекал и кофе, который так и остался нетронутым."),
        { type: "qa", question: "С чего всё началось?", answer: "С того, что я не нашла вещь, которую хотела купить. Пришлось сшить. Потом ещё одну — для подруги." },
        { type: "qa", question: "Что самое сложное в производстве в России?", answer: "Ткани. Хорошие приходится искать месяцами, а закупать — небольшими партиями по цене крыла самолёта." },
        { type: "qa", question: "Какая вещь из коллекции — ваша любимая?", answer: "Пальто без единой пуговицы. Оно держится на правильном крое — как всё хорошее в жизни." },
      ];
    } else if (d.type === "NEWS") {
      content = [para("Коротко о главном: событие прошло, детали внутри. Даты, имена и адреса — в тексте новости.")];
    } else {
      content = [...demoText];
    }
    const publishedAt = new Date(Date.now() - d.daysAgo * 864e5);
    await prisma.post.upsert({
      where: { slug: d.slug },
      update: { coverId: cover.id, content: content as object[] },
      create: {
        slug: d.slug,
        title: d.title,
        subtitle: d.subtitle,
        type: d.type,
        status: "PUBLISHED",
        publishedAt,
        coverId: cover.id,
        authorId: editor.id,
        content: content as object[],
        ...where,
      },
    });
  }
  console.log(`Демо-материалы: ok (${demos.length} шт.)`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
