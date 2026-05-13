import test from "node:test";
import assert from "node:assert/strict";
import {
  buildLiftGridPuzzle,
  toLiftGridExercise,
  validateLiftGridGuess,
  type LiftGridExercise,
} from "@/lib/liftgrid/puzzle";
import type { Exercise } from "@/types/exercise";

function buildFixtureExercises() {
  return [
    {
      id: "bench-press",
      slug: "bench-press",
      name: "Bench Press",
      aliases: [],
      muscle_group: "chest",
      muscle: ["chest"],
      equipment: ["barbell"],
      movement: ["push"],
      pattern: ["horizontal"],
      reps: ["1-5"],
      goal: ["strength"],
      ego: ["high"],
      is_live: true,
    },
    {
      id: "push-up",
      slug: "push-up",
      name: "Push-Up",
      aliases: [],
      muscle_group: "chest",
      muscle: ["chest"],
      equipment: ["bodyweight"],
      movement: ["push"],
      pattern: ["horizontal"],
      reps: ["12+"],
      goal: ["endurance"],
      ego: ["low"],
      is_live: true,
    },
    {
      id: "lat-pulldown",
      slug: "lat-pulldown",
      name: "Lat Pulldown",
      aliases: [],
      muscle_group: "back",
      muscle: ["back"],
      equipment: ["machine"],
      movement: ["pull"],
      pattern: ["vertical"],
      reps: ["6-12"],
      goal: ["hypertrophy"],
      ego: ["medium"],
      is_live: true,
    },
    {
      id: "barbell-row",
      slug: "barbell-bent-over-row",
      name: "Barbell Bent Over Row",
      aliases: [],
      muscle_group: "back",
      muscle: ["back"],
      equipment: ["barbell"],
      movement: ["pull"],
      pattern: ["horizontal"],
      reps: ["6-12"],
      goal: ["hypertrophy"],
      ego: ["medium"],
      is_live: true,
    },
  ] satisfies Exercise[];
}

function buildRotationFixtureExercises(): Exercise[] {
  const rows = ["chest", "back", "legs", "shoulders", "arms", "core"] as const;
  const columns = ["barbell", "dumbbells", "bodyweight", "machine", "cable", "kettlebell"] as const;

  return rows.flatMap((row) =>
    columns.map((column) => ({
      id: `${row}-${column}`,
      slug: `${row}-${column}`,
      name: `${row} ${column}`,
      aliases: [`${row} ${column} alt`],
      muscle_group: row,
      muscle: [row],
      equipment: [column],
      movement: [row === "back" ? "pull" : row === "core" ? "core" : "push"],
      pattern: [row === "legs" ? "squat" : row === "back" ? "horizontal" : "vertical"],
      reps: ["6-12"],
      goal: ["hypertrophy"],
      ego: ["medium"],
      is_live: true,
    })),
  );
}

function toLiveLiftGridExercises(exercises: Exercise[]): LiftGridExercise[] {
  return exercises
    .map(toLiftGridExercise)
    .filter((exercise): exercise is LiftGridExercise => exercise !== null);
}

test("liftgrid accepts a correct exercise for a matching cell", () => {
  const exercises = toLiveLiftGridExercises(buildFixtureExercises());
  const puzzle = {
    gameDate: "2026-05-12",
    dailyNumber: 1,
    rowCategoryKey: "muscle_group" as const,
    columnCategoryKey: "equipment" as const,
    rowValues: ["chest", "back"],
    columnValues: ["barbell", "bodyweight"],
    rowLabels: ["Chest", "Back"],
    columnLabels: ["Barbell", "Bodyweight"],
  };

  const result = validateLiftGridGuess({
    exercises,
    puzzle,
    solvedCells: [],
    guess: "bench press",
  });

  assert.equal(result.correct, true);
  assert.equal(result.normalizedExerciseName, "Bench Press");
  assert.deepEqual(result.solvedCell, {
    rowIndex: 0,
    columnIndex: 0,
    exerciseId: "bench-press",
    exerciseName: "Bench Press",
  });
});

test("liftgrid rejects wrong muscle and wrong equipment independently", () => {
  const exercises = toLiveLiftGridExercises(buildFixtureExercises());
  const wrongRowPuzzle = {
    gameDate: "2026-05-12",
    dailyNumber: 1,
    rowCategoryKey: "muscle_group" as const,
    columnCategoryKey: "equipment" as const,
    rowValues: ["arms", "legs"],
    columnValues: ["bodyweight", "machine"],
    rowLabels: ["Arms", "Legs"],
    columnLabels: ["Bodyweight", "Machine"],
  };

  const wrongRow = validateLiftGridGuess({
    exercises,
    puzzle: wrongRowPuzzle,
    solvedCells: [],
    guess: "push-up",
  });
  assert.equal(wrongRow.correct, false);
  assert.equal(wrongRow.reason, "wrong_row_category");

  const wrongColumnPuzzle = {
    gameDate: "2026-05-12",
    dailyNumber: 1,
    rowCategoryKey: "muscle_group" as const,
    columnCategoryKey: "equipment" as const,
    rowValues: ["back", "arms"],
    columnValues: ["bodyweight", "cable"],
    rowLabels: ["Back", "Arms"],
    columnLabels: ["Bodyweight", "Cable"],
  };

  const wrongColumn = validateLiftGridGuess({
    exercises,
    puzzle: wrongColumnPuzzle,
    solvedCells: [],
    guess: "barbell bent over row",
  });
  assert.equal(wrongColumn.correct, false);
  assert.equal(wrongColumn.reason, "wrong_column_category");
});

test("liftgrid rejects duplicate exercise reuse and skips already solved cells", () => {
  const exercises = toLiveLiftGridExercises(buildFixtureExercises());
  const puzzle = {
    gameDate: "2026-05-12",
    dailyNumber: 1,
    rowCategoryKey: "muscle_group" as const,
    columnCategoryKey: "equipment" as const,
    rowValues: ["chest", "back"],
    columnValues: ["barbell", "machine"],
    rowLabels: ["Chest", "Back"],
    columnLabels: ["Barbell", "Machine"],
  };
  const solvedCells = [
    {
      rowIndex: 0,
      columnIndex: 0,
      exerciseId: "bench-press",
      exerciseName: "Bench Press",
    },
  ];

  const alreadyUsed = validateLiftGridGuess({
    exercises,
    puzzle,
    solvedCells,
    guess: "bench press",
  });
  assert.equal(alreadyUsed.reason, "already_used");

  const nextOpenMatch = validateLiftGridGuess({
    exercises,
    puzzle,
    solvedCells,
    guess: "lat pulldown",
  });
  assert.equal(nextOpenMatch.correct, true);
  assert.deepEqual(nextOpenMatch.solvedCell, {
    rowIndex: 1,
    columnIndex: 1,
    exerciseId: "lat-pulldown",
    exerciseName: "Lat Pulldown",
  });
});

test("liftgrid daily generation is stable for the same date and can vary across dates", () => {
  const exercises = toLiveLiftGridExercises(buildRotationFixtureExercises());

  const first = buildLiftGridPuzzle(exercises, "2026-05-12");
  const second = buildLiftGridPuzzle(exercises, "2026-05-12");
  const different = buildLiftGridPuzzle(exercises, "2026-05-13");

  assert.deepEqual(first.rowValues, second.rowValues);
  assert.deepEqual(first.columnValues, second.columnValues);
  assert.equal(
    first.rowValues.join("|") !== different.rowValues.join("|") ||
      first.columnValues.join("|") !== different.columnValues.join("|"),
    true,
  );
});

test("liftgrid accepts hybrid exercises for any listed muscle match", () => {
  const exercises = toLiveLiftGridExercises([
    ...buildFixtureExercises(),
    {
      id: "chest-back-barbell",
      slug: "chest-back-barbell",
      name: "Chest Back Barbell Combo",
      aliases: [],
      muscle_group: "chest",
      muscle: ["chest", "back"],
      equipment: ["barbell"],
      movement: ["push"],
      pattern: ["horizontal"],
      reps: ["6-12"],
      goal: ["hypertrophy"],
      ego: ["medium"],
      is_live: true,
    },
  ]);

  const puzzle = {
    gameDate: "2026-05-12",
    dailyNumber: 1,
    rowCategoryKey: "muscle_group" as const,
    columnCategoryKey: "equipment" as const,
    rowValues: ["back", "arms"],
    columnValues: ["barbell", "cable"],
    rowLabels: ["Back", "Arms"],
    columnLabels: ["Barbell", "Cable"],
  };

  const result = validateLiftGridGuess({
    exercises,
    puzzle,
    solvedCells: [],
    guess: "Chest Back Barbell Combo",
  });

  assert.equal(result.correct, true);
  assert.deepEqual(result.solvedCell, {
    rowIndex: 0,
    columnIndex: 0,
    exerciseId: "chest-back-barbell",
    exerciseName: "Chest Back Barbell Combo",
  });
});
