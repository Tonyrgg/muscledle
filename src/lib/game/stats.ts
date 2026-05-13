import { AuthRequiredError } from "@/lib/game/shared";
import { gameDateRome } from "@/lib/game/date";
import { getDailyViewerIdentity } from "@/lib/game/viewer";
import { createAdminClient } from "@/lib/supabase/admin";
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
  const viewer = await getDailyViewerIdentity();
  if (!viewer.userId && !viewer.sessionPublicId) {
    throw new AuthRequiredError();
  }

  const admin = createAdminClient();
  let query = admin
    .from("user_daily_games")
    .select("game_date, status, guess_count")
    .order("game_date", { ascending: true });

  if (viewer.userId) {
    query = query.eq("user_id", viewer.userId);
  } else {
    query = query.is("user_id", null).eq("session_public_id", viewer.sessionPublicId);
  }

  const { data, error } = await query.returns<UserDailyGameStatsRow[]>();

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
  let currentStreak = 0;
  let lastWinDate: string | null = null;
  let prevDate: string | null = null;
  let prevWasWin = false;
  const todayGameDate = gameDateRome();

  for (const row of rows) {
    const isPendingToday = row.status === "in_progress" && row.game_date === todayGameDate;

    if (isPendingToday) {
      continue;
    }

    const isWin = row.status === "won";

    if (!isWin) {
      runningStreak = 0;
      currentStreak = 0;
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

    currentStreak = runningStreak;
    lastWinDate = row.game_date;
    prevDate = row.game_date;
    prevWasWin = true;
  }

  if (currentStreak > 0 && lastWinDate !== null && dayDiff(lastWinDate, todayGameDate) > 1) {
    currentStreak = 0;
  }

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
