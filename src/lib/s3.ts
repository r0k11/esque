import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: "us-east-1",
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
});

export const S3_BUCKET = process.env.S3_BUCKET ?? "media";

export async function uploadToS3(key: string, body: Buffer, contentType: string) {
  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  return key;
}

/** Публичный URL файла в бакете (для браузера). */
export function mediaUrl(key: string) {
  return `${process.env.S3_PUBLIC_URL ?? "http://localhost:9000/media"}/${key}`;
}
