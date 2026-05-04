import type { Metadata } from "next";
import { GameShell } from "@/components/game/game-shell";
import { getTodayGameState } from "@/lib/game/bootstrap";
import { AuthRequiredError } from "@/lib/game/shared";
import type { PublicTodayGameState } from "@/types/game";

export const dynamic = "force-dynamic";

const SITE_URL = "https://liftdle.com";
const OG_IMAGE_PATH = "/og-image.png";
const META_TITLE = "Liftdle — The Daily Gym Guessing Game";
const SITE_DESCRIPTION =
  "Guess the hidden exercise using clues like muscle, equipment and movement type.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: META_TITLE,
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: META_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
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
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE_PATH],
  },
};

const homepageJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      name: "Liftdle",
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      inLanguage: "en",
    },
    {
      "@type": "WebApplication",
      name: "Liftdle",
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      applicationCategory: "GameApplication",
      operatingSystem: "Any",
      inLanguage: "en",
    },
  ],
};

export default async function Home() {
  let initialState: PublicTodayGameState | null = null;

  try {
    initialState = await getTodayGameState();
  } catch (error) {
    if (!(error instanceof AuthRequiredError)) {
      console.error("Failed to get initial game state", error);
    }
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homepageJsonLd) }}
      />
      <GameShell initialState={initialState} />
    </>
  );
}
