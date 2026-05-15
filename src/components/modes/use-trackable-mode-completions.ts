"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchTodayGameState } from "@/lib/game/client";
import { fetchLiftGridToday } from "@/lib/liftgrid/client";
import {
  readTrackableModeCompletionsSnapshot,
  writeTrackableModeCompletion,
} from "@/lib/mode-completion-cache";

export type TrackableModeKey = "daily" | "liftgrid";

export type TrackableModeCompletionState = "none" | "won" | "lost";

export type TrackableModeCompletions = Record<TrackableModeKey, TrackableModeCompletionState>;

const EMPTY_COMPLETIONS: TrackableModeCompletions = {
  daily: "none",
  liftgrid: "none",
};

type CompletionOverrides = Partial<TrackableModeCompletions>;

export function useTrackableModeCompletions(overrides?: CompletionOverrides) {
  const [completions, setCompletions] = useState<TrackableModeCompletions>(() =>
    typeof window === "undefined" ? EMPTY_COMPLETIONS : readTrackableModeCompletionsSnapshot(),
  );

  useEffect(() => {
    let cancelled = false;

    void Promise.allSettled([fetchTodayGameState(), fetchLiftGridToday()]).then((results) => {
      if (cancelled) return;

      const [dailyResult, liftgridResult] = results;

      const nextCompletions = {
        daily:
          dailyResult.status === "fulfilled"
            ? dailyResult.value.status === "won"
              ? "won"
              : dailyResult.value.status === "lost"
                ? "lost"
                : "none"
            : "none",
        liftgrid:
          liftgridResult.status === "fulfilled"
            ? liftgridResult.value.isSurrendered
              ? "lost"
              : liftgridResult.value.isComplete
                ? "won"
                : "none"
            : "none",
      } satisfies TrackableModeCompletions;

      if (dailyResult.status === "fulfilled") {
        writeTrackableModeCompletion(
          "daily",
          nextCompletions.daily,
          dailyResult.value.gameDate,
        );
      }

      if (liftgridResult.status === "fulfilled") {
        writeTrackableModeCompletion(
          "liftgrid",
          nextCompletions.liftgrid,
          liftgridResult.value.gameDate,
        );
      }

      setCompletions(nextCompletions);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(
    () => ({
      ...completions,
      ...overrides,
    }),
    [completions, overrides],
  );
}
