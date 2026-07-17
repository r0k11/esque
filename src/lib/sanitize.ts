/**
 * Белый список инлайн-разметки абзаца. Один и тот же для двух источников HTML:
 * миграции (скрейпинг чужого сайта) и админки (кнопки форматирования пишут теги
 * в поле, но там же можно набрать что угодно руками).
 *
 * Санитизация обязательна: абзац рендерится через dangerouslySetInnerHTML.
 *
 * Списки (ul/ol) намеренно не разрешены: блок абзаца рендерится тегом <p>,
 * внутри которого список невалиден.
 */
import sanitizeHtml from "sanitize-html";

const OLD_HOST = /^https?:\/\/(www\.)?esque\.su/i;

export const INLINE_TAGS = ["a", "strong", "b", "em", "i", "u", "br", "sup", "sub"];

export function sanitizeInline(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: INLINE_TAGS,
    // target/rel обязаны быть здесь: иначе санитайзер срежет их уже после
    // transformTags, и внешние ссылки останутся без noopener
    allowedAttributes: { a: ["href", "title", "target", "rel"] },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    transformTags: {
      a: (_tag, attribs) => {
        // Ссылки на старый esque.su делаем относительными: новый сайт встанет
        // на тот же домен, а редиректы доведут старый путь до нового материала.
        const href = (attribs.href ?? "").replace(OLD_HOST, "");
        const external = /^https?:\/\//i.test(href);
        return {
          tagName: "a",
          attribs: {
            href,
            ...(external ? { target: "_blank", rel: "noopener noreferrer" } : {}),
          },
        };
      },
    },
  });
}
