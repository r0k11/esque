# esque.su — новый сайт

Онлайн-журнал: Next.js (App Router) + TypeScript + PostgreSQL (Prisma) + MinIO.

## Запуск через Docker (продакшен-сборка)

```bash
cp .env.example .env
docker compose up --build
```

Поднимаются сервисы: `web` (сайт, http://localhost:3000), `db` (PostgreSQL),
`minio` (медиа-хранилище, консоль http://localhost:9001), `minio-init` (создание бакета).
Миграции БД и сидинг тестового контента выполняются сервисами `migrate` и `seed`
(добавляются вместе со схемой БД).

## Локальная разработка

```bash
cp .env.example .env
docker compose up db minio minio-init   # только инфраструктура
npm install
npm run dev                             # http://localhost:3000
```

## Структура

- `src/app` — маршруты (App Router), серверные компоненты по умолчанию
- `prisma/` — схема БД и миграции
- `scripts/` — миграция контента со старого сайта, проверка редиректов

Статус работы и следующие шаги — в [progress.md](progress.md).
