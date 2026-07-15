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
5. [ ] Страница рубрики и раздела.
6. [ ] Страница материала: статья, новость, интервью (Q&A), спецпроект.
7. [ ] Галерея («Сделано в России»): полноэкранный просмотр, свайпы, подписи.
8. [ ] Админка (3 шага публикации, блочный редактор, drag-and-drop, автосохранение,
       планировщик, превью, роли). Сначала — сценарий на подтверждение!
9. [ ] Скрипт миграции (sitemap → парсинг → нормализация → импорт, идемпотентно, с логом).
10. [ ] SEO: метатеги, OG, JSON-LD, sitemap.xml по разделам, robots, RSS, канонические URL, крошки.
11. [ ] Редиректы и скрипт проверки: 100% старых URL отдают 200/301, ни одного 404.

## Следующий шаг

Итерация 2: prisma + схема БД + сидинг разделов/рубрик из ТЗ.
