import type { Metadata } from "next";
import { Golos_Text, Prata } from "next/font/google";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/seo";
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${display.variable} ${text.variable}`}>
      <body>{children}</body>
    </html>
  );
}
