export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const SITE_NAME = "ESQUE";
export const SITE_DESCRIPTION =
  "Esque.su — российский онлайн-журнал: мода, красота, культура, персоны, психология и события.";

/** Абсолютный URL для канонических ссылок, OG и структурных данных. */
export function absolute(path: string): string {
  // URL медиа уже абсолютный (указывает на S3/CDN) — не приклеиваем домен сайта
  if (/^https?:\/\//.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** JSON-LD в тег <script>: экранируем «<», чтобы исключить XSS-инъекцию. */
export function jsonLdScript(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  sameAs: [] as string[],
};
