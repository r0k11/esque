# --- Зависимости ---
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# postinstall (prisma generate) здесь не выполнить — схемы ещё нет
RUN npm ci --ignore-scripts

# --- Сборка ---
FROM node:24-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Фиктивный URL: prisma generate и next build к БД не подключаются,
# но prisma.config.ts требует наличия переменной. В compose переопределяется.
ENV DATABASE_URL=postgresql://build:build@db:5432/build
# скрипты пропускались при npm ci: возвращаем нативные бинарники sharp/esbuild
RUN npm rebuild sharp esbuild
RUN npx prisma generate
RUN npm run build

# --- Рантайм (standalone) ---
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public
# Кэш оптимизатора изображений: без него next/image пережимает оригинал заново
# на КАЖДЫЙ запрос (у нас исходники до 4000x6000 — это секунды CPU на картинку).
# Каталог должен существовать и принадлежать пользователю рантайма.
RUN mkdir -p .next/cache/images && chown -R nextjs:nodejs .next
USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
