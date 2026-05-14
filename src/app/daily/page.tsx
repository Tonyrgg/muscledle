import type { Metadata } from "next";
import { DailyGamePage } from "@/components/game/daily-game-page";

export const dynamic = "force-dynamic";

const SITE_URL = "https://liftdle.com";
const OG_IMAGE_PATH = "/og-image.png";
const META_TITLE = "Liftdle Daily - Guess Today’s Exercise";
const META_DESCRIPTION =
  "Play Liftdle Daily and guess the hidden exercise using muscle, equipment, movement pattern, reps, and training goal clues.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: META_TITLE,
  description: META_DESCRIPTION,
  alternates: {
    canonical: "/daily",
  },
  openGraph: {
    title: META_TITLE,
    description: META_DESCRIPTION,
    url: `${SITE_URL}/daily`,
    siteName: "Liftdle",
    type: "website",
    images: [
      {
        url: OG_IMAGE_PATH,
        width: 1200,
        height: 630,
        alt: META_TITLE,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: META_TITLE,
    description: META_DESCRIPTION,
    images: [OG_IMAGE_PATH],
  },
};

const dailyJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: "Liftdle Daily",
      url: `${SITE_URL}/daily`,
      description: META_DESCRIPTION,
      inLanguage: "en",
    },
    {
      "@type": "WebApplication",
      name: "Liftdle Daily",
      url: `${SITE_URL}/daily`,
      description: META_DESCRIPTION,
      applicationCategory: "GameApplication",
      operatingSystem: "Any",
      inLanguage: "en",
    },
  ],
};

export default async function DailyPage() {
  return <DailyGamePage jsonLd={dailyJsonLd} />;
}
