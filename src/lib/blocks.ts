/**
 * Блоки контента материала. Хранятся массивом в Post.content (JSON).
 * Один и тот же набор используется рендером страниц, админкой и миграцией.
 */
export type Block =
  | { type: "lead"; text: string }
  | { type: "paragraph"; html: string }
  | { type: "heading"; text: string }
  | { type: "quote"; text: string; author?: string }
  | { type: "image"; mediaId: string; caption?: string }
  | { type: "gallery"; items: GalleryItem[] }
  | { type: "embed"; html: string }
  | { type: "qa"; question: string; answer: string };

export type GalleryItem = { mediaId: string; caption?: string };

export function parseBlocks(content: unknown): Block[] {
  return Array.isArray(content) ? (content as Block[]) : [];
}

/** id всех изображений, задействованных в блоках (для выборки Media одним запросом). */
export function collectMediaIds(blocks: Block[]): string[] {
  const ids: string[] = [];
  for (const b of blocks) {
    if (b.type === "image") ids.push(b.mediaId);
    if (b.type === "gallery") ids.push(...b.items.map((i) => i.mediaId));
  }
  return ids;
}
