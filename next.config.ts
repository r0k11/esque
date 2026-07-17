import type { NextConfig } from "next";

/**
 * Хост, с которого браузер берёт картинки. Локально это MinIO на localhost:9000
 * (S3_PUBLIC_URL), на демо/проде — Vercel Blob. Разбираем URL, чтобы не держать
 * список хостов руками: хранилище меняется переменной окружения, не кодом.
 */
function mediaPattern() {
  const raw = process.env.BLOB_PUBLIC_URL ?? process.env.S3_PUBLIC_URL;
  if (!raw) return [];
  try {
    const { protocol, hostname, port } = new URL(raw);
    return [{ protocol: protocol.replace(":", "") as "http" | "https", hostname, port }];
  } catch {
    return [];
  }
}

const isDocker = process.env.BUILD_TARGET === "docker";

const nextConfig: NextConfig = {
  // standalone нужен только образу Docker. На Vercel он ломает сборку:
  // платформа сама пакует функции и ждёт обычный вывод.
  ...(isDocker ? { output: "standalone" as const } : {}),
  // Старые рубрики DLE кончаются на «/». Отдаём их редирект прокси, а не даём
  // Next срезать слэш 308-м редиректом до того, как proxy увидит путь.
  skipTrailingSlashRedirect: true,
  images: {
    formats: ["image/avif", "image/webp"],
    // MinIO в dev и в compose живёт на приватном адресе — разрешаем оптимизатору.
    // На проде хранилище публичное, и снимать этот флаг незачем: он влияет
    // только на приватные адреса, которых там не будет.
    dangerouslyAllowLocalIP: true,
    remotePatterns: [
      ...mediaPattern(),
      // Vercel Blob: адрес хранилища выводится из токена и BLOB_PUBLIC_URL может
      // быть не задан — без этого шаблона оптимизатор резал бы все картинки демо
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      // Запасные хосты MinIO: dev без .env и web внутри compose
      { protocol: "http", hostname: "localhost", port: "9000" },
      { protocol: "http", hostname: "minio", port: "9000" },
      // Исходные изображения старого сайта на время миграции
      { protocol: "https", hostname: "esque.su" },
    ],
  },
};

export default nextConfig;
