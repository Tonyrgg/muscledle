import type { LiveExerciseSuggestion } from "@/lib/game/client";

type DosePlan = {
  hypertrophy: string;
  strengthOrSkill: string;
};

export type PostGameInsights = {
  whyUse: string;
  cues: [string, string, string];
  mistakes: [string, string];
  variants: {
    easier: string;
    harder: string;
  };
  dose: DosePlan;
};

const OVERRIDES: Record<string, PostGameInsights> = {
  "bench-press": {
    whyUse: "Best used as the first main press on upper-body days when you want measurable load progression.",
    cues: [
      "Set upper back tight before lift-off and keep feet planted for leg drive.",
      "Lower to lower chest with controlled tempo, then press back over shoulders.",
      "Keep wrists stacked over elbows through the whole press.",
    ],
    mistakes: [
      "Elbows flare early: tuck slightly and keep forearms vertical at the bottom.",
      "Bar path too high: touch lower chest, then drive diagonally back.",
    ],
    variants: {
      easier: "Dumbbell Bench Press",
      harder: "Paused Bench Press (1-2s chest pause)",
    },
    dose: {
      hypertrophy: "4 x 6-10, rest 2:00-2:30",
      strengthOrSkill: "5 x 3-5, rest 2:30-3:30",
    },
  },
  squat: {
    whyUse: "Primary lower-body strength builder; place it early in the session while fresh.",
    cues: [
      "Brace before descent and keep ribcage stacked over pelvis.",
      "Sit down between hips while knees track over toes.",
      "Drive up by pushing floor away, keeping chest and hips rising together.",
    ],
    mistakes: [
      "Heels lifting: reduce load and improve ankle/stance setup.",
      "Hips shoot up first: focus on full-foot pressure and core brace.",
    ],
    variants: {
      easier: "Goblet Squat",
      harder: "Pause Squat",
    },
    dose: {
      hypertrophy: "4 x 6-10, rest 2:00-2:30",
      strengthOrSkill: "5 x 3-5, rest 2:30-3:30",
    },
  },
  "pull-up": {
    whyUse: "High-value vertical pull for back and arm development; ideal as first pull movement.",
    cues: [
      "Start from active hang: shoulders down and ribs controlled.",
      "Pull elbows toward back pockets, not straight backward.",
      "Finish with chest up and controlled lowering on every rep.",
    ],
    mistakes: [
      "Kipping too early: slow the eccentric and remove momentum.",
      "Half reps: use assistance and lock full range first.",
    ],
    variants: {
      easier: "Assisted Pull-Up",
      harder: "Weighted Pull-Up",
    },
    dose: {
      hypertrophy: "4 x 6-10, rest 2:00-2:30",
      strengthOrSkill: "5 x 3-5, rest 2:30-3:30",
    },
  },
};

function title(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function buildPostGameInsights(exercise: LiveExerciseSuggestion | null): PostGameInsights {
  if (!exercise) {
    return {
      whyUse: "Use this exercise where it best fits your current plan and weekly recovery.",
      cues: [
        "Set a stable start position before the first rep.",
        "Keep the working muscles under control through full range.",
        "Use repeatable tempo and stop short of form breakdown.",
      ],
      mistakes: [
        "Using load that breaks technique: lower intensity and rebuild quality.",
        "Rushing reps: keep each rep intentional and controlled.",
      ],
      variants: {
        easier: "Machine or supported variant",
        harder: "Tempo/paused or weighted variant",
      },
      dose: {
        hypertrophy: "3-4 x 8-12, rest 60-120s",
        strengthOrSkill: "4-5 x 3-6, rest 2:00-3:00",
      },
    };
  }

  const override = OVERRIDES[exercise.slug];
  if (override) return override;

  const muscle = exercise.muscle[0] ?? "core";
  const movement = exercise.movement[0] ?? "push";
  const pattern = exercise.pattern[0] ?? "horizontal";
  const equipment = exercise.equipment[0] ?? "bodyweight";
  const reps = exercise.reps[0] ?? "6-12";
  const goal = exercise.goal[0] ?? "hypertrophy";

  const whyUse =
    movement === "isolation"
      ? `Best used mid/late session to bring up ${title(muscle)} without high systemic fatigue.`
      : pattern === "hinge" || pattern === "squat"
        ? "Use it early in the session as a main strength pattern while fresh."
        : `Use it as a primary ${title(movement)} movement to build consistent output and progression.`;

  const cues: [string, string, string] = [
    `Set up stable on ${title(equipment)} and lock your brace before each rep.`,
    `Keep a clean ${title(pattern)} path and avoid compensations at the hardest point.`,
    "Control the eccentric and finish each rep with the same range and tempo.",
  ];

  const mistakes: [string, string] = [
    "Shortening range when fatigue rises: reduce load and keep full controlled ROM.",
    "Using momentum to finish reps: slow down and own the transition points.",
  ];

  const variants = {
    easier:
      equipment === "bodyweight"
        ? `Assisted ${exercise.name}`
        : `Machine-assisted ${title(movement)} variant`,
    harder:
      goal === "strength" || reps === "1-5"
        ? `Paused ${exercise.name}`
        : `Tempo ${exercise.name} (3s eccentric)`,
  };

  const dose: DosePlan =
    goal === "strength" || reps === "1-5"
      ? {
          hypertrophy: "4 x 6-8, rest 2:00-2:30",
          strengthOrSkill: "5 x 3-5, rest 2:30-3:30",
        }
      : goal === "skill"
        ? {
            hypertrophy: "3-4 x 6-10, rest 90-150s",
            strengthOrSkill: "5 x 2-4 quality reps, rest 2:00-3:00",
          }
        : {
            hypertrophy: "3-5 x 8-12, rest 60-120s",
            strengthOrSkill: "4 x 4-6, rest 2:00-2:30",
          };

  return { whyUse, cues, mistakes, variants, dose };
}

