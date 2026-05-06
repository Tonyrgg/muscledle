import type { MetadataRoute } from "next";
import { listLiveExerciseSeoEntries } from "@/lib/exercises/catalog";

const SITE_URL = "https://liftdle.com";
const LAST_MODIFIED = new Date("2026-04-20T00:00:00.000Z");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: LAST_MODIFIED,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/archive`,
      lastModified: LAST_MODIFIED,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/how-to-play`,
      lastModified: LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/daily`,
      lastModified: LAST_MODIFIED,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/marathon`,
      lastModified: LAST_MODIFIED,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/weightGuess`,
      lastModified: LAST_MODIFIED,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: LAST_MODIFIED,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${SITE_URL}/cookies`,
      lastModified: LAST_MODIFIED,
      changeFrequency: "yearly",
      priority: 0.4,
    },
  ];

  try {
    const exercises = await listLiveExerciseSeoEntries();
    const exerciseEntries: MetadataRoute.Sitemap = exercises.map((exercise) => ({
      url: `${SITE_URL}/exercise/${exercise.slug}`,
      lastModified: LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 0.7,
    }));

    return [...staticEntries, ...exerciseEntries];
  } catch (error) {
    console.error("Failed to load exercise pages for sitemap", error);
    return staticEntries;
  }
}
