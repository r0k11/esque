/**
 * Хранилище медиа. Два движка за одним интерфейсом:
 *
 *   MinIO (S3)   — локальная разработка и docker compose. Живёт в контейнере.
 *   Vercel Blob  — демо/прод на Vercel, где контейнера с MinIO нет.
 *
 * Движок выбирается сам: на Vercel платформа подставляет BLOB_READ_WRITE_TOKEN,
 * локально его нет. Отдельного переключателя не заводим — лишняя переменная,
 * которую забудут выставить.
 *
 * ВАЖНО: mediaUrl() зовут только серверные компоненты. Токен и *_PUBLIC_URL —
 * не NEXT_PUBLIC_, в браузере их нет, и при вызове из клиентского компонента
 * получились бы битые ссылки.
 */
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { put } from "@vercel/blob";

const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
const useBlob = Boolean(blobToken);

// --- S3 / MinIO ---
const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: "us-east-1",
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY ?? "",
    secretAccessKey: process.env.S3_SECRET_KEY ?? "",
  },
});

export const S3_BUCKET = process.env.S3_BUCKET ?? "media";

/**
 * Публичная база хранилища Blob. Обычно задаётся BLOB_PUBLIC_URL, но её легко
 * забыть, поэтому выводим из токена: он имеет вид vercel_blob_rw_<storeId>_<...>,
 * а публичный хост — <storeId>.public.blob.vercel-storage.com.
 */
function blobBase(): string {
  const explicit = process.env.BLOB_PUBLIC_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const storeId = blobToken?.split("_")[3];
  if (!storeId) throw new Error("Не выводится адрес Blob: задайте BLOB_PUBLIC_URL");
  return `https://${storeId}.public.blob.vercel-storage.com`;
}

export async function uploadObject(key: string, body: Buffer, contentType: string) {
  if (useBlob) {
    // addRandomSuffix по умолчанию false — URL остаётся предсказуемым из ключа,
    // иначе mediaUrl() не смог бы собрать адрес и ключ пришлось бы хранить в БД.
    // allowOverwrite: повторный залив того же ключа иначе падает ошибкой.
    await put(key, body, {
      access: "public",
      contentType,
      token: blobToken,
      allowOverwrite: true,
    });
    return key;
  }
  await s3.send(
    new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, Body: body, ContentType: contentType })
  );
  return key;
}

/** Скачать объект из хранилища. */
export async function getObject(key: string): Promise<Buffer> {
  if (useBlob) {
    const res = await fetch(`${blobBase()}/${key}`);
    if (!res.ok) throw new Error(`Не удалось скачать ${key}: HTTP ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  const res = await s3.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }));
  return Buffer.from(await res.Body!.transformToByteArray());
}

/** Публичный URL файла (для браузера). */
export function mediaUrl(key: string) {
  if (useBlob) return `${blobBase()}/${key}`;
  return `${process.env.S3_PUBLIC_URL ?? "http://localhost:9000/media"}/${key}`;
}
