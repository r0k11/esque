import type { Metadata } from "next";
import { Golos_Text, Prata } from "next/font/google";
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "ESQUE — онлайн-журнал о моде, красоте и культуре",
    template: "%s — ESQUE",
  },
  description:
    "Esque.su — российский онлайн-журнал: мода, красота, культура, персоны, психология и события.",
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
