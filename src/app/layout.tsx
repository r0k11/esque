import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ESQUE — онлайн-журнал о моде, красоте и культуре",
  description:
    "Esque.su — российский онлайн-журнал: мода, красота, культура, персоны, психология и события.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
