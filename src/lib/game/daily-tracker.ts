import { gameDateRome } from "@/lib/game/date";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PublicDailyTracker } from "@/types/game";

export async function getDailyTracker(): Promise<PublicDailyTracker> {
  const admin = createAdminClient();
  const gameDate = gameDateRome();

  const [{ count: playersTried, error: triedError }, { count: playersWon, error: wonError }] =
    await Promise.all([
      admin
        .from("user_daily_games")
        .select("*", { count: "exact", head: true })
        .eq("game_date", gameDate)
        .gt("guess_count", 0),
      admin
        .from("user_daily_games")
        .select("*", { count: "exact", head: true })
        .eq("game_date", gameDate)
        .eq("status", "won"),
    ]);

  if (triedError) {
    throw new Error(`Failed to load daily tracker attempted count: ${triedError.message}`);
  }

  if (wonError) {
    throw new Error(`Failed to load daily tracker won count: ${wonError.message}`);
  }

  const tried = playersTried ?? 0;
  const won = playersWon ?? 0;
  const failed = Math.max(0, tried - won);
  const successRate = tried > 0 ? Math.round((won / tried) * 100) : 0;

  return {
    gameDate,
    playersTried: tried,
    playersWon: won,
    playersFailed: failed,
    successRate,
  };
}
