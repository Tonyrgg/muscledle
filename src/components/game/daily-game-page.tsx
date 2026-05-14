import { GameShell } from "@/components/game/game-shell";
import { getTodayGameState } from "@/lib/game/bootstrap";
import { AuthRequiredError } from "@/lib/game/shared";
import type { PublicTodayGameState } from "@/types/game";

type DailyGamePageProps = {
  jsonLd?: Record<string, unknown> | null;
};

export async function DailyGamePage({ jsonLd = null }: DailyGamePageProps) {
  let initialState: PublicTodayGameState | null = null;

  try {
    initialState = await getTodayGameState();
  } catch (error) {
    if (!(error instanceof AuthRequiredError)) {
      console.error("Failed to get initial game state", error);
    }
  }

  return (
    <div className="daily-game-page">
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}
      <GameShell initialState={initialState} />
    </div>
  );
}
