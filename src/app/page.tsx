import { GameShell } from "@/components/game/game-shell";
import { getTodayGameState } from "@/lib/game/bootstrap";
import { AuthRequiredError } from "@/lib/game/shared";
import type { PublicTodayGameState } from "@/types/game";

export const dynamic = "force-dynamic";

export default async function Home() {
  let initialState: PublicTodayGameState | null = null;

  try {
    initialState = await getTodayGameState();
  } catch (error) {
    if (!(error instanceof AuthRequiredError)) {
      console.error("Failed to get initial game state", error);
    }
  }

  return <GameShell initialState={initialState} />;
}
