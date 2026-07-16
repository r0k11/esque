import { revalidatePath, revalidateTag } from "next/cache";

/**
 * Сброс кэша сайта извне. Нужен скрипту миграции: он пишет в БД напрямую,
 * мимо Next, поэтому сайт продолжал бы отдавать старые страницы до истечения
 * revalidate. Из серверных экшенов админки кэш сбрасывается сам.
 *
 * Защита — общий секрет (AUTH_SECRET) в заголовке: у CLI-скрипта сессии нет.
 */
export async function POST(request: Request) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || request.headers.get("x-revalidate-secret") !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Тегов мало: revalidateTag сбрасывает кэш ДАННЫХ, но отрендеренный HTML
  // страниц (ISR) продолжает отдаваться. После массовой миграции меняются сотни
  // материалов, поэтому сбрасываем все страницы под корневым макетом разом.
  revalidateTag("posts", "max");
  revalidateTag("media", "max");
  revalidatePath("/", "layout");

  return Response.json({ revalidated: true, at: new Date().toISOString() });
}
