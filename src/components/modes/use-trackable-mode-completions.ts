"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchTodayGameState } from "@/lib/game/client";
import { fetchLiftGridToday } from "@/lib/liftgrid/client";
import {
  readTrackableModeCompletionsSnapshot,
  writeTrackableModeCompletion,
} from "@/lib/mode-completion-cache";

export type TrackableModeKey = "daily" | "liftgrid";

export type TrackableModeCompletions = Record<TrackableModeKey, boolean>;

const EMPTY_COMPLETIONS: TrackableModeCompletions = {
  daily: false,
  liftgrid: false,
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
            ? dailyResult.value.status !== "in_progress"
            : false,
        liftgrid:
          liftgridResult.status === "fulfilled"
            ? liftgridResult.value.isComplete
            : false,
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
