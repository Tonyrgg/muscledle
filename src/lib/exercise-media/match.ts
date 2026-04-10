import type { ExternalExerciseCandidate, InternalExercise } from "@/lib/exercise-media/types";

const MIN_SCORE = 0.72;

export function normalizeExerciseName(input: string): string {
  let value = input.toLowerCase().trim();

  value = value.replace(/[()]/g, " ");
  value = value.replace(/[-_]/g, " ");
  value = value.replace(/\bpull\s*up\b/g, "pullup");
  value = value.replace(/\bpush\s*up\b/g, "pushup");
  value = value.replace(/\bdb\b/g, "dumbbell");
  value = value.replace(/\bbb\b/g, "barbell");
  value = value.replace(/\brdl\b/g, "romanian deadlift");

  return value.replace(/\s+/g, " ").trim();
}

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
  if (candidate === target) {
    return { score: 1, reason: "exact normalized match" };
  }

  if (candidate.includes(target) || target.includes(candidate)) {
    return { score: 0.85, reason: "contains match" };
  }

  const overlapScore = tokenOverlapScore(target, candidate);
  if (overlapScore >= 0.7) {
    return { score: overlapScore, reason: "token overlap" };
  }

  return { score: 0, reason: "no relevant overlap" };
}

export function findBestMatch(
  exercise: InternalExercise,
  candidates: ExternalExerciseCandidate[],
): { candidate: ExternalExerciseCandidate; score: number; reason: string } | null {
  const normalizedName = normalizeExerciseName(exercise.name);
  const normalizedAliases = (exercise.aliases ?? []).map((alias) => normalizeExerciseName(alias));

  console.log(`[exercise-media] slug=\"${exercise.slug}\" normalized=\"${normalizedName}\"`);

  let best: { candidate: ExternalExerciseCandidate; score: number; reason: string } | null = null;

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

  if (!best) {
    return null;
  }

  console.log(
    `[exercise-media] best match=\"${best.candidate.name}\" score=${best.score} reason=\"${best.reason}\"`,
  );

  if (best.score < MIN_SCORE) {
    return null;
  }

  return best;
}

export { MIN_SCORE };
