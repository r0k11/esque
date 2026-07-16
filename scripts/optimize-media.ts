/**
 * Уменьшение мастер-копий изображений.
 *
 * Зачем: со старого сайта пришли исходники до 4000x6000 (24 Мп). next/image
 * пережимает их на лету под каждую ширину, и первый посетитель каждого варианта
 * ждёт ~3 секунды CPU. На экране обложка занимает максимум 1080 CSS-пикселей,
 * то есть даже при DPR 2 хватает ~2160px — всё выше этого работает только на
 * нагрев процессора.
 *
 * Что делает: ужимает по длинной стороне до MAX_SIDE, кладёт обратно в MinIO
 * тем же ключом, обновляет width/height в БД.
 *
 * Обратимость: в Media.sourceUrl хранится адрес оригинала на старом сайте —
 * при необходимости оригинал всегда можно перекачать заново (см. migrate.ts).
 *
 * Идемпотентность: изображения не больше MAX_SIDE пропускаются, так что скрипт
 * можно запускать повторно.
 *
 * Запуск:  npm run optimize-media
 *          npm run optimize-media -- --max 2048 --dry
 */
import "dotenv/config";
import sharp from "sharp";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { getFromS3, uploadToS3 } from "../src/lib/s3";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const args = process.argv.slice(2);
const argVal = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const MAX_SIDE = Number(argVal("--max") ?? 2048);
const DRY = args.includes("--dry");

async function main() {
  const all = await prisma.media.findMany({
    select: { id: true, key: true, width: true, height: true, mimeType: true },
    orderBy: { createdAt: "asc" },
  });
  const big = all.filter((m) => Math.max(m.width, m.height) > MAX_SIDE);
  console.log(
    `Всего медиа: ${all.length}. Больше ${MAX_SIDE}px: ${big.length}${DRY ? " (пробный прогон)" : ""}`
  );
  if (DRY || big.length === 0) {
    for (const m of big.slice(0, 5)) console.log(`  ${m.width}x${m.height}  ${m.key}`);
    return;
  }

  let done = 0;
  let savedBytes = 0;
  for (const m of big) {
    try {
      const original = await getFromS3(m.key);
      const pipeline = sharp(original).resize({
        width: MAX_SIDE,
        height: MAX_SIDE,
        fit: "inside",
        withoutEnlargement: true,
      });

      // сохраняем исходный формат, качество близкое к оригиналу
      const isPng = m.mimeType.includes("png");
      const out = isPng
        ? await pipeline.png({ compressionLevel: 9 }).toBuffer()
        : await pipeline.jpeg({ quality: 85, mozjpeg: true }).toBuffer();
      const meta = await sharp(out).metadata();

      await uploadToS3(m.key, out, m.mimeType);
      await prisma.media.update({
        where: { id: m.id },
        data: { width: meta.width ?? m.width, height: meta.height ?? m.height },
      });

      savedBytes += original.length - out.length;
      done++;
      if (done % 50 === 0) console.log(`  ${done}/${big.length}…`);
    } catch (e) {
      console.error(`ОШИБКА ${m.key}: ${e}`);
    }
  }

  console.log(
    `Готово: ужато ${done} из ${big.length}, освобождено ${(savedBytes / 1024 / 1024).toFixed(1)} МБ`
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
