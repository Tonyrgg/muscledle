import type { MetadataRoute } from "next";

const SITE_URL = "https://liftdle.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/", "/hidden-archive", "/hidden-archive/", "/hidden-pulse-room", "/hidden-pulse-room/"],
      },
    ],
    host: SITE_URL,
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
