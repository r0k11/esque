import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Старые рубрики DLE кончаются на «/». Отдаём их редирект прокси, а не даём
  // Next срезать слэш 308-м редиректом до того, как proxy увидит путь.
  skipTrailingSlashRedirect: true,
  images: {
    formats: ["image/avif", "image/webp"],
    // MinIO в dev и в compose живёт на приватном адресе — разрешаем оптимизатору
    dangerouslyAllowLocalIP: true,
    remotePatterns: [
      // MinIO (локальное S3-хранилище)
      { protocol: "http", hostname: "localhost", port: "9000" },
      { protocol: "http", hostname: "minio", port: "9000" },
      // Исходные изображения старого сайта на время миграции
      { protocol: "https", hostname: "esque.su" },
    ],
  },
};

export default nextConfig;
