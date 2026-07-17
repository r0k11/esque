import type { MetadataRoute } from "next";
import { SITE_URL, IS_DEMO } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  // Демо не индексируется целиком — тексты те же, что на живом esque.su
  if (IS_DEMO) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
