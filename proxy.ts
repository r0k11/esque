import { NextResponse, type NextRequest } from "next/server";
import { decrypt, SESSION_COOKIE } from "@/lib/session-crypto";

/**
 * Оптимистичная защита админки: если нет валидной сессии — редирект на логин.
 * Настоящие проверки прав — в серверных экшенах и загрузчике (DAL).
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await decrypt(token);
  if (!session) {
    const url = new URL("/admin/login", req.nextUrl);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
