import type { Metadata } from "next";
import { Golos_Text, Prata } from "next/font/google";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, IS_DEMO } from "@/lib/seo";
import "./globals.css";

const display = Prata({
  weight: "400",
  subsets: ["cyrillic", "latin"],
  variable: "--font-display",
  display: "swap",
});

const text = Golos_Text({
  subsets: ["cyrillic", "latin"],
  variable: "--font-text",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — онлайн-журнал о моде, красоте и культуре`,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "ru_RU",
    url: SITE_URL,
  },
  alternates: {
    types: { "application/rss+xml": `${SITE_URL}/rss.xml` },
  },
  // На демо перекрывает канонические URL страниц: robots-метатег действует
  // на весь документ независимо от canonical
  ...(IS_DEMO ? { robots: { index: false, follow: false } } : {}),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${display.variable} ${text.variable}`}>
      <head>
        {/* Без JS появление при скролле не сработает — показываем контент сразу */}
        <noscript>
          <style>{`.reveal-anim{opacity:1!important;transform:none!important}`}</style>
        </noscript>
      </head>
      <body>{children}</body>
    </html>
  );
}
