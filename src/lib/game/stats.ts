import { AuthRequiredError } from "@/lib/game/shared";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import type { PublicGameStats, PublicGameStatsPoint } from "@/types/game";

type UserDailyGameStatsRow = {
  game_date: string;
  status: "in_progress" | "won" | "lost";
  guess_count: number;
};

function parseDateKey(input: string): number {
  const [year, month, day] = input.split("-").map((value) => Number(value));
  return Date.UTC(year, month - 1, day);
}

function dayDiff(from: string, to: string): number {
  const deltaMs = parseDateKey(to) - parseDateKey(from);
  return Math.round(deltaMs / 86400000);
}

function round1(value: number): number {
  return Number(value.toFixed(1));
}

export async function getGameStats(): Promise<PublicGameStats> {
  const user = await getAuthenticatedUser();

  if (!user) {
    throw new AuthRequiredError();
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_daily_games")
    .select("game_date, status, guess_count")
    .eq("user_id", user.id)
    .order("game_date", { ascending: true })
    .returns<UserDailyGameStatsRow[]>();

  if (error) {
    throw new Error(`Failed to load user stats: ${error.message}`);
  }

  const rows = (data ?? []).filter((row) => row.guess_count > 0 || row.status !== "in_progress");
  const gamesPlayed = rows.length;
  const wins = rows.filter((row) => row.status === "won");
  const gamesWon = wins.length;
  const winRate = gamesPlayed > 0 ? round1((gamesWon / gamesPlayed) * 100) : 0;
  const averageGuesses = gamesWon > 0 ? round1(wins.reduce((sum, row) => sum + row.guess_count, 0) / gamesWon) : 0;
  const oneShots = wins.filter((row) => row.guess_count === 1).length;
  const oneShotRate = gamesWon > 0 ? round1((oneShots / gamesWon) * 100) : 0;

  let maxStreak = 0;
  let runningStreak = 0;
  let prevDate: string | null = null;
  let prevWasWin = false;

  for (const row of rows) {
    const isWin = row.status === "won";

    if (!isWin) {
      runningStreak = 0;
      prevDate = row.game_date;
      prevWasWin = false;
      continue;
    }

    if (prevDate !== null && prevWasWin && dayDiff(prevDate, row.game_date) === 1) {
      runningStreak += 1;
    } else {
      runningStreak = 1;
    }

    if (runningStreak > maxStreak) {
      maxStreak = runningStreak;
    }

    prevDate = row.game_date;
    prevWasWin = true;
  }

  const currentStreak = rows.length > 0 && rows[rows.length - 1]?.status === "won" ? runningStreak : 0;

  const guessHistory: PublicGameStatsPoint[] = rows.slice(-30).map((row) => ({
    gameDate: row.game_date,
    guessCount: row.guess_count,
    status: row.status,
  }));

  return {
    gamesPlayed,
    gamesWon,
    winRate,
    averageGuesses,
    oneShots,
    oneShotRate,
    currentStreak,
    maxStreak,
    guessHistory,
  };
}
