import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { getSession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { uploadObject, mediaUrl } from "@/lib/storage";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const form = await request.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) return Response.json({ error: "Нет файлов" }, { status: 400 });

  const results = [];
  for (const file of files) {
    const input = Buffer.from(await file.arrayBuffer());
    // rotate() запекает EXIF-ориентацию: ширина/высота совпадут с пикселями на экране
    const normalized = sharp(input).rotate();
    const meta = await normalized.metadata();
    const body = await normalized.clone().webp({ quality: 90 }).toBuffer();
    const blur = await normalized
      .clone()
      .resize(12)
      .jpeg({ quality: 40 })
      .toBuffer();

    const key = `uploads/${randomUUID()}.webp`;
    await uploadObject(key, body, "image/webp");

    const media = await prisma.media.create({
      data: {
        key,
        width: meta.width ?? 0,
        height: meta.height ?? 0,
        mimeType: "image/webp",
        blurDataUrl: `data:image/jpeg;base64,${blur.toString("base64")}`,
        uploadedById: session.userId,
      },
    });

    results.push({
      id: media.id,
      url: mediaUrl(media.key),
      width: media.width,
      height: media.height,
      alt: "",
      caption: "",
    });
  }

  return Response.json({ media: results });
}
