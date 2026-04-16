"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Logo } from "@/components/brand/logo";
import { AnonymousAuthBootstrap } from "@/components/game/anonymous-auth-bootstrap";
import { AttemptsTable } from "@/components/game/attempts-table";
import { DailyHints } from "@/components/game/daily-hints";
import { DailyCelebration } from "@/components/game/daily-celebration";
import { GuessInput } from "@/components/game/guess-input";
import { VictoryPanel } from "@/components/game/victory-panel";
import {
  fetchMarathonState,
  fetchGameStats,
  fetchLiveExercises,
  fetchTodayGameState,
  startMarathonRunRequest,
  surrenderMarathonRunRequest,
  submitMarathonGuessRequest,
  submitGuessRequest,
  type LiveExerciseSuggestion,
} from "@/lib/game/client";
import { getMuscleGroupIconKey, getMuscleGroupIconPath, resolveMuscleGroupIconKey } from "@/lib/exercises/icons";
import { preloadExerciseMedia } from "@/lib/game/exercise-media-client";
import { evaluateGuess, isCorrectGuess } from "@/lib/exercises/evaluate";
import type { Exercise } from "@/types/exercise";
import type {
  PublicGameAttempt,
  PublicGameStats,
  PublicMarathonState,
  PublicTodayGameState,
} from "@/types/game";

type GameShellProps = {
  initialState: PublicTodayGameState | null;
};

type ToastState = {
  id: number;
  message: string;
};

type GameMode = "daily" | "infinite";

type InfiniteStatus = "not_started" | "in_progress" | "lost" | "completed";

type InfiniteGameState = {
  status: InfiniteStatus;
  score: number;
  currentIndex: number;
  attempts: PublicGameAttempt[];
  maxAttemptsPerRound: number;
  exerciseOrderIds: string[];
  runSeed: number | null;
};

type MarathonTransitionState = {
  phase: "solved" | "next";
  exerciseName: string;
  score: number;
  acceptedFamilyMatch: boolean;
  attemptsSnapshot: PublicGameAttempt[];
};

type FooterModal = "how-to-play" | "stats" | "privacy" | null;
type DailyVictoryPhase = "idle" | "revealing" | "celebrating" | "complete";

const FEEDBACK_REVEAL_DURATION_MS = 1700;
const DAILY_CELEBRATION_DURATION_MS = 1200;
const DAILY_CONFETTI_SETTLE_MS = 3200;
const MARATHON_CELEBRATION_DURATION_MS = 1800;
const MARATHON_CONFETTI_SETTLE_MS = 4200;

function getMsUntilNextRomeMidnight(now: Date): number {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(now);
  const read = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((item) => item.type === type)?.value ?? "0");

  const year = read("year");
  const month = read("month");
  const day = read("day");
  const hour = read("hour");
  const minute = read("minute");
  const second = read("second");

  const currentPseudoUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  const nextMidnightPseudoUtc = Date.UTC(year, month - 1, day + 1, 0, 0, 0);

  return Math.max(0, nextMidnightPseudoUtc - currentPseudoUtc);
}

function getRomeDateKey(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function toExerciseModel(exercise: LiveExerciseSuggestion): Exercise {
  return {
    id: exercise.id,
    slug: exercise.slug,
    name: exercise.name,
    aliases: exercise.aliases,
    muscle: exercise.muscle,
    equipment: exercise.equipment,
    movement: exercise.movement,
    pattern: exercise.pattern,
    reps: exercise.reps,
    goal: exercise.goal,
    ego: exercise.ego,
    muscle_group: exercise.muscle_group,
    is_live: true,
  };
}

function createInfiniteGameState(): InfiniteGameState {
  return {
    status: "not_started",
    score: 0,
    currentIndex: 0,
    attempts: [],
    maxAttemptsPerRound: 10,
    exerciseOrderIds: [],
    runSeed: null,
  };
}

function toInfiniteStateFromPublic(state: PublicMarathonState): InfiniteGameState {
  const status: InfiniteStatus =
    state.status === "won" ? "completed" : state.status;

  return {
    status,
    score: state.score,
    currentIndex: state.currentIndex,
    attempts: state.attempts,
    maxAttemptsPerRound: state.maxAttemptsPerRound,
    exerciseOrderIds: state.exerciseOrderIds,
    runSeed: state.runSeed,
  };
}

function buildDailyAttempt(
  guess: LiveExerciseSuggestion,
  target: LiveExerciseSuggestion,
): PublicGameAttempt {
  const feedback = evaluateGuess(
    toExerciseModel(guess),
    toExerciseModel(target),
  );
  const correct = isCorrectGuess(feedback);

  return {
    id: `daily-local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    guessExerciseId: guess.id,
    guessSlug: guess.slug,
    guessName: guess.name,
    guessMuscleGroup: guess.muscle_group,
    values: {
      muscle: guess.muscle.join(" / "),
      equipment: guess.equipment.join(" / "),
      movement: guess.movement.join(" / "),
      pattern: guess.pattern.join(" / "),
      reps: guess.reps.join(" / "),
      goal: guess.goal.join(" / "),
      ego: guess.ego.join(" / "),
    },
    feedback,
    isCorrect: correct,
  };
}

export function GameShell({ initialState }: GameShellProps) {
  const [mode, setMode] = useState<GameMode>("daily");
  const [gameState, setGameState] = useState<PublicTodayGameState | null>(
    initialState,
  );
  const [dailyVictoryPhase, setDailyVictoryPhase] = useState<DailyVictoryPhase>(
    initialState?.status === "won" ? "complete" : "idle",
  );
  const [showDailyCelebration, setShowDailyCelebration] = useState(false);
  const [dailyCelebrationSeed, setDailyCelebrationSeed] = useState(0);
  const [showMarathonCelebration, setShowMarathonCelebration] = useState(false);
  const [marathonCelebrationSeed, setMarathonCelebrationSeed] = useState(0);
  const [infiniteState, setInfiniteState] = useState<InfiniteGameState | null>(
    null,
  );
  const [isLoadingState, setIsLoadingState] = useState(false);
  const [isDailyRolloverLoading, setIsDailyRolloverLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [exercises, setExercises] = useState<LiveExerciseSuggestion[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(
    null,
  );
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [stats, setStats] = useState<PublicGameStats | null>(null);
  const [statsStatus, setStatsStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [statsError, setStatsError] = useState<string | null>(null);
  const [revealingAttemptId, setRevealingAttemptId] = useState<string | null>(
    null,
  );
  const [marathonTransition, setMarathonTransition] =
    useState<MarathonTransitionState | null>(null);
  const [footerModal, setFooterModal] = useState<FooterModal>(null);
  const toastIdRef = useRef(0);
  const revealTimeoutRef = useRef<number | null>(null);
  const marathonSolvedTimeoutRef = useRef<number | null>(null);
  const marathonNextTimeoutRef = useRef<number | null>(null);
  const dailyRevealTimeoutRef = useRef<number | null>(null);
  const dailyCelebrationTimeoutRef = useRef<number | null>(null);
  const dailyConfettiSettleTimeoutRef = useRef<number | null>(null);
  const marathonConfettiSettleTimeoutRef = useRef<number | null>(null);
  const dailySyncQueueRef = useRef<Promise<void>>(Promise.resolve());
  const victoryPanelRef = useRef<HTMLElement | null>(null);
  const lastVictoryScrollKeyRef = useRef<string | null>(null);
  const currentGameDateRef = useRef<string | null>(initialState?.gameDate ?? null);

  const exerciseById = useMemo(
    () => new Map(exercises.map((exercise) => [exercise.id, exercise])),
    [exercises],
  );

  const activeInfiniteTarget = useMemo(() => {
    if (!infiniteState || infiniteState.status === "not_started") {
      return null;
    }

    const targetId = infiniteState.exerciseOrderIds[infiniteState.currentIndex];
    if (!targetId) {
      return null;
    }

    return exerciseById.get(targetId) ?? null;
  }, [exerciseById, infiniteState]);

  const dailyTargetExercise = useMemo(() => {
    const targetId = gameState?.dailySecretExerciseId;
    if (!targetId) return null;
    return exerciseById.get(targetId) ?? null;
  }, [exerciseById, gameState?.dailySecretExerciseId]);

  const lastInfiniteExerciseSplitIconPaths = useMemo(() => {
    const muscles = activeInfiniteTarget?.muscle ?? [];
    if (muscles.length < 2) return null;

    const first = getMuscleGroupIconPath(getMuscleGroupIconKey(muscles[0]));
    const second = getMuscleGroupIconPath(getMuscleGroupIconKey(muscles[1]));
    if (!first || !second || first === second) return null;

    return [first, second] as const;
  }, [activeInfiniteTarget?.muscle]);

  const lastInfiniteExerciseIconPath = useMemo(() => {
    if (!activeInfiniteTarget) return "/muscle-icons/core.svg";
    return getMuscleGroupIconPath(resolveMuscleGroupIconKey(activeInfiniteTarget));
  }, [activeInfiniteTarget]);

  const activeAttempts = useMemo(
    () =>
      mode === "daily"
        ? (gameState?.attempts ?? [])
        : (infiniteState?.attempts ?? []),
    [gameState?.attempts, infiniteState?.attempts, mode],
  );

  const displayedAttempts = useMemo(() => {
    if (mode !== "infinite" || !marathonTransition) {
      return activeAttempts;
    }
    return marathonTransition.attemptsSnapshot;
  }, [activeAttempts, marathonTransition, mode]);

  const attemptedExerciseIds = useMemo(
    () => new Set(activeAttempts.map((attempt) => attempt.guessExerciseId)),
    [activeAttempts],
  );

  const selectableExercises = useMemo(
    () =>
      exercises.filter((exercise) => !attemptedExerciseIds.has(exercise.id)),
    [attemptedExerciseIds, exercises],
  );

  const pushToast = useCallback((message: string) => {
    const id = ++toastIdRef.current;
    setToast({ id, message });

    window.setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 3600);
  }, []);

  useEffect(() => {
    if (!revealingAttemptId) {
      return;
    }

    if (revealTimeoutRef.current !== null) {
      window.clearTimeout(revealTimeoutRef.current);
    }

    revealTimeoutRef.current = window.setTimeout(() => {
      setRevealingAttemptId(null);
      revealTimeoutRef.current = null;
    }, 2600);

    return () => {
      if (revealTimeoutRef.current !== null) {
        window.clearTimeout(revealTimeoutRef.current);
        revealTimeoutRef.current = null;
      }
    };
  }, [revealingAttemptId]);

  useEffect(() => {
    return () => {
      if (dailyRevealTimeoutRef.current !== null) {
        window.clearTimeout(dailyRevealTimeoutRef.current);
      }

      if (dailyCelebrationTimeoutRef.current !== null) {
        window.clearTimeout(dailyCelebrationTimeoutRef.current);
      }
      if (dailyConfettiSettleTimeoutRef.current !== null) {
        window.clearTimeout(dailyConfettiSettleTimeoutRef.current);
      }
      if (marathonConfettiSettleTimeoutRef.current !== null) {
        window.clearTimeout(marathonConfettiSettleTimeoutRef.current);
      }

      if (marathonSolvedTimeoutRef.current !== null) {
        window.clearTimeout(marathonSolvedTimeoutRef.current);
      }

      if (marathonNextTimeoutRef.current !== null) {
        window.clearTimeout(marathonNextTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (mode !== "daily") {
      setShowDailyCelebration(false);
      return;
    }

    if (dailyVictoryPhase === "revealing") {
      dailyRevealTimeoutRef.current = window.setTimeout(() => {
        setDailyVictoryPhase("celebrating");
        setDailyCelebrationSeed((current) => current + 1);
        dailyRevealTimeoutRef.current = null;
      }, FEEDBACK_REVEAL_DURATION_MS);

      return () => {
        if (dailyRevealTimeoutRef.current !== null) {
          window.clearTimeout(dailyRevealTimeoutRef.current);
          dailyRevealTimeoutRef.current = null;
        }
      };
    }

    if (dailyVictoryPhase === "celebrating") {
      setShowDailyCelebration(true);
      dailyCelebrationTimeoutRef.current = window.setTimeout(() => {
        setDailyVictoryPhase("complete");
        dailyCelebrationTimeoutRef.current = null;
      }, DAILY_CELEBRATION_DURATION_MS);

      return () => {
        if (dailyCelebrationTimeoutRef.current !== null) {
          window.clearTimeout(dailyCelebrationTimeoutRef.current);
          dailyCelebrationTimeoutRef.current = null;
        }
      };
    }

    if (dailyVictoryPhase === "complete" && showDailyCelebration) {
      dailyConfettiSettleTimeoutRef.current = window.setTimeout(() => {
        setShowDailyCelebration(false);
        dailyConfettiSettleTimeoutRef.current = null;
      }, DAILY_CONFETTI_SETTLE_MS);

      return () => {
        if (dailyConfettiSettleTimeoutRef.current !== null) {
          window.clearTimeout(dailyConfettiSettleTimeoutRef.current);
          dailyConfettiSettleTimeoutRef.current = null;
        }
      };
    }
  }, [dailyVictoryPhase, mode, showDailyCelebration]);

  useEffect(() => {
    if (!showMarathonCelebration) {
      return;
    }

    marathonConfettiSettleTimeoutRef.current = window.setTimeout(() => {
      setShowMarathonCelebration(false);
      marathonConfettiSettleTimeoutRef.current = null;
    }, MARATHON_CONFETTI_SETTLE_MS);

    return () => {
      if (marathonConfettiSettleTimeoutRef.current !== null) {
        window.clearTimeout(marathonConfettiSettleTimeoutRef.current);
        marathonConfettiSettleTimeoutRef.current = null;
      }
    };
  }, [showMarathonCelebration]);

  useEffect(() => {
    if (!footerModal) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFooterModal(null);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [footerModal]);

  const loadStats = useCallback(
    async (options?: { silent?: boolean; force?: boolean }) => {
      if (statsStatus === "loading") {
        return;
      }

      if (statsStatus === "success" && !options?.force) {
        return;
      }

      setStatsStatus("loading");
      setStatsError(null);

      try {
        const payload = await fetchGameStats();
        setStats(payload);
        setStatsStatus("success");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load stats.";
        setStatsError(message);
        setStatsStatus("error");
        if (!options?.silent) {
          pushToast(message);
        }
      }
    },
    [pushToast, statsStatus],
  );

  const refreshStatsAfterDailySubmit = useCallback(() => {
    setStatsStatus("idle");
    if (footerModal === "stats") {
      void loadStats({ silent: true, force: true });
    }
  }, [footerModal, loadStats]);

  useEffect(() => {
    if (footerModal !== "stats" || statsStatus !== "idle") {
      return;
    }

    void loadStats();
  }, [footerModal, loadStats, statsStatus]);

  const loadExercises = useCallback(async () => {
    if (exercises.length > 0) {
      return;
    }

    setLoadingExercises(true);

    try {
      const result = await fetchLiveExercises();
      setExercises(result);
    } catch (error) {
      pushToast(
        error instanceof Error ? error.message : "Failed to load exercises.",
      );
    } finally {
      setLoadingExercises(false);
    }
  }, [exercises.length, pushToast]);

  const loadMarathonState = useCallback(async () => {
    try {
      const state = await fetchMarathonState();
      setInfiniteState(toInfiniteStateFromPublic(state));
    } catch (error) {
      setInfiniteState(createInfiniteGameState());
      pushToast(
        error instanceof Error ? error.message : "Failed to load marathon state.",
      );
    }
  }, [pushToast]);

  const loadTodayState = useCallback(async () => {
    setIsLoadingState(true);

    try {
      const state = await fetchTodayGameState();
      setGameState(state);
      setDailyVictoryPhase(state.status === "won" ? "complete" : "idle");
      setShowDailyCelebration(false);
      return state;
    } catch (error) {
      pushToast(
        error instanceof Error ? error.message : "Failed to load game state.",
      );
      return null;
    } finally {
      setIsLoadingState(false);
    }
  }, [pushToast]);

  const runDailyRolloverRefresh = useCallback(async () => {
    const previousGameDate = currentGameDateRef.current;
    setIsDailyRolloverLoading(true);

    setQuery("");
    setSelectedExerciseId(null);
    setRevealingAttemptId(null);
    setShowDailyCelebration(false);
    setShowMarathonCelebration(false);
    setDailyVictoryPhase("idle");
    setToast(null);
    setFooterModal(null);
    setMarathonTransition(null);
    lastVictoryScrollKeyRef.current = null;

    if (dailyRevealTimeoutRef.current !== null) {
      window.clearTimeout(dailyRevealTimeoutRef.current);
      dailyRevealTimeoutRef.current = null;
    }

    if (dailyCelebrationTimeoutRef.current !== null) {
      window.clearTimeout(dailyCelebrationTimeoutRef.current);
      dailyCelebrationTimeoutRef.current = null;
    }

    if (dailyConfettiSettleTimeoutRef.current !== null) {
      window.clearTimeout(dailyConfettiSettleTimeoutRef.current);
      dailyConfettiSettleTimeoutRef.current = null;
    }

    try {
      const state = await loadTodayState();
      return Boolean(state && state.gameDate !== previousGameDate);
    } finally {
      setIsDailyRolloverLoading(false);
    }
  }, [loadTodayState]);

  useEffect(() => {
    currentGameDateRef.current = gameState?.gameDate ?? null;
  }, [gameState?.gameDate]);

  useEffect(() => {
    let midnightTimer: number | null = null;
    let backupMidnightTimer: number | null = null;
    let retryTimer: number | null = null;
    let rolloverInProgress = false;
    let lastProcessedRomeDateKey = getRomeDateKey(new Date());

    const clearTimers = () => {
      if (midnightTimer !== null) {
        window.clearTimeout(midnightTimer);
        midnightTimer = null;
      }
      if (backupMidnightTimer !== null) {
        window.clearTimeout(backupMidnightTimer);
        backupMidnightTimer = null;
      }
      if (retryTimer !== null) {
        window.clearTimeout(retryTimer);
        retryTimer = null;
      }
    };

    const attemptRollover = () => {
      if (rolloverInProgress) return;

      const currentRomeDateKey = getRomeDateKey(new Date());
      if (currentRomeDateKey === lastProcessedRomeDateKey) {
        scheduleMidnightRefresh();
        return;
      }

      rolloverInProgress = true;
      void (async () => {
        try {
          const changed = await runDailyRolloverRefresh();
          if (changed) {
            lastProcessedRomeDateKey = currentRomeDateKey;
            scheduleMidnightRefresh();
            return;
          }

          // Backend/date transition can lag a few seconds: retry with timer, still without polling.
          retryTimer = window.setTimeout(() => {
            attemptRollover();
          }, 5000);
        } finally {
          rolloverInProgress = false;
        }
      })();
    };

    function scheduleMidnightRefresh() {
      clearTimers();

      const msUntilMidnight = getMsUntilNextRomeMidnight(new Date());
      midnightTimer = window.setTimeout(() => {
        attemptRollover();
      }, Math.max(200, msUntilMidnight + 250));

      // Safety one-shot timer in case the primary timer is delayed/throttled.
      backupMidnightTimer = window.setTimeout(() => {
        attemptRollover();
      }, Math.max(5200, msUntilMidnight + 5000));
    };

    scheduleMidnightRefresh();

    return () => {
      clearTimers();
    };
  }, [runDailyRolloverRefresh]);

  const handleAuthReady = useCallback(() => {
    void loadExercises();
    void loadMarathonState();
    void loadStats({ silent: true });

    if (!gameState) {
      void loadTodayState();
    }
  }, [gameState, loadExercises, loadMarathonState, loadStats, loadTodayState]);

  const handleModeChange = useCallback((nextMode: GameMode) => {
    if (marathonSolvedTimeoutRef.current !== null) {
      window.clearTimeout(marathonSolvedTimeoutRef.current);
      marathonSolvedTimeoutRef.current = null;
    }

    if (marathonNextTimeoutRef.current !== null) {
      window.clearTimeout(marathonNextTimeoutRef.current);
      marathonNextTimeoutRef.current = null;
    }

    setMarathonTransition(null);
    setMode(nextMode);
    setQuery("");
    setSelectedExerciseId(null);
    setRevealingAttemptId(null);
    setShowMarathonCelebration(false);

    if (nextMode !== "daily") {
      setShowDailyCelebration(false);
      if (dailyRevealTimeoutRef.current !== null) {
        window.clearTimeout(dailyRevealTimeoutRef.current);
        dailyRevealTimeoutRef.current = null;
      }

      if (dailyCelebrationTimeoutRef.current !== null) {
        window.clearTimeout(dailyCelebrationTimeoutRef.current);
        dailyCelebrationTimeoutRef.current = null;
      }

      if (dailyConfettiSettleTimeoutRef.current !== null) {
        window.clearTimeout(dailyConfettiSettleTimeoutRef.current);
        dailyConfettiSettleTimeoutRef.current = null;
      }
    }
  }, []);

  const startMarathonRun = useCallback(async () => {
    if (exercises.length === 0) {
      pushToast("Exercises are still loading.");
      return;
    }

    if (marathonSolvedTimeoutRef.current !== null) {
      window.clearTimeout(marathonSolvedTimeoutRef.current);
      marathonSolvedTimeoutRef.current = null;
    }

    if (marathonNextTimeoutRef.current !== null) {
      window.clearTimeout(marathonNextTimeoutRef.current);
      marathonNextTimeoutRef.current = null;
    }

    setIsSubmitting(true);
    try {
      const nextState = await startMarathonRunRequest();
      setInfiniteState(toInfiniteStateFromPublic(nextState));
      setMarathonTransition(null);
      setShowMarathonCelebration(false);
      setQuery("");
      setSelectedExerciseId(null);
      setRevealingAttemptId(null);
    } catch (error) {
      pushToast(
        error instanceof Error ? error.message : "Failed to start marathon run.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [exercises, pushToast]);

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    setSelectedExerciseId(null);
  }, []);

  const handleSelectExercise = useCallback(
    (exercise: LiveExerciseSuggestion) => {
      setQuery(exercise.name);
      setSelectedExerciseId(exercise.id);
    },
    [],
  );

  const handleSubmitDaily = useCallback(
    async (overrideExerciseId?: string) => {
      const exerciseId = overrideExerciseId ?? selectedExerciseId;

      if (!exerciseId) {
        pushToast("Select an exercise from the dropdown first.");
        return;
      }

      if (attemptedExerciseIds.has(exerciseId)) {
        pushToast("You already guessed this exercise.");
        setSelectedExerciseId(null);
        return;
      }

      if (!gameState || gameState.status !== "in_progress") {
        return;
      }

      const guessed = exerciseById.get(exerciseId);
      const targetExerciseId = gameState.dailySecretExerciseId;
      const target = targetExerciseId
        ? exerciseById.get(targetExerciseId)
        : null;

      // Fallback path for legacy sessions missing client-side secret or local exercise cache.
      if (!guessed || !target) {
        setIsSubmitting(true);

        try {
          const updated = await submitGuessRequest(exerciseId);
          void preloadExerciseMedia(updated.attempt.guessSlug);
          setRevealingAttemptId(updated.attempt.id);
          if (updated.status === "won") {
            setDailyVictoryPhase("revealing");
          }
          setGameState((current) => {
            if (!current || current.gameDate !== updated.gameDate) {
              return current;
            }

            return {
              ...current,
              status: updated.status,
              guessCount: updated.guessCount,
              attempts: [updated.attempt, ...current.attempts],
            };
          });
          setQuery("");
          setSelectedExerciseId(null);
          refreshStatsAfterDailySubmit();
        } catch (error) {
          pushToast(
            error instanceof Error ? error.message : "Failed to submit guess.",
          );
        } finally {
          setIsSubmitting(false);
        }

        return;
      }

      const localAttempt = buildDailyAttempt(guessed, target);
      const nextGuessCount = gameState.guessCount + 1;
      const nextStatus: PublicTodayGameState["status"] = localAttempt.isCorrect
        ? "won"
        : "in_progress";

      void preloadExerciseMedia(localAttempt.guessSlug);
      setRevealingAttemptId(localAttempt.id);
      if (nextStatus === "won") {
        setDailyVictoryPhase("revealing");
      }

      setGameState((current) => {
        if (!current || current.gameDate !== gameState.gameDate) {
          return current;
        }

        return {
          ...current,
          status: nextStatus,
          guessCount: nextGuessCount,
          attempts: [localAttempt, ...current.attempts],
        };
      });
      setQuery("");
      setSelectedExerciseId(null);

      dailySyncQueueRef.current = dailySyncQueueRef.current
        .then(async () => {
          const synced = await submitGuessRequest(exerciseId);

          setGameState((current) => {
            if (!current || current.gameDate !== synced.gameDate) {
              return current;
            }

            return {
              ...current,
              status: synced.status,
              guessCount: Math.max(current.guessCount, synced.guessCount),
            };
          });
          refreshStatsAfterDailySubmit();
        })
        .catch((error) => {
          pushToast(
            error instanceof Error ? error.message : "Failed to sync guess.",
          );
        });
    },
    [
      attemptedExerciseIds,
      exerciseById,
      gameState,
      pushToast,
      refreshStatsAfterDailySubmit,
      selectedExerciseId,
    ],
  );

  const handleSubmitInfinite = useCallback(
    async (overrideExerciseId?: string) => {
      const exerciseId = overrideExerciseId ?? selectedExerciseId;

      if (!exerciseId) {
        pushToast("Select an exercise from the dropdown first.");
        return;
      }

      if (!infiniteState || infiniteState.status !== "in_progress") {
        return;
      }

      if (marathonTransition) {
        return;
      }

      if (!activeInfiniteTarget) {
        pushToast("No target exercise available.");
        return;
      }

      if (attemptedExerciseIds.has(exerciseId)) {
        pushToast("You already guessed this exercise in this round.");
        setSelectedExerciseId(null);
        return;
      }

      const guessed = exerciseById.get(exerciseId);

      if (!guessed) {
        pushToast("Selected exercise is not available.");
        return;
      }

      setIsSubmitting(true);

      try {
        const response = await submitMarathonGuessRequest(exerciseId);
        const attempt = response.attempt;
        const acceptedFamilyMatch = response.acceptedFamilyMatch;
        const nextState = toInfiniteStateFromPublic(response.state);

        await preloadExerciseMedia(attempt.guessSlug);
        setRevealingAttemptId(attempt.id);
        setQuery("");
        setSelectedExerciseId(null);
        setInfiniteState(nextState);

        const solvedRoundAttempts = [attempt, ...infiniteState.attempts];

        if (attempt.isCorrect) {
          if (nextState.status === "completed") {
            setMarathonTransition(null);
            setShowMarathonCelebration(true);
            setMarathonCelebrationSeed((current) => current + 1);
            return;
          }

          setMarathonTransition({
            phase: "solved",
            exerciseName: activeInfiniteTarget.name,
            score: nextState.score,
            acceptedFamilyMatch,
            attemptsSnapshot: solvedRoundAttempts,
          });

          marathonSolvedTimeoutRef.current = window.setTimeout(() => {
            setMarathonTransition({
              phase: "next",
              exerciseName: activeInfiniteTarget.name,
              score: nextState.score,
              acceptedFamilyMatch,
              attemptsSnapshot: solvedRoundAttempts,
            });
            marathonSolvedTimeoutRef.current = null;

            marathonNextTimeoutRef.current = window.setTimeout(() => {
              setMarathonTransition(null);
              marathonNextTimeoutRef.current = null;
            }, 1500);
          }, 2200);

          return;
        }

        if (nextState.status === "lost") {
          pushToast(
            `Run over. You used all ${infiniteState.maxAttemptsPerRound} attempts.`,
          );
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      activeInfiniteTarget,
      attemptedExerciseIds,
      exerciseById,
      infiniteState,
      marathonTransition,
      pushToast,
      selectedExerciseId,
    ],
  );

  const handleSubmit = useCallback(
    async (exercise?: LiveExerciseSuggestion) => {
      const overrideExerciseId = exercise?.id;

      if (mode === "daily") {
        await handleSubmitDaily(overrideExerciseId);
        return;
      }

      await handleSubmitInfinite(overrideExerciseId);
    },
    [handleSubmitDaily, handleSubmitInfinite, mode],
  );

  const restartInfiniteMode = useCallback(async () => {
    if (exercises.length === 0) {
      return;
    }

    if (marathonSolvedTimeoutRef.current !== null) {
      window.clearTimeout(marathonSolvedTimeoutRef.current);
      marathonSolvedTimeoutRef.current = null;
    }

    if (marathonNextTimeoutRef.current !== null) {
      window.clearTimeout(marathonNextTimeoutRef.current);
      marathonNextTimeoutRef.current = null;
    }

    setIsSubmitting(true);
    try {
      const state = await startMarathonRunRequest();
      setInfiniteState(toInfiniteStateFromPublic(state));
      setMarathonTransition(null);
      setShowMarathonCelebration(false);
      setQuery("");
      setSelectedExerciseId(null);
      setRevealingAttemptId(null);
    } catch (error) {
      pushToast(
        error instanceof Error ? error.message : "Failed to reset marathon run.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [exercises.length, pushToast]);

  const surrenderInfiniteMode = useCallback(async () => {
    if (!infiniteState || infiniteState.status !== "in_progress") {
      return;
    }

    if (marathonSolvedTimeoutRef.current !== null) {
      window.clearTimeout(marathonSolvedTimeoutRef.current);
      marathonSolvedTimeoutRef.current = null;
    }

    if (marathonNextTimeoutRef.current !== null) {
      window.clearTimeout(marathonNextTimeoutRef.current);
      marathonNextTimeoutRef.current = null;
    }

    setIsSubmitting(true);
    const previousState = infiniteState;

    // Keep the defeat recap visible immediately.
    setInfiniteState({
      ...previousState,
      status: "lost",
    });
    setMarathonTransition(null);
    setQuery("");
    setSelectedExerciseId(null);
    setRevealingAttemptId(null);

    try {
      await surrenderMarathonRunRequest();
      pushToast("Marathon surrendered.");
    } catch (error) {
      setInfiniteState(previousState);
      pushToast(
        error instanceof Error ? error.message : "Failed to surrender marathon run.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [infiniteState, pushToast]);

  const isDailyWon = gameState?.status === "won";
  const winningAttempt =
    gameState?.attempts.find((attempt) => attempt.isCorrect) ?? null;
  const shouldShowDailyPrompt =
    mode === "daily" && (!isDailyWon || dailyVictoryPhase !== "complete");
  const shouldShowVictoryPanel =
    mode === "daily" && isDailyWon && dailyVictoryPhase === "complete";
  const shouldShowDailyCelebration =
    mode === "daily" && isDailyWon && showDailyCelebration;
  const isMarathonCompleted =
    mode === "infinite" && infiniteState?.status === "completed";

  useEffect(() => {
    if (!shouldShowVictoryPanel || !gameState?.gameDate) {
      return;
    }

    const scrollKey = `${gameState.gameDate}:${gameState.guessCount}:${gameState.status}`;
    if (lastVictoryScrollKeyRef.current === scrollKey) {
      return;
    }

    const panel = victoryPanelRef.current;
    if (!panel) {
      return;
    }

    lastVictoryScrollKeyRef.current = scrollKey;

    const timer = window.setTimeout(() => {
      panel.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
    }, 80);

    return () => window.clearTimeout(timer);
  }, [
    gameState?.gameDate,
    gameState?.guessCount,
    gameState?.status,
    shouldShowVictoryPanel,
  ]);

  const infiniteAttemptsUsed = infiniteState?.attempts.length ?? 0;
  const infiniteAttemptsLeft = infiniteState
    ? Math.max(0, infiniteState.maxAttemptsPerRound - infiniteAttemptsUsed)
    : 0;
  const displayedInfiniteAttemptsLeft =
    infiniteState?.status === "lost" ? 0 : infiniteAttemptsLeft;
  const infiniteTotal =
    infiniteState && infiniteState.exerciseOrderIds.length > 0
      ? infiniteState.exerciseOrderIds.length
      : exercises.length;
  const infiniteSolvedRounds =
    infiniteState && marathonTransition
      ? Math.min(infiniteTotal, infiniteState.currentIndex + 1)
      : (infiniteState?.currentIndex ?? 0);
  const marathonProgressPct =
    infiniteTotal > 0
      ? Math.min(
          100,
          Math.max(0, Math.round((infiniteSolvedRounds / infiniteTotal) * 100)),
        )
      : 0;

  const disabled =
    mode === "daily"
      ? !gameState || gameState.status !== "in_progress" || isSubmitting
      : !infiniteState ||
        infiniteState.status !== "in_progress" ||
        marathonTransition !== null ||
        isSubmitting;

  const shouldShowInfiniteInput =
    mode === "infinite" && infiniteState?.status === "in_progress";
  const shouldShowAttemptsTable =
    mode === "daily" ||
    (mode === "infinite" &&
      (infiniteState?.status === "in_progress" ||
        marathonTransition !== null ||
        (activeAttempts.length > 0 &&
          infiniteState?.status !== "not_started" &&
          infiniteState?.status !== "completed")));

  const statsChart = useMemo(() => {
    if (!stats || stats.guessHistory.length === 0) {
      return null;
    }

    const series = stats.guessHistory;
    const width = 760;
    const height = 260;
    const margin = { top: 16, right: 18, bottom: 34, left: 34 };
    const plotLeft = margin.left;
    const plotTop = margin.top;
    const plotRight = width - margin.right;
    const plotBottom = height - margin.bottom;
    const plotWidth = plotRight - plotLeft;
    const plotHeight = plotBottom - plotTop;

    const values = series.map((point) => point.guessCount);
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const paddedMin = Math.max(0, Math.floor(rawMin - 1));
    const paddedMax = Math.ceil(rawMax + 1);
    const range = Math.max(1, paddedMax - paddedMin);

    let tickStep = 1;
    const maxTicks = 8;
    while (Math.floor(range / tickStep) + 1 > maxTicks) {
      tickStep *= 2;
    }

    const yMin = Math.floor(paddedMin / tickStep) * tickStep;
    const yMax = Math.ceil(paddedMax / tickStep) * tickStep;
    const ySpan = Math.max(1, yMax - yMin);
    const yTicks: Array<{ value: number; y: number }> = [];

    for (let value = yMax; value >= yMin; value -= tickStep) {
      const y = plotBottom - ((value - yMin) / ySpan) * plotHeight;
      yTicks.push({ value, y });
    }

    const dots = series.map((point, index) => {
      const x =
        series.length === 1
          ? plotLeft + plotWidth / 2
          : plotLeft + (index / (series.length - 1)) * plotWidth;
      const y = plotBottom - ((point.guessCount - yMin) / ySpan) * plotHeight;
      return { x, y, label: point.gameDate, value: point.guessCount };
    });

    function toSmoothPath(points: Array<{ x: number; y: number }>): string {
      if (points.length === 0) return "";
      if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

      let path = `M ${points[0].x} ${points[0].y}`;
      for (let i = 0; i < points.length - 1; i += 1) {
        const p0 = points[i - 1] ?? points[i];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[i + 2] ?? p2;

        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;

        path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
      }

      return path;
    }

    const linePath = toSmoothPath(dots);
    const xTicks = dots.map((dot) => ({
      x: dot.x,
      label: dot.label.slice(5),
    }));

    return {
      width,
      height,
      plotLeft,
      plotRight,
      plotTop,
      plotBottom,
      yTicks,
      xTicks,
      dots,
      linePath,
    };
  }, [stats]);

  return (
    <>
      <main className="game-page">
        <AnonymousAuthBootstrap onReady={handleAuthReady} />

        <section className="game-shell" aria-label="Liftdle gameplay">
          {isDailyRolloverLoading ? (
            <section className="game-rollover-loading" aria-live="polite" aria-label="Loading next daily exercise">
              <span className="game-rollover-loading__spinner" aria-hidden />
              <p className="game-rollover-loading__text">Updating daily exercise...</p>
            </section>
          ) : (
            <>
          <header className="game-hero">
            <Link className="game-hero__home-link" href="/" aria-label="Go to homepage">
              <Logo withTagline />
            </Link>
            <div className="mode-switch" aria-label="Game mode switch">
              <button
                type="button"
                aria-pressed={mode === "daily"}
                className={`mode-switch__button ${mode === "daily" ? "mode-switch__button--active" : ""}`}
                onClick={() => handleModeChange("daily")}
              >
                Daily
              </button>
              <button
                type="button"
                aria-pressed={mode === "infinite"}
                className={`mode-switch__button ${mode === "infinite" ? "mode-switch__button--active" : ""}`}
                onClick={() => handleModeChange("infinite")}
              >
                Marathon
              </button>
            </div>

            {shouldShowDailyPrompt ? (
              <div
                className="game-prompt-panel"
                role="status"
                aria-live="polite"
              >
                <h2 className="game-prompt-panel__title">
                  Guess the exercise.
                </h2>
                <p className="game-prompt-panel__subtitle">
                  {!gameState || gameState.guessCount === 0
                    ? "Start with any exercise."
                    : "Use colors to refine your next guess."}
                </p>
                <DailyHints
                  attempts={gameState?.attempts ?? []}
                  targetExercise={dailyTargetExercise}
                />
              </div>
            ) : null}

            {mode === "infinite" ? (
              <div
                className="game-prompt-panel game-prompt-panel--infinite"
                role="status"
                aria-live="polite"
              >
                <p className="marathon-hud__kicker">
                  {infiniteState?.status === "completed"
                    ? "Run Complete"
                    : infiniteState?.status === "lost"
                      ? "Run Failed"
                      : infiniteState?.status === "not_started"
                        ? "Get Ready"
                        : "Live Run"}
                </p>
                <h2 className="game-prompt-panel__title marathon-hud__title">
                  {infiniteState?.status === "completed"
                    ? "Marathon completed"
                    : infiniteState?.status === "lost"
                      ? "Marathon over"
                      : infiniteState?.status === "not_started"
                        ? "Marathon ready"
                        : "Marathon mode"}
                </h2>
                {infiniteState?.status === "completed" ? (
                  <div className="marathon-complete">
                    <div
                      className="marathon-hud__bar-wrap marathon-complete__progress"
                      aria-label="Marathon progress"
                    >
                      <div className="marathon-hud__bar">
                        <span
                          className="marathon-hud__bar-fill"
                          style={{ width: `${marathonProgressPct}%` }}
                        />
                      </div>
                      <p className="marathon-hud__bar-label">
                        {marathonProgressPct}% complete
                      </p>
                    </div>
                    <p className="marathon-complete__score">
                      <span className="marathon-complete__score-label">Score</span>
                      <span className="marathon-complete__score-value">
                        {infiniteState.score}
                      </span>
                    </p>
                    <div className="marathon-complete__actions">
                      <button
                        type="button"
                        className="exercise-media-modal__close marathon-start-zone__button marathon-complete__button marathon-complete__button--placeholder"
                        disabled
                      >
                        Share Soon
                      </button>
                      <button
                        type="button"
                        className="exercise-media-modal__close marathon-start-zone__button marathon-complete__button"
                        onClick={restartInfiniteMode}
                      >
                        Restart Run
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div
                      className="marathon-hud__bar-wrap"
                      aria-label="Marathon progress"
                    >
                      <div className="marathon-hud__bar">
                        <span
                          className="marathon-hud__bar-fill"
                          style={{ width: `${marathonProgressPct}%` }}
                        />
                      </div>
                      <p className="marathon-hud__bar-label">
                        {marathonProgressPct}% complete
                      </p>
                    </div>
                    {infiniteState?.status !== "not_started" ? (
                      <div className="marathon-hud__stats">
                        <p className="marathon-hud__stat">
                          <span className="marathon-hud__stat-label">Score</span>
                          <strong>{infiniteState?.score ?? 0}</strong>
                        </p>
                        <p className="marathon-hud__stat">
                          <span className="marathon-hud__stat-label">Attempts</span>
                          <strong>{displayedInfiniteAttemptsLeft}</strong>
                        </p>
                      </div>
                    ) : null}
                    {infiniteState?.status === "lost" && activeInfiniteTarget ? (
                      <div className="marathon-hud__failed-exercise-wrap">
                        <p className="marathon-hud__failed-exercise">
                          Last exercise: <span>{activeInfiniteTarget.name}</span>
                        </p>
                        <div className="marathon-hud__failed-exercise-media" aria-label={`Last exercise muscle ${activeInfiniteTarget.name}`}>
                          {lastInfiniteExerciseSplitIconPaths ? (
                            <div className="marathon-hud__failed-exercise-split">
                              <Image
                                src={lastInfiniteExerciseSplitIconPaths[0]}
                                alt=""
                                fill
                                sizes="96px"
                                className="marathon-hud__failed-exercise-split-part marathon-hud__failed-exercise-split-part--primary"
                              />
                              <Image
                                src={lastInfiniteExerciseSplitIconPaths[1]}
                                alt=""
                                fill
                                sizes="96px"
                                className="marathon-hud__failed-exercise-split-part marathon-hud__failed-exercise-split-part--secondary"
                              />
                              <span className="marathon-hud__failed-exercise-split-divider" />
                            </div>
                          ) : (
                            <Image
                              src={lastInfiniteExerciseIconPath}
                              alt=""
                              fill
                              sizes="96px"
                              className="marathon-hud__failed-exercise-icon"
                            />
                          )}
                        </div>
                      </div>
                    ) : null}
                    {infiniteState?.status === "not_started" ? (
                      <button
                        type="button"
                        className="exercise-media-modal__close game-prompt-panel__restart marathon-start-zone__button"
                        onClick={startMarathonRun}
                        disabled={loadingExercises || exercises.length === 0}
                      >
                        Play Now
                      </button>
                    ) : null}
                    {infiniteState?.status === "lost" ? (
                      <button
                        type="button"
                        className="exercise-media-modal__close game-prompt-panel__restart marathon-start-zone__button"
                        onClick={restartInfiniteMode}
                      >
                        Restart Run
                      </button>
                    ) : null}
                    {infiniteState?.status === "in_progress" ? (
                      <button
                        type="button"
                        className="exercise-media-modal__close game-prompt-panel__restart marathon-start-zone__button"
                        onClick={() => {
                          void surrenderInfiniteMode();
                        }}
                        disabled={isSubmitting}
                      >
                        Surrender
                      </button>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}
          </header>

          {shouldShowVictoryPanel ? (
            <section
              ref={victoryPanelRef}
              className="game-win-zone"
              aria-label="Victory summary"
            >
              <VictoryPanel
                gameDate={gameState?.gameDate ?? ""}
                guessCount={gameState?.guessCount ?? 0}
                winningAttempt={winningAttempt}
                attempts={gameState?.attempts ?? []}
                targetExercise={dailyTargetExercise}
              />
            </section>
          ) : null}

          {(mode === "daily" && !isDailyWon) || shouldShowInfiniteInput ? (
            <section className="game-input-zone" aria-label="Guess input">
              <GuessInput
                query={query}
                selectedExerciseId={selectedExerciseId}
                exercises={selectableExercises}
                loadingExercises={loadingExercises}
                disabled={disabled}
                submitting={isSubmitting}
                onQueryChange={handleQueryChange}
                onSelectExercise={handleSelectExercise}
                onSubmit={(exercise) => {
                  void handleSubmit(exercise);
                }}
              />
            </section>
          ) : null}

          {shouldShowAttemptsTable ? (
            <div className="marathon-stage">
              <section className="game-table-zone" aria-label="Attempts">
                <AttemptsTable
                  attempts={displayedAttempts}
                  loading={
                    mode === "daily" ? isLoadingState && !gameState : false
                  }
                  revealingAttemptId={revealingAttemptId}
                />
              </section>

              {mode === "infinite" && marathonTransition ? (
                <section className="marathon-transition" aria-live="polite">
                  <div className="marathon-transition__panel">
                    <p className="marathon-transition__kicker">
                      {marathonTransition.phase === "solved"
                        ? "Correct"
                        : "Next Exercise"}
                    </p>
                    <p className="marathon-transition__title">
                      {marathonTransition.phase === "solved"
                        ? marathonTransition.exerciseName
                        : "Preparing next excercise"}
                    </p>
                    <p className="marathon-transition__score">
                      <span className="marathon-transition__score-label">Score</span>
                      <span className="marathon-transition__score-value">{marathonTransition.score}</span>
                    </p>
                  </div>
                </section>
              ) : null}
            </div>
          ) : null}

          {mode === "daily" ? (
            <section
              className="yesterday-exercise"
              aria-label="Yesterday exercise"
            >
              <p className="yesterday-exercise__text">
                Yesterday&apos;s exercise was{" "}
                <span className="yesterday-exercise__name">
                  {gameState?.yesterdayExerciseName ?? "Unknown"}
                </span>
              </p>
            </section>
          ) : null}
            </>
          )}
        </section>
      </main>

      <footer className="game-footer" aria-label="Liftdle footer">
        <nav className="game-footer__links" aria-label="Footer links">
          <button
            type="button"
            className="game-footer__link"
            onClick={() => setFooterModal("how-to-play")}
          >
            HOW IT WORKS
          </button>
          <button
            type="button"
            className="game-footer__link"
            onClick={() => setFooterModal("stats")}
          >
            STATS
          </button>
          <Link href="/archive" className="game-footer__link">
            ARCHIVE
          </Link>
          <button
            type="button"
            className="game-footer__link"
            onClick={() => setFooterModal("privacy")}
          >
            PRIVACY
          </button>
        </nav>
        <p className="game-footer__copy">
        © 2026 Liftdle. All rights reserved.
        </p>
      </footer>

      {footerModal ? (
        <section
          className="info-sheet"
          aria-label="Information modal"
          onClick={() => setFooterModal(null)}
        >
          <div
            className="info-sheet__panel"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="info-sheet__head">
              <h2 className="info-sheet__title">
                {footerModal === "how-to-play"
                  ? "How To Play"
                  : footerModal === "stats"
                    ? "Statistics"
                    : "Privacy"}
              </h2>
              <button
                type="button"
                className="exercise-media-modal__close"
                onClick={() => setFooterModal(null)}
              >
                Close
              </button>
            </div>

            {footerModal === "how-to-play" ? (
              <div className="info-sheet__body">
                <section className="info-sheet__section">
                  <h3 className="info-sheet__section-title">How it works</h3>
                  <p>Guess the exercise.</p>
                  <p>Each guess is compared against 7 attributes: Muscle, Equipment, Movement, Pattern, Reps, Goal, Ego.</p>
                </section>

                <section className="info-sheet__section">
                  <h3 className="info-sheet__section-title">Color meaning</h3>
                  <div className="htp-legend">
                    <p className="htp-legend__item">
                      <span className="htp-accent htp-accent--green">GREEN</span> exact match for that attribute.
                    </p>
                    <p className="htp-legend__item">
                      <span className="htp-accent htp-accent--yellow">YELLOW</span> at least one shared value, but not a perfect match.
                    </p>
                    <p className="htp-legend__item">
                      <span className="htp-accent htp-accent--red">RED</span> no overlap.
                    </p>
                  </div>
                  <p className="htp-note">
                    Liftdle does not use arrows. Feedback depends only on exact match, partial overlap, or no overlap.
                  </p>
                </section>

                <section className="info-sheet__section">
                  <h3 className="info-sheet__section-title">Attributes</h3>
                  <div className="htp-attributes">
                    <p>
                      <strong>Muscle</strong>: primary focus (Chest, Back, Legs, Shoulders, Arms, Core).
                    </p>
                    <p>
                      <strong>Equipment</strong>: dominant tool (Barbell, Dumbbells, Bodyweight, Machine, Cable, Kettlebell).
                    </p>
                    <p>
                      <strong>Movement</strong>: movement type (Push, Pull, Isolation, Core).
                    </p>
                    <p>
                      <strong>Pattern</strong>: movement pattern (Horizontal, Vertical, Squat, Hinge).
                    </p>
                    <p>
                      <strong>Reps</strong>: rep range (1-5, 6-12, 12+).
                    </p>
                    <p>
                      <strong>Goal</strong>: training intent (Strength, Hypertrophy, Endurance, Skill).
                    </p>
                    <p>
                      <strong>Ego</strong>: risk/ego-lift level (Low, Medium, High).
                    </p>
                  </div>
                </section>

                <section className="info-sheet__section">
                  <h3 className="info-sheet__section-title">Guided example</h3>
                  <p>
                    Assume the correct answer is <span className="htp-inline htp-inline--target">Barbell Bench Press</span>.
                    If you guess <span className="htp-inline htp-inline--guess">Dumbbell Bench Press</span>, you would get:
                  </p>

                  <div className="htp-example-row-scroll" aria-label="Example feedback row">
                    <div className="htp-example-grid" role="presentation">
                      <span className="htp-example-cell htp-example-cell--exercise" aria-label="Guessed exercise icon">
                        <Image
                          src="/muscle-icons/chest.svg"
                          alt="Dumbbell bench press example icon"
                          width={42}
                          height={42}
                          className="htp-example-exercise-icon"
                        />
                        <span className="htp-example-exercise-label">Dumbbell Bench Press</span>
                      </span>
                      <span className="htp-example-cell htp-example-cell--green">Chest</span>
                      <span className="htp-example-cell htp-example-cell--red">Dumbbells</span>
                      <span className="htp-example-cell htp-example-cell--green">Push</span>
                      <span className="htp-example-cell htp-example-cell--green">Horizontal</span>
                      <span className="htp-example-cell htp-example-cell--green">6-12</span>
                      <span className="htp-example-cell htp-example-cell--yellow">Strength / Hypertrophy</span>
                      <span className="htp-example-cell htp-example-cell--green">Medium</span>
                    </div>
                  </div>

                  <div className="htp-breakdown">
                    <p>
                      <strong>Muscle</strong>: <span className="htp-accent htp-accent--green">green</span>, same primary focus.
                    </p>
                    <p>
                      <strong>Equipment</strong>: <span className="htp-accent htp-accent--red">red</span>, different tool.
                    </p>
                    <p>
                      <strong>Goal</strong>: <span className="htp-accent htp-accent--yellow">yellow</span>, partial overlap but not exact.
                    </p>
                  </div>
                </section>

                <section className="info-sheet__section">
                  <h3 className="info-sheet__section-title">Mini drill</h3>
                  <p>
                    If a row is mostly <span className="htp-accent htp-accent--green">green</span> but Equipment is
                    <span className="htp-accent htp-accent--red"> red</span>, keep the same pattern and change only the tool.
                  </p>
                </section>

                <section className="info-sheet__section">
                  <h3 className="info-sheet__section-title">Modes</h3>
                  <p>
                    <strong>Daily</strong>: one exercise per day, reset at midnight (Europe/Rome).
                  </p>
                  <p>New exercise every day.</p>
                  <p>
                    <strong>Marathon</strong>: continuous run, up to 10 attempts per round, cumulative score.
                  </p>
                </section>

                <section className="info-sheet__section">
                  <h3 className="info-sheet__section-title">Quick tips</h3>
                  <p>
                    Start with a common exercise, then narrow down based on your first two color patterns.
                  </p>
                  <p>
                    Use cell tooltips to read fast definitions of shown values.
                  </p>
                </section>
              </div>
            ) : footerModal === "stats" ? (
              <div className="info-sheet__body">
                {statsStatus === "loading" ? (
                  <section className="info-sheet__section">
                    <p>Loading stats...</p>
                  </section>
                ) : stats ? (
                  <>
                    <section className="info-sheet__section">
                      <div className="stats-sheet__kpis">
                        <div className="stats-sheet__kpi">
                          <span className="stats-sheet__kpi-label">Games</span>
                          <strong>{stats.gamesPlayed}</strong>
                        </div>
                        <div className="stats-sheet__kpi">
                          <span className="stats-sheet__kpi-label">Won</span>
                          <strong>{stats.gamesWon}</strong>
                        </div>
                        <div className="stats-sheet__kpi">
                          <span className="stats-sheet__kpi-label">
                            Win Rate
                          </span>
                          <strong>{stats.winRate}%</strong>
                        </div>
                        <div className="stats-sheet__kpi">
                          <span className="stats-sheet__kpi-label">
                            Avg Guesses
                          </span>
                          <strong>{stats.averageGuesses}</strong>
                        </div>
                        <div className="stats-sheet__kpi">
                          <span className="stats-sheet__kpi-label">
                            One Shots
                          </span>
                          <strong>{stats.oneShots}</strong>
                        </div>
                        <div className="stats-sheet__kpi">
                          <span className="stats-sheet__kpi-label">
                            One Shot %
                          </span>
                          <strong>{stats.oneShotRate}%</strong>
                        </div>
                        <div className="stats-sheet__kpi">
                          <span className="stats-sheet__kpi-label">
                            Current Streak
                          </span>
                          <strong>{stats.currentStreak}</strong>
                        </div>
                        <div className="stats-sheet__kpi">
                          <span className="stats-sheet__kpi-label">
                            Max Streak
                          </span>
                          <strong>{stats.maxStreak}</strong>
                        </div>
                      </div>
                    </section>

                    <section className="info-sheet__section">
                      <h3 className="info-sheet__section-title">
                        Guesses Per Game
                      </h3>
                      {statsChart ? (
                        <div className="stats-sheet__chart-wrap">
                          <svg
                            viewBox={`0 0 ${statsChart.width} ${statsChart.height}`}
                            className="stats-sheet__chart"
                            aria-label="Guesses per game chart"
                          >
                            {statsChart.xTicks.map((tick) => (
                              <line
                                key={`x-grid-${tick.label}-${tick.x}`}
                                x1={tick.x}
                                y1={statsChart.plotTop}
                                x2={tick.x}
                                y2={statsChart.plotBottom}
                                className="stats-sheet__grid-line stats-sheet__grid-line--x"
                              />
                            ))}
                            {statsChart.yTicks.map((tick) => (
                              <line
                                key={`y-grid-${tick.value}-${tick.y}`}
                                x1={statsChart.plotLeft}
                                y1={tick.y}
                                x2={statsChart.plotRight}
                                y2={tick.y}
                                className="stats-sheet__grid-line stats-sheet__grid-line--y"
                              />
                            ))}

                            <line
                              x1={statsChart.plotLeft}
                              y1={statsChart.plotBottom}
                              x2={statsChart.plotRight}
                              y2={statsChart.plotBottom}
                              className="stats-sheet__axis-line"
                            />
                            <line
                              x1={statsChart.plotLeft}
                              y1={statsChart.plotTop}
                              x2={statsChart.plotLeft}
                              y2={statsChart.plotBottom}
                              className="stats-sheet__axis-line"
                            />

                            <path d={statsChart.linePath} className="stats-sheet__line" />

                            {statsChart.dots.map((dot) => (
                              <circle
                                key={dot.label}
                                cx={dot.x}
                                cy={dot.y}
                                r="2.6"
                                className="stats-sheet__dot"
                              >
                                <title>{`${dot.label}: ${dot.value} guesses`}</title>
                              </circle>
                            ))}

                            {statsChart.yTicks.map((tick) => (
                              <text
                                key={`y-label-${tick.value}-${tick.y}`}
                                x={statsChart.plotLeft - 10}
                                y={tick.y + 3}
                                textAnchor="end"
                                className="stats-sheet__tick-label stats-sheet__tick-label--y"
                              >
                                {tick.value}
                              </text>
                            ))}

                            {statsChart.xTicks.map((tick, index) => (
                              <text
                                key={`x-label-${tick.label}-${tick.x}`}
                                x={tick.x}
                                y={statsChart.height - 8}
                                textAnchor={
                                  index === 0
                                    ? "start"
                                    : index === statsChart.xTicks.length - 1
                                      ? "end"
                                      : "middle"
                                }
                                className="stats-sheet__tick-label stats-sheet__tick-label--x"
                              >
                                {tick.label}
                              </text>
                            ))}
                          </svg>
                        </div>
                      ) : (
                        <p className="stats-sheet__empty">
                          No played games yet. Complete at least one daily game
                          to see your chart.
                        </p>
                      )}
                    </section>
                  </>
                ) : statsStatus === "error" ? (
                  <section className="info-sheet__section">
                    <p>{statsError ?? "Stats are currently unavailable."}</p>
                    <button
                      type="button"
                      className="exercise-media-modal__close stats-sheet__retry"
                      onClick={() => {
                        void loadStats();
                      }}
                    >
                      Retry
                    </button>
                  </section>
                ) : (
                  <section className="info-sheet__section">
                    <p>Stats are currently unavailable.</p>
                  </section>
                )}
              </div>
            ) : (
              <div className="info-sheet__body">
                <section className="info-sheet__section">
                  <h3 className="info-sheet__section-title">Data We Store</h3>
                  <p>
                    We store gameplay data needed to run the game: guesses,
                    feedback, daily game state, and aggregate stats.
                  </p>
                </section>
                <section className="info-sheet__section">
                  <h3 className="info-sheet__section-title">
                    Media And Enrichment
                  </h3>
                  <p>
                    Exercise GIFs and enrichment metadata are synced server-side
                    and saved in the internal database.
                  </p>
                  <p>
                    Provider data is used as raw input only. Gameplay remains
                    based on Liftdle internal fields.
                  </p>
                </section>
                <section className="info-sheet__section">
                  <h3 className="info-sheet__section-title">Authentication</h3>
                  <p>
                    Sessions use Supabase auth. Anonymous sessions may be used
                    to enable gameplay before account linking.
                  </p>
                </section>
                <section className="info-sheet__section">
                  <h3 className="info-sheet__section-title">Contact</h3>
                  <p>
                    For data requests or deletion, contact the project admin and
                    provide your user identifier if available.
                  </p>
                </section>
              </div>
            )}
          </div>
        </section>
      ) : null}

      {toast ? <div className="game-toast">{toast.message}</div> : null}
      {shouldShowDailyCelebration ? (
        <DailyCelebration
          key={`daily-celebration-${dailyCelebrationSeed}`}
          durationMs={DAILY_CELEBRATION_DURATION_MS}
        />
      ) : null}
      {isMarathonCompleted && showMarathonCelebration ? (
        <DailyCelebration
          key={`marathon-celebration-${marathonCelebrationSeed}`}
          durationMs={MARATHON_CELEBRATION_DURATION_MS}
          powerMultiplier={3}
        />
      ) : null}
    </>
  );
}

