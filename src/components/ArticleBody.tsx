import Image from "next/image";
import type { MediaItem } from "@/lib/queries";
import type { Block } from "@/lib/blocks";
import { mediaUrl } from "@/lib/storage";
import { GalleryViewer } from "./GalleryViewer";
import { Reveal } from "./Reveal";
import styles from "./ArticleBody.module.css";

type Props = {
  blocks: Block[];
  media: Map<string, MediaItem>;
};

function Figure({ item, sizes }: { item: MediaItem; sizes: string }) {
  return (
    <figure className={styles.figure}>
      <Image
        src={mediaUrl(item.key)}
        alt={item.alt ?? ""}
        width={item.width}
        height={item.height}
        sizes={sizes}
        placeholder={item.blurDataUrl ? "blur" : "empty"}
        blurDataURL={item.blurDataUrl ?? undefined}
        className={styles.figureImage}
      />
      {(item.caption || item.credit) && (
        <figcaption className={styles.caption}>
          {item.caption}
          {item.credit && <span className={styles.credit}> © {item.credit}</span>}
        </figcaption>
      )}
    </figure>
  );
}

/**
 * Буквица уместна, только если абзац начинается с буквы. Если текст открывается
 * числом (например, датой «21 февраля 2024»), CSS ::first-letter вырывает из
 * него первую цифру — получается «2» буквицей и осиротевшее «1 февраля».
 */
function canTakeDropCap(html: string): boolean {
  const text = html.replace(/<[^>]+>/g, "").trimStart();
  return /^[«"'(\[]?[A-Za-zА-Яа-яЁё]/.test(text);
}

export function ArticleBody({ blocks, media }: Props) {
  // Буквица — только у первого абзаца материала, и только если он с буквы
  const firstIndex = blocks.findIndex((b) => b.type === "paragraph");
  const first = firstIndex >= 0 ? blocks[firstIndex] : null;
  const firstParagraph =
    first && first.type === "paragraph" && canTakeDropCap(first.html) ? firstIndex : -1;

  return (
    <div className={styles.body}>
      {blocks.map((block, i) => {
        switch (block.type) {
          case "lead":
            return block.text ? (
              <p key={i} className={styles.lead}>
                {block.text}
              </p>
            ) : null;
          case "paragraph":
            return (
              <p
                key={i}
                className={i === firstParagraph ? styles.dropCap : undefined}
                dangerouslySetInnerHTML={{ __html: block.html }}
              />
            );
          case "heading":
            return <h2 key={i}>{block.text}</h2>;
          case "quote":
            return (
              <Reveal key={i}>
                <blockquote className={styles.quote}>
                  <p>{block.text}</p>
                  {block.author && <cite>{block.author}</cite>}
                </blockquote>
              </Reveal>
            );
          case "image": {
            const item = media.get(block.mediaId);
            if (!item) return null;
            return (
              <Reveal key={i}>
                <Figure
                  item={{ ...item, caption: block.caption ?? item.caption }}
                  sizes="(max-width: 767px) 100vw, 720px"
                />
              </Reveal>
            );
          }
          case "gallery": {
            const items = block.items.flatMap((g) => {
              const item = media.get(g.mediaId);
              if (!item) return [];
              return [
                {
                  url: mediaUrl(item.key),
                  width: item.width,
                  height: item.height,
                  alt: item.alt ?? "",
                  caption: g.caption ?? item.caption,
                  blurDataUrl: item.blurDataUrl,
                },
              ];
            });
            return (
              <Reveal key={i} className={styles.galleryBlock}>
                <GalleryViewer items={items} />
              </Reveal>
            );
          }
          case "embed":
            return (
              <div
                key={i}
                className={styles.embed}
                dangerouslySetInnerHTML={{ __html: block.html }}
              />
            );
          case "qa":
            return (
              <div key={i} className={styles.qa}>
                <p className={styles.question}>{block.question}</p>
                <p>{block.answer}</p>
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
