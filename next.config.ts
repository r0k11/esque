import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    formats: ["image/avif", "image/webp"],
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
