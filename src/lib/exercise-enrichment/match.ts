import { normalizeExerciseName } from "@/lib/exercise-media/match";
import type { ExerciseDbRaw, InternalExercise } from "@/lib/exercise-enrichment/types";

export const MIN_MATCH_SCORE = 0.72;

type MatchCandidate = {
  candidate: ExerciseDbRaw;
  score: number;
  reason: string;
};

function tokenOverlapScore(left: string, right: string): number {
  const leftTokens = new Set(left.split(" ").filter(Boolean));
  const rightTokens = new Set(right.split(" ").filter(Boolean));

  if (leftTokens.size === 0 || rightTokens.size === 0) return 0;

  let common = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) common += 1;
  }

  const ratio = common / Math.max(leftTokens.size, rightTokens.size);
  if (ratio <= 0) return 0;
  return 0.7 + ratio * 0.14;
}

function scorePair(target: string, candidate: string): { score: number; reason: string } {
  if (candidate === target) return { score: 1, reason: "exact normalized match" };
  if (candidate.includes(target) || target.includes(candidate)) return { score: 0.85, reason: "contains match" };

  const overlap = tokenOverlapScore(target, candidate);
  if (overlap >= 0.7) return { score: overlap, reason: "token overlap" };

  return { score: 0, reason: "no relevant overlap" };
}

export function findBestRawMatch(
  exercise: InternalExercise,
  candidates: ExerciseDbRaw[],
): MatchCandidate | null {
  const normalizedName = normalizeExerciseName(exercise.name);
  const normalizedAliases = (exercise.aliases ?? []).map((alias) => normalizeExerciseName(alias));

  let best: MatchCandidate | null = null;

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeExerciseName(candidate.name);

    let score = 0;
    let reason = "no relevant overlap";

    const primary = scorePair(normalizedName, normalizedCandidate);
    score = primary.score;
    reason = primary.reason;

    if (normalizedAliases.includes(normalizedCandidate)) {
      score = Math.max(score, 0.98);
      reason = "exact alias match";
    } else {
      for (const alias of normalizedAliases) {
        const aliasScore = scorePair(alias, normalizedCandidate);
        if (aliasScore.score > score) {
          score = aliasScore.score;
          reason = `${aliasScore.reason} via alias`;
        }
      }
    }

    if (!best || score > best.score) {
      best = {
        candidate,
        score: Number(score.toFixed(4)),
        reason,
      };
    }
  }

  if (!best || best.score < MIN_MATCH_SCORE) return null;
  return best;
}

