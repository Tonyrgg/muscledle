import { gameDateRome } from "@/lib/game/date";
import { getExerciseNaming, normalizeGuessText } from "@/lib/exercises/naming";
import type { Exercise } from "@/types/exercise";
import type {
  LiftGridCategoryKey,
  LiftGridGuessFailureReason,
  LiftGridSolvedCell,
} from "@/types/liftgrid";

export type LiftGridExercise = Pick<
  Exercise,
  "id" | "slug" | "name" | "aliases" | "muscle_group" | "equipment" | "movement" | "pattern" | "goal" | "muscle"
> & {
  canonical_name: string;
  display_name: string;
};

export type LiftGridModeConfig = {
  key: string;
  size: number;
  rowCategoryKey: LiftGridCategoryKey;
  columnCategoryKey: LiftGridCategoryKey;
  rowPool: string[];
  columnPool: string[];
};

export type LiftGridPuzzle = {
  gameDate: string;
  dailyNumber: number;
  rowCategoryKey: LiftGridCategoryKey;
  columnCategoryKey: LiftGridCategoryKey;
  rowValues: string[];
  columnValues: string[];
  rowLabels: string[];
  columnLabels: string[];
};

export type LiftGridValidationResult = {
  correct: boolean;
  normalizedExerciseName: string | null;
  reason: LiftGridGuessFailureReason | null;
  solvedCell: LiftGridSolvedCell | null;
};

type ValidationFailureContext = {
  rowMatchFound: boolean;
  columnMatchFound: boolean;
};

const DAY_ZERO = "2026-01-01";
const DEFAULT_SEED = "Liftdle-liftgrid-v1";
const EQUIPMENT_LABELS: Record<string, string> = {
  barbell: "Barbell",
  dumbbells: "Dumbbell",
  bodyweight: "Bodyweight",
  machine: "Machine",
  cable: "Cable",
  kettlebell: "Kettlebell",
};

export const DEFAULT_LIFTGRID_MODE: LiftGridModeConfig = {
  key: "liftgrid:daily:muscle-group:equipment:3x3",
  size: 3,
  rowCategoryKey: "muscle_group",
  columnCategoryKey: "equipment",
  rowPool: ["chest", "back", "legs", "shoulders", "arms", "core"],
  columnPool: ["barbell", "dumbbells", "bodyweight", "machine", "cable", "kettlebell"],
};

const validGridCache = new Map<string, Array<{ rows: string[]; columns: string[] }>>();

function toDayIndex(isoDate: string): number {
  return Math.floor(new Date(`${isoDate}T00:00:00Z`).getTime() / 86400000);
}

function hashSeed(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  return () => {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffledIndexes(length: number, seed: number): number[] {
  const random = mulberry32(seed);
  const indexes = Array.from({ length }, (_, index) => index);

  for (let index = indexes.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [indexes[index], indexes[swapIndex]] = [indexes[swapIndex], indexes[index]];
  }

  return indexes;
}

function buildCombinations(values: string[], size: number): string[][] {
  const output: string[][] = [];

  function visit(startIndex: number, current: string[]) {
    if (current.length === size) {
      output.push([...current]);
      return;
    }

    for (let index = startIndex; index <= values.length - (size - current.length); index += 1) {
      current.push(values[index]);
      visit(index + 1, current);
      current.pop();
    }
  }

  visit(0, []);
  return output;
}

function getExerciseCategoryValues(
  exercise: LiftGridExercise,
  categoryKey: LiftGridCategoryKey,
): string[] {
  if (categoryKey === "muscle_group") {
    const values = new Set<string>();

    const addValue = (value: string | null | undefined) => {
      if (!value) return;
      for (const part of value
        .split(/[\/,&|]+/g)
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean)) {
        values.add(part);
      }
    };

    addValue(exercise.muscle_group);
    for (const muscle of exercise.muscle ?? []) {
      addValue(muscle);
    }

    return [...values];
  }

  const value = exercise[categoryKey];
  return Array.isArray(value) ? value : [value];
}

function matchesCategory(
  exercise: LiftGridExercise,
  categoryKey: LiftGridCategoryKey,
  categoryValue: string,
) {
  return getExerciseCategoryValues(exercise, categoryKey).includes(categoryValue);
}

function canAssignUniqueExercises(candidateSets: string[][]): boolean {
  const ordered = candidateSets
    .map((candidates, index) => ({ candidates, index }))
    .sort((left, right) => left.candidates.length - right.candidates.length);
  const used = new Set<string>();

  function backtrack(position: number): boolean {
    if (position >= ordered.length) return true;
    const { candidates } = ordered[position];

    for (const candidate of candidates) {
      if (used.has(candidate)) continue;
      used.add(candidate);
      if (backtrack(position + 1)) return true;
      used.delete(candidate);
    }

    return false;
  }

  return backtrack(0);
}

function buildValidGridCombos(
  exercises: LiftGridExercise[],
  config: LiftGridModeConfig,
): Array<{ rows: string[]; columns: string[] }> {
  const cacheKey = `${config.key}:${exercises.map((exercise) => exercise.id).join(",")}`;
  const cached = validGridCache.get(cacheKey);
  if (cached) return cached;

  const rowCombos = buildCombinations(config.rowPool, config.size);
  const columnCombos = buildCombinations(config.columnPool, config.size);
  const output: Array<{ rows: string[]; columns: string[] }> = [];

  for (const rows of rowCombos) {
    for (const columns of columnCombos) {
      const candidateSets: string[][] = [];

      for (const rowValue of rows) {
        for (const columnValue of columns) {
          const matchingIds = exercises
            .filter(
              (exercise) =>
                matchesCategory(exercise, config.rowCategoryKey, rowValue) &&
                matchesCategory(exercise, config.columnCategoryKey, columnValue),
            )
            .map((exercise) => exercise.id);

          if (matchingIds.length === 0) {
            candidateSets.length = 0;
            break;
          }

          candidateSets.push(matchingIds);
        }

        if (candidateSets.length === 0) {
          break;
        }
      }

      if (candidateSets.length !== config.size * config.size) {
        continue;
      }

      if (!canAssignUniqueExercises(candidateSets)) {
        continue;
      }

      output.push({ rows, columns });
    }
  }

  validGridCache.set(cacheKey, output);
  return output;
}

function toLabel(value: string): string {
  if (EQUIPMENT_LABELS[value]) return EQUIPMENT_LABELS[value];
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getLiftGridDailyNumber(gameDate: string): number {
  return toDayIndex(gameDate) - toDayIndex(DAY_ZERO) + 1;
}

export function toLiftGridExercise(exercise: Exercise): LiftGridExercise | null {
  const naming = getExerciseNaming(exercise.slug, exercise.name, exercise.aliases ?? []);
  if (naming.merged_into_slug) {
    return null;
  }

  return {
    ...exercise,
    name: naming.display_name,
    canonical_name: naming.canonical_name,
    display_name: naming.display_name,
    aliases: naming.aliases,
  };
}

export function buildLiftGridPuzzle(
  exercises: LiftGridExercise[],
  gameDate = gameDateRome(),
  config: LiftGridModeConfig = DEFAULT_LIFTGRID_MODE,
): LiftGridPuzzle {
  const validGrids = buildValidGridCombos(exercises, config);
  if (validGrids.length === 0) {
    throw new Error("No valid LiftGrid daily combinations are available for the current dataset.");
  }

  const dayIndex = toDayIndex(gameDate);
  const cycleSize = validGrids.length;
  const cycleNumber = Math.floor(dayIndex / cycleSize);
  const indexInCycle = ((dayIndex % cycleSize) + cycleSize) % cycleSize;
  const seedBase = process.env.DAILY_ROTATION_SEED ?? DEFAULT_SEED;
  const seed = hashSeed(`${seedBase}:${config.key}:${cycleNumber}:${cycleSize}`);
  const order = shuffledIndexes(cycleSize, seed);
  const chosen = validGrids[order[indexInCycle]];

  return {
    gameDate,
    dailyNumber: getLiftGridDailyNumber(gameDate),
    rowCategoryKey: config.rowCategoryKey,
    columnCategoryKey: config.columnCategoryKey,
    rowValues: chosen.rows,
    columnValues: chosen.columns,
    rowLabels: chosen.rows.map(toLabel),
    columnLabels: chosen.columns.map(toLabel),
  };
}

type ExerciseLookup = {
  byNormalized: Map<string, LiftGridExercise>;
  byCompact: Map<string, LiftGridExercise>;
};

function buildExerciseLookup(exercises: LiftGridExercise[]): ExerciseLookup {
  const byNormalized = new Map<string, LiftGridExercise>();
  const byCompact = new Map<string, LiftGridExercise>();

  for (const exercise of exercises) {
    const candidates = [
      exercise.name,
      exercise.display_name,
      exercise.canonical_name,
      ...(exercise.aliases ?? []),
    ];

    for (const candidate of candidates) {
      const normalized = normalizeGuessText(candidate);
      const compact = normalized.replace(/\s+/g, "");
      if (normalized && !byNormalized.has(normalized)) {
        byNormalized.set(normalized, exercise);
      }
      if (compact && !byCompact.has(compact)) {
        byCompact.set(compact, exercise);
      }
    }
  }

  return { byNormalized, byCompact };
}

export function resolveLiftGridExerciseGuess(
  exercises: LiftGridExercise[],
  guess: string,
): LiftGridExercise | null {
  const normalized = normalizeGuessText(guess);
  if (!normalized) return null;

  const compact = normalized.replace(/\s+/g, "");
  const lookup = buildExerciseLookup(exercises);
  return lookup.byNormalized.get(normalized) ?? lookup.byCompact.get(compact) ?? null;
}

export function validateLiftGridGuess(params: {
  exercises: LiftGridExercise[];
  puzzle: LiftGridPuzzle;
  solvedCells: LiftGridSolvedCell[];
  guess: string;
}): LiftGridValidationResult {
  const { exercises, puzzle, solvedCells, guess } = params;
  const guessedExercise = resolveLiftGridExerciseGuess(exercises, guess);

  if (!guessedExercise) {
    return {
      correct: false,
      normalizedExerciseName: null,
      reason: "unknown_exercise",
      solvedCell: null,
    };
  }

  if (solvedCells.some((cell) => cell.exerciseId === guessedExercise.id)) {
    return {
      correct: false,
      normalizedExerciseName: null,
      reason: "already_used",
      solvedCell: null,
    };
  }

  const solvedSet = new Set(solvedCells.map((cell) => `${cell.rowIndex}:${cell.columnIndex}`));
  const failureContext: ValidationFailureContext = {
    rowMatchFound: false,
    columnMatchFound: false,
  };

  for (let rowIndex = 0; rowIndex < puzzle.rowValues.length; rowIndex += 1) {
    const rowValue = puzzle.rowValues[rowIndex];
    const rowMatches = matchesCategory(guessedExercise, puzzle.rowCategoryKey, rowValue);
    if (rowMatches) {
      failureContext.rowMatchFound = true;
    }

    for (let columnIndex = 0; columnIndex < puzzle.columnValues.length; columnIndex += 1) {
      const key = `${rowIndex}:${columnIndex}`;
      if (solvedSet.has(key)) continue;

      const columnValue = puzzle.columnValues[columnIndex];
      const columnMatches = matchesCategory(
        guessedExercise,
        puzzle.columnCategoryKey,
        columnValue,
      );

      if (columnMatches) {
        failureContext.columnMatchFound = true;
      }

      if (!rowMatches || !columnMatches) {
        continue;
      }

      return {
        correct: true,
        normalizedExerciseName: guessedExercise.display_name,
        reason: null,
        solvedCell: {
          rowIndex,
          columnIndex,
          exerciseId: guessedExercise.id,
          exerciseName: guessedExercise.display_name,
        },
      };
    }
  }

  return {
    correct: false,
    normalizedExerciseName: null,
    reason: failureContext.rowMatchFound
      ? failureContext.columnMatchFound
        ? "no_matching_cell"
        : "wrong_column_category"
      : "wrong_row_category",
    solvedCell: null,
  };
}

export function buildLiftGridShareText(params: {
  dailyNumber: number;
  rows: number;
  columns: number;
  solvedCells: LiftGridSolvedCell[];
  totalCells: number;
}) {
  const solvedSet = new Set(params.solvedCells.map((cell) => `${cell.rowIndex}:${cell.columnIndex}`));
  const lines: string[] = [];

  for (let rowIndex = 0; rowIndex < params.rows; rowIndex += 1) {
    let line = "";
    for (let columnIndex = 0; columnIndex < params.columns; columnIndex += 1) {
      line += solvedSet.has(`${rowIndex}:${columnIndex}`) ? "🟩" : "⬛";
    }
    lines.push(line);
  }

  return `LIFTGRID #${params.dailyNumber}\n${lines.join("\n")}\n${params.solvedCells.length}/${params.totalCells} completed`;
}
