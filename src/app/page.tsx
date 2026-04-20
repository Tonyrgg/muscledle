import { GameShell } from "@/components/game/game-shell";
import { getTodayGameState } from "@/lib/game/bootstrap";
import { AuthRequiredError } from "@/lib/game/shared";
import type { PublicTodayGameState } from "@/types/game";

export const dynamic = "force-dynamic";

const SITE_URL = "https://liftdle.com";
const SITE_DESCRIPTION =
  "Play Liftdle, the daily fitness guessing game. Identify gym exercises using clues like muscle group, equipment, movement pattern, reps, and goal.";

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
