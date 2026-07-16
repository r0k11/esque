# Прогресс перезапуска esque.su

Обновляется после каждой итерации. Контекст: перезапуск русскоязычного онлайн-журнала
esque.su на Next.js, старый сайт — DataLife Engine, ~800 URL в sitemap.

## Ключевые решения (подтверждены заказчиком 2026-07-15)

- Доступа к хостингу/БД старого сайта НЕТ → миграция скрейпингом по https://esque.su/sitemap.xml
  (полный текст свежих записей есть в RSS `yandex:full-text`, остальное — парсинг HTML страниц).
- Маппинг старых рубрик: Street Style → Мода/Тренды; Pro Fashion Russia → Мода/Подиум;
  «В мире» → События; «От редакции» → по содержанию в Персону/Культуру;
  Fashion Bitva и Russian Fashion Display → Проекты; Esque.kids → архивная рубрика.
- Логотип ESQUE сохраняем текущий (взять со старого сайта).
- Комментарии НЕ переносим и не делаем.
- Админка: вход email + пароль, роли ADMIN / EDITOR / AUTHOR, без OAuth.
- URL: `/{section}/{rubric}/{slug}` латиницей; мигрированные слаги в форме `{id}-{slug}`;
  редиректы: таблица Redirect (материализованная из sitemap) + fallback-разбор `*/{id}-*.html`
  по legacyId в middleware.
- Шрифты: Prata (заголовки) + Golos Text (текст/UI), self-hosted через next/font.
- Палитра: бумага #FAF9F6, чернильный #141412, серые ступени, акцент — карминно-красный.
- Блоки контента — JSON-колонка `content` в Post (не отдельная таблица).
- Перед кодом админки показать заказчику сценарий «редактор публикует интервью с 12 фото»
  и дождаться подтверждения (требование ТЗ).

## Окружение разработчика (Windows 10 Home)

- Node.js 24 LTS установлен через winget 2026-07-15 (не было в системе).
- Docker Desktop 4.82 установлен через winget 2026-07-15 (заказчик подтвердил установку).
  Фичи Windows Microsoft-Windows-Subsystem-Linux и VirtualMachinePlatform включены через DISM.
  Docker Desktop выдал «Virtualization support not detected» — аппаратная виртуализация
  выключена в BIOS. Заказчик включает её в BIOS сам (2026-07-15). После включения:
  запустить Docker Desktop, принять лицензионное соглашение (GUI, делает заказчик),
  дождаться готовности движка. Затем: `npx prisma migrate dev --name init`,
  `npm run db:seed`, проверка `docker compose up --build`.
- npm блокирует install-скрипты (allow-scripts): sharp, prisma, @prisma/engines, esbuild,
  unrs-resolver одобрены через `npm approve-scripts`.
- Превью dev-сервера: .claude/launch.json запускает npm через cmd с добавлением
  C:\Program Files\nodejs в PATH (демон не видит свежеустановленный Node).

## Статус итераций

1. [x] Каркас проекта и Docker — create-next-app (Next 16.2.10, React 19, TS, без Tailwind),
       standalone-вывод, Dockerfile (multi-stage), docker-compose.yml (web/db/minio/minio-init),
       .env.example, README. Compose не проверен: нет Docker на машине.
2. [x] Схема БД и модели — prisma/schema.prisma (User, Section, Rubric, Post, Media, Tag,
       Redirect; Post.rubricId опционален — у «Событий» нет рубрик; content = JSON-блоки,
       типы в src/lib/blocks.ts). Prisma 7: datasource url в prisma.config.ts, драйвер-адаптер
       @prisma/adapter-pg (src/lib/prisma.ts). Сид prisma/seed.ts: структура из
       src/lib/structure.ts (единый источник для сида и навигации), 3 пользователя
       (admin/editor/author@esque.su, пароль esque-dev), 21 демо-материал всех типов,
       галерея на 12 фото, плейсхолдеры sharp → MinIO. В compose добавлены migrate и seed.
       НЕ выполнено: `prisma migrate dev` (нужна живая БД — ждёт Docker), сид не запускался.
3. [x] Дизайн-система и токены — globals.css (цвет/типографика/отступы/сетка/движение),
       Prata + Golos Text через next/font (self-hosted), Header (десктоп-нав + мобильный
       бургер на details без JS), Footer. Проверено на 375px в превью. Известное: превью-панель
       давала артефакты отрисовки (чёрные кадры) — стили меню проверены по computed style,
       перепроверить кликом на живой странице.
4. [x] Главная страница — Hero (свежий материал), промо-блок «Сделано в России»
       (env PROMO_MADE_IN_RUSSIA, позже настройка в админке), блоки разделов с тремя
       чередующимися мозаичными паттернами (SectionBlock). Кэширование: страницы с БД
       dynamic="force-dynamic" (при docker-сборке БД недоступна), данные через
       unstable_cache (revalidate 300, тег "posts" — публикация будет сбрасывать
       revalidateTag). next/image: в v16 приватные IP запрещены — включён
       images.dangerouslyAllowLocalIP для MinIO; проп priority заменён на preload
       (deprecated в v16). Проверено на 375/731/1280 (1280 — через DOM: превью-панель
       не умеет скриншотить шире своего окна ~731px).
5. [x] Страница рубрики и раздела — /[section] и /[section]/[child] (child = рубрика ИЛИ
       материал раздела без рубрик, например /events/slug), FeedPage с подменю рубрик,
       пагинация ?page=N («Новее/Раньше»), FeedGrid с циклической мозаикой, 404.
6. [x] Страница материала — /[section]/[child]/[slug], PostView + ArticleBody
       (лид, абзацы-html, заголовки, цитаты, картинки, embed, Q&A). Проверены
       интервью, статья, материал «Событий», 404.
7. [x] Галерея — GalleryViewer: мозаика превью + полноэкранный просмотр на scroll-snap
       (свайпы нативные, стрелки, клавиши, Escape, счётчик, подписи). ВАЖНО: оверлей
       рендерится через createPortal в body — иначе position:fixed ломается из-за
       анимированных предков (.rise анимирует transform).
       Проверен docker compose up --build: migrate/seed/web стартуют по depends_on,
       сайт работает из standalone-контейнера, критерий «одна команда» выполнен.
       Грабли Docker-сборки: npm ci --ignore-scripts (postinstall prisma generate до
       копирования схемы) + npm rebuild sharp esbuild; фиктивный DATABASE_URL на
       стадии build (prisma.config.ts требует переменную).
8. [x] Админка. Аутентификация: jose JWT в httpOnly-cookie (src/lib/session-crypto.ts —
       чистая крипта для proxy; src/lib/session.ts — cookie-хелперы; src/lib/dal.ts —
       requireSession/canPublish/canEditPost). proxy.ts (в Next 16 middleware = Proxy,
       Node-рантайм) — оптимистичный редирект /admin/* на /admin/login.
       Роли: AUTHOR создаёт/правит своё; EDITOR/ADMIN публикуют и правят чужое.
       Оболочка сайта вынесена в группу app/(site)/ (Header/Footer), корневой layout —
       только html/body/шрифты; у app/admin своя оболочка.
       Экраны: /admin/login, /admin (список со статусами), /admin/new (выбор типа →
       createDraft → редактор), /admin/edit/[id] (редактор), /admin/preview/[id]
       (PostView для любого статуса, доступ по сессии).
       Редактор (src/components/admin/Editor.tsx + BlockEditor.tsx): 3 шага (заголовок+лид →
       блоки → рубрика/обложка/публикация); блоки paragraph/heading/quote/qa/embed/image/
       gallery с drag-and-drop переупорядочиванием (нативный HTML5 DnD) и кнопками ↑↓✕;
       загрузка фото перетаскиванием в дропзону → POST /api/admin/upload (sharp: rotate,
       webp q90, blur-плейсхолдер → MinIO) → трей; «Собрать галерею из всех фото», выбор
       обложки кликом; автосохранение (дебаунс 1200мс, индикатор Сохранено); отложенная
       публикация (datetime-local → статус SCHEDULED); публикация генерит слаг транслитом
       (src/lib/slug.ts), уникализирует, revalidateTag("posts","max").
       ПРОВЕРЕНО сквозным сценарием в браузере: логин editor@esque.su → новый Интервью →
       дроп 12 фото (2.8с) → галерея из 12 + обложка + 2 Q&A → автосохранение →
       Опубликовать → материал на сайте по /fashion/interview/my-shem-to-... с рабочей
       полноэкранной галереей (12 кадров). tsc + lint чисты.
       Грабли Next 16: revalidateTag требует 2 аргумента (tag, "max"); при переносе
       маршрутов в (site) удалить .next — иначе стейл-типы валидатора.
9. [x] Скрипт миграции — scripts/migrate.ts + scripts/url-map.ts (карта старых
       префиксов → раздел/рубрика). Источник — https://esque.su/sitemap.xml (614 URL:
       555 статей, 58 рубрик, доступа к дампу нет → скрейпинг cheerio). На статью:
       h1.entry-title → заголовок; itemprop=datePublished («16-авг-2025») → дата;
       og:image (/uploads/) → обложка; текст из .full-story (p/h2/h3/blockquote/iframe);
       фото статьи — все /uploads/posts/ на странице, КРОМЕ обложки и картинок,
       завёрнутых в ссылку на другую статью (это миниатюры блока «похожие»!) → галерея
       (или одиночное фото); .tags a → теги. Автор — служебный «Редакция Esque»
       (redaktsiya@esque.su), в исходнике авторов нет. Изображения: оригинал (без потерь)
       в MinIO, размеры/блюр через sharp, идемпотентность по Media.sourceUrl.
       Post upsert по legacyId; Redirect old→new (301) на каждую статью и рубрику;
       если исходник 404 — всё равно 301 на раздел (старый URL не должен давать 404).
       Идемпотентно (перезапуск обновляет). Лог: scripts/output/migrate-log.json.
       Запуск: `npm run migrate` (весь), `npm run migrate -- --limit N --offset M`.
       ПОЛНЫЙ ПРОГОН ВЫПОЛНЕН: перенесено 546 из 555 статей, 1734 изображения,
       613 редиректов. 9 ошибок — все HTTP 404 на самом источнике (мёртвые записи
       sitemap), для них создан fallback-301 на раздел. Все 555 старых адресов статей
       имеют редирект (546 на страницы + 9 fallback) + 58 редиректов рубрик = покрытие
       старых URL 100%. Распределение по разделам: События 196, Мода 136, Персона 84,
       Красота 38, Психология 34, Проекты 30, Культура 28. Материалы с галереями (до 15
       фото) рендерят обложку/текст/мозаику/полноэкранный просмотр — проверено в браузере.
       Теги пусты (источник не отдаёт .tags в HTML). Блок «похожие» отсекается корректно.
       ЧИСТКА ПЕРЕД ЗАПУСКОМ: в БД соседствует 21 демо-материал из сида (без legacyId) —
       удалить перед продакшеном отдельным шагом.
       ВАЖНО: не гонять `npm run build` (prod) при работающем `next dev` — портит .next,
       динамические маршруты начинают отдавать 404; лечится `rm -rf .next` + рестарт dev.
10. [x] SEO — src/lib/seo.ts (SITE_URL/absolute/jsonLdScript/organizationJsonLd; absolute()
       не трогает уже абсолютные URL медиа — иначе og:image склеивался в
       site.ru/http://minio...). Метатеги: канонические URL на главной, разделе, рубрике
       и материале; OG (article с published_time/author/section/image, website для лент)
       + twitter summary_large_image; шаблон title и RSS-alternate в корневом layout.
       JSON-LD: Organization (главная), Article/NewsArticle по типу материала +
       BreadcrumbList (страница материала). Крошки: src/components/Breadcrumbs.tsx —
       видимые «Главная / Раздел / Рубрика» (заголовок не дублируем, он H1 рядом),
       в JSON-LD цепочка полная, с заголовком.
       robots.ts (Disallow /admin, /api + ссылка на sitemap).
       Sitemap разбит по разделам явными route handlers (полный контроль над
       sitemapindex): /sitemap.xml — индекс, /sitemaps/{раздел}.xml — раздел + рубрики +
       его материалы, /sitemaps/pages.xml — главная и разделы. RSS: /rss.xml (50 свежих).
       ПРОВЕРЕНО: robots/sitemap/RSS отдают 200 и верный content-type; fashion.xml — 143
       URL, culture.xml — 34, pages.xml — 8, RSS — 50 записей; на материале canonical,
       og:image (реальный URL медиа), Article + BreadcrumbList; на главной Organization.
       НЕ сделано: Lighthouse-замер (Performance ≥ 90, SEO = 100) — нужен прогон на
       продакшен-сборке.
11. [x] Редиректы и проверка ссылок — src/proxy.ts (ВАЖНО: при использовании src/ файл
       должен лежать в src/, в корне Next его НЕ видит — раньше админку защищал только
       requireSession, а proxy молча не работал). Логика: защита /admin + для «старых»
       путей (кончаются на .html или на «/») поиск в таблице Redirect по fromPath → 301;
       fallback по legacyId для `*/{id}-*.html` (DLE отдавал статью по id при любом
       слаге — повторяем, покрывает старые ссылки с изменённым слагом); прочие .html
       без совпадения → 301 на главную. В next.config: skipTrailingSlashRedirect — иначе
       Next срезает «/» 308-м редиректом ДО proxy и старые рубрики не находятся.
       scripts/check-links.ts (`npm run check-links`): гоняет весь старый sitemap против
       локального сайта, разворачивает цепочки редиректов, падает с кодом 1 при 404/5xx.
       РЕЗУЛЬТАТ: 614/614 старых URL отдают 200 (напрямую или через 301), 404 — ноль.
       Грабли: браузерный fetch кэширует ответы и с redirect:'manual' прячет 3xx как
       status 0 — проверять цепочки надёжнее через Node (см. check-links).
       Демо-контент сида удалён (22 материала + 59 медиа) — в БД только мигрированное.

## Доработки вне итераций

- Sticky-шапка (2026-07-15, по запросу заказчика): на десктопе логотип уезжает,
  строка разделов прилипает (header position:sticky, top: -96px = высота строки логотипа);
  на мобильном прилипает вся шапка (64px). ГРАБЛИ: overflow-x:hidden на html/body ломает
  sticky — заменён на overflow-x:clip; блокировка скролла при открытых оверлеях — на
  documentElement, НЕ на body (overflow на body делает его скролл-контейнером и sticky отваливается).
- Подрубрики в шапке: на десктопе выпадающие списки по hover/focus-within
  (мост padding-top против «проваливания» курсора, translate вместо transform);
  на мобильном меню — клиентский MobileMenu с details-аккордеонами по разделам,
  «Все материалы» + рубрики, автозакрытие по usePathname, скролл-лок на html.

## Следующий шаг

Все итерации 1-11 закрыты. Осталась финальная приёмка по критериям ТЗ:
- Lighthouse на продакшен-сборке: Performance ≥ 90, SEO = 100 (главная + материал).
- Мобильная вёрстка на 375/768/1440 (проверялась выборочно, нужен полный проход).
- `docker compose up --build` на текущем состоянии (проверялся до миграции).
Также к запуску: NEXT_PUBLIC_SITE_URL=https://esque.su (сейчас localhost — от него
зависят canonical/OG/sitemap), заменить AUTH_SECRET, сменить пароли пользователей.
