'use client';

import { useMemo, useState } from "react";
import { ExerciseIconCell } from "@/components/game/exercise-icon-cell";
import { FeedbackCell } from "@/components/game/feedback-cell";
import type { ExerciseArchiveRow } from "@/lib/exercise-archive/types";
import { getMuscleGroupIconKey, getMuscleGroupIconPath, resolveMuscleGroupIconKey } from "@/lib/exercises/icons";
import { getRepsDirection } from "@/lib/exercises/reps-direction";
import type { FeedbackColor } from "@/types/exercise";

type ArchiveSimulatorProps = {
  rows: ExerciseArchiveRow[];
};

type SimulatorField = "muscle" | "equipment" | "movement" | "pattern" | "reps" | "goal" | "ego";

type SimulatorValues = Record<SimulatorField, string>;

const FIELD_ORDER: SimulatorField[] = ["muscle", "equipment", "movement", "pattern", "reps", "goal", "ego"];
const FIELD_LABELS: Record<SimulatorField, string> = {
  muscle: "Muscle",
  equipment: "Equipment",
  movement: "Movement",
  pattern: "Pattern",
  reps: "Reps",
  goal: "Goal",
  ego: "Ego",
};
const PREVIEW_COLORS: FeedbackColor[] = ["green", "yellow", "red"];

function formatValues(values: string[]): string {
  return values.join(" / ");
}

function formatMusclePreviewValue(value: string): string {
  return value.replace(/\s*\/\s*/g, "\n/\n");
}

function buildValuesFromRow(row: ExerciseArchiveRow): SimulatorValues {
  return {
    muscle: formatValues(row.muscle),
    equipment: formatValues(row.equipment),
    movement: formatValues(row.movement),
    pattern: formatValues(row.pattern),
    reps: formatValues(row.reps),
    goal: formatValues(row.goal),
    ego: formatValues(row.ego),
  };
}

function cycleIndex(current: number, delta: number, length: number): number {
  return (current + delta + length) % length;
}

export function ArchiveSimulator({ rows }: ArchiveSimulatorProps) {
  const playableRows = useMemo(() => rows.filter((row) => row.isLive), [rows]);
  const initialRowIndex = Math.max(0, playableRows.findIndex((row) => row.media.syncStatus === "matched"));

  const [exerciseIndex, setExerciseIndex] = useState(initialRowIndex);
  const [previewColorIndex, setPreviewColorIndex] = useState(0);
  const [values, setValues] = useState<SimulatorValues>(() => buildValuesFromRow(playableRows[initialRowIndex] ?? rows[0]));

  const selectedRow = playableRows[exerciseIndex] ?? rows[0];

  const fieldOptions = useMemo(() => {
    const unique = Object.fromEntries(FIELD_ORDER.map((field) => [field, new Set<string>()])) as Record<
      SimulatorField,
      Set<string>
    >;

    for (const row of playableRows) {
      unique.muscle.add(formatValues(row.muscle));
      unique.equipment.add(formatValues(row.equipment));
      unique.movement.add(formatValues(row.movement));
      unique.pattern.add(formatValues(row.pattern));
      unique.reps.add(formatValues(row.reps));
      unique.goal.add(formatValues(row.goal));
      unique.ego.add(formatValues(row.ego));
    }

    return Object.fromEntries(
      FIELD_ORDER.map((field) => [field, Array.from(unique[field]).sort((left, right) => left.localeCompare(right))]),
    ) as Record<SimulatorField, string[]>;
  }, [playableRows]);

  if (!selectedRow) {
    return null;
  }

  const setNextExercise = (delta: number) => {
    setExerciseIndex((current) => cycleIndex(current, delta, playableRows.length));
  };

  const cycleFieldValue = (field: SimulatorField, delta: number) => {
    const options = fieldOptions[field];
    if (options.length === 0) return;
    const currentIndex = Math.max(0, options.indexOf(values[field]));
    const nextIndex = cycleIndex(currentIndex, delta, options.length);
    setValues((current) => ({ ...current, [field]: options[nextIndex] }));
  };

  const previewColor = PREVIEW_COLORS[previewColorIndex] ?? "green";
  const muscleBackdropIconPath = getMuscleGroupIconPath(
    resolveMuscleGroupIconKey({
      slug: selectedRow.slug,
      name: selectedRow.name,
      muscle_group: selectedRow.muscleGroup,
    }),
  );
  const muscleTokens = values.muscle
    .split("/")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const splitMuscleBackdropIconPaths =
    muscleTokens.length >= 2
      ? ([
          getMuscleGroupIconPath(getMuscleGroupIconKey(muscleTokens[0])),
          getMuscleGroupIconPath(getMuscleGroupIconKey(muscleTokens[1])),
        ] as const)
      : null;
  const useSplitMuscleBackdrop =
    splitMuscleBackdropIconPaths?.length === 2 &&
    splitMuscleBackdropIconPaths[0] !== splitMuscleBackdropIconPaths[1];
  const repsDirection = getRepsDirection(
    values.reps.split("/").map((item) => item.trim()).filter(Boolean),
    selectedRow.reps,
  );

  return (
    <section className="archive-simulator" aria-label="Archive icon simulator">
      <div className="archive-simulator__head">
        <div className="archive-simulator__head-main">
          <div>
            <p className="archive-simulator__kicker">Icon Playground</p>
            <h2 className="archive-simulator__title">Preview Value Backdrops</h2>
            <p className="archive-simulator__copy">
              Cycle each value to preview backdrop SVGs. New files like <code>vertical.svg</code> attach automatically
              when the filename matches the normalized value.
            </p>
          </div>
          <button
            type="button"
            className="archive-simulator__color-toggle"
            onClick={() => setPreviewColorIndex((current) => cycleIndex(current, 1, PREVIEW_COLORS.length))}
          >
            Color: {previewColor}
          </button>
        </div>
      </div>

      <div className="attempts-table-scroll archive-simulator__scroll" role="region" aria-label="Simulator row" tabIndex={0}>
        <div className="attempts-grid attempts-grid--header archive-simulator__header">
          <div className="attempts-header-cell">Exercise</div>
          {FIELD_ORDER.map((field) => (
            <div key={field} className="attempts-header-cell">
              {FIELD_LABELS[field]}
            </div>
          ))}
        </div>

        <div className="attempts-grid archive-simulator__grid">
          <div className="archive-simulator__control-cell">
            <button type="button" className="archive-simulator__arrow" onClick={() => setNextExercise(1)}>
              ^
            </button>
            <div className="attempts-exercise-cell archive-simulator__exercise-cell">
              <ExerciseIconCell
                exerciseName={selectedRow.name}
                exerciseSlug={selectedRow.slug}
                exerciseMuscleGroup={selectedRow.muscleGroup}
                exerciseMuscleValues={values.muscle}
              />
            </div>
            <button type="button" className="archive-simulator__arrow" onClick={() => setNextExercise(-1)}>
              v
            </button>
            <p className="archive-simulator__exercise-name">{selectedRow.name}</p>
          </div>

          {FIELD_ORDER.map((field) => (
            <div key={field} className="archive-simulator__control-cell">
              <button type="button" className="archive-simulator__arrow" onClick={() => cycleFieldValue(field, 1)}>
                ^
              </button>
              <FeedbackCell
                column={field}
                color={previewColor}
                value={values[field]}
                displayValueOverride={field === "muscle" ? formatMusclePreviewValue(values[field]) : undefined}
                repsDirection={field === "reps" ? repsDirection : null}
                exerciseMediaSlug={selectedRow.slug}
                backgroundIconPath={field === "muscle" && !useSplitMuscleBackdrop ? muscleBackdropIconPath : null}
                splitBackgroundIconPaths={field === "muscle" && useSplitMuscleBackdrop ? splitMuscleBackdropIconPaths : null}
                className={field === "muscle" ? "archive-simulator__muscle-cell" : "archive-simulator__sim-cell"}
                forceBackdropPreview
              />
              <button type="button" className="archive-simulator__arrow" onClick={() => cycleFieldValue(field, -1)}>
                v
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
