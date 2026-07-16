import { NextResponse, type NextRequest } from "next/server";
import { decrypt, SESSION_COOKIE } from "@/lib/session-crypto";
import { prisma } from "@/lib/prisma";

// Старые адреса DLE: либо кончаются на .html, либо это страница рубрики со слэшем.
function isLegacyPath(pathname: string) {
  return pathname.endsWith(".html") || (pathname.length > 1 && pathname.endsWith("/"));
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Защита админки (оптимистичная — настоящие проверки в экшенах/DAL)
  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") return NextResponse.next();
    const session = await decrypt(req.cookies.get(SESSION_COOKIE)?.value);
    if (!session) return NextResponse.redirect(new URL("/admin/login", req.nextUrl));
    return NextResponse.next();
  }

  // 2. Редиректы старых URL: ни один адрес старого сайта не должен отдавать 404
  if (isLegacyPath(pathname)) {
    // Точное совпадение по карте (материализована миграцией: статьи + рубрики)
    const hit = await prisma.redirect.findUnique({
      where: { fromPath: pathname },
      select: { toPath: true, statusCode: true },
    });
    if (hit) {
      return NextResponse.redirect(new URL(hit.toPath, req.nextUrl), hit.statusCode);
    }

    // Fallback по числовому id: DLE отдаёт статью по id при любом slug,
    // повторяем это — покрывает старые ссылки с изменённым слагом.
    const m = pathname.match(/\/(\d+)-[^/]+\.html$/);
    if (m) {
      const post = await prisma.post.findUnique({
        where: { legacyId: Number(m[1]) },
        select: {
          slug: true,
          section: { select: { slug: true } },
          rubric: { select: { slug: true } },
        },
      });
      if (post) {
        const to = post.rubric
          ? `/${post.section.slug}/${post.rubric.slug}/${post.slug}`
          : `/${post.section.slug}/${post.slug}`;
        return NextResponse.redirect(new URL(to, req.nextUrl), 301);
      }
    }

    // Прочие старые .html без совпадения (напр. about.html) → на главную
    if (pathname.endsWith(".html")) {
      return NextResponse.redirect(new URL("/", req.nextUrl), 301);
    }
  }

  return NextResponse.next();
}

export const config = {
  // Пропускаем ассеты и _next; .html-пути НЕ исключаем — на них живут редиректы
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|css|js|woff2?|ttf)).*)",
  ],
};
