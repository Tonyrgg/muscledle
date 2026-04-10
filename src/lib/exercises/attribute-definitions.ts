export type FeedbackColumnKey =
  | "muscle"
  | "equipment"
  | "movement"
  | "pattern"
  | "reps"
  | "goal"
  | "ego";

type ColumnDefinitions = Record<string, string>;

const ATTRIBUTE_DEFINITIONS: Record<FeedbackColumnKey, ColumnDefinitions> = {
  muscle: {
    chest: "PRIMARY CHEST DRIVER WITH STRONG PRESSING EMPHASIS",
    back: "BACK-FOCUSED WORK TO BUILD PULLING STRENGTH AND CONTROL",
    legs: "LOWER-BODY DOMINANT EFFORT FOR POWER AND STABILITY",
    shoulders: "DELTOID-HEAVY MOVEMENT FOR UPPER-BODY SUPPORT",
    arms: "DIRECT ARM ISOLATION TO BUILD BICEPS OR TRICEPS OUTPUT",
    core: "CORE-CENTERED TENSION TO IMPROVE BRACING AND CONTROL",
  },
  equipment: {
    barbell: "BARBELL LIFT: STABLE LOAD, BIG STRENGTH POTENTIAL",
    dumbbells: "DUMBBELL CONTROL FOR BALANCED SIDES AND RANGE",
    bodyweight: "BODYWEIGHT EXECUTION USING ONLY YOUR OWN MASS",
    machine: "MACHINE-GUIDED PATH FOR ISOLATION AND CONSISTENCY",
    cable: "CABLE RESISTANCE FOR CONSTANT TENSION THROUGH RANGE",
    kettlebell: "KETTLEBELL STYLE FOR SWING, FLOW, AND GRIP DEMAND",
  },
  movement: {
    push: "PUSH ACTION: YOU DRIVE THE LOAD AWAY FROM YOUR BODY",
    pull: "PULL ACTION: YOU DRAW THE LOAD TOWARD YOUR BODY",
    isolation: "ISOLATION PATTERN TARGETING A SINGLE MAIN MUSCLE",
    core: "CORE MOVEMENT CENTERED ON STABILITY AND MIDLINE CONTROL",
  },
  pattern: {
    horizontal: "HORIZONTAL LINE OF FORCE, USUALLY PRESS OR ROW",
    vertical: "VERTICAL FORCE PATH WITH OVERHEAD OR PULLDOWN BIAS",
    squat: "SQUAT PATTERN BUILT ON KNEE BEND AND LEG DRIVE",
    hinge: "HIP HINGE PATTERN LED BY GLUTES, HAMSTRINGS, AND BACK",
  },
  reps: {
    "1-5": "LOW-REP ZONE FOR HEAVY EFFORT AND MAX STRENGTH FOCUS",
    "6-12": "MID-REP RANGE FOR SIZE, CONTROL, AND SOLID INTENSITY",
    "12+": "HIGH-REP WORK FOR VOLUME, BURN, AND MUSCULAR ENDURANCE",
  },
  goal: {
    strength: "PRIMARY GOAL IS RAW STRENGTH AND LOAD PROGRESSION",
    hypertrophy: "PRIMARY GOAL IS MUSCLE GROWTH THROUGH VOLUME",
    endurance: "PRIMARY GOAL IS REPEATABLE OUTPUT AND WORK CAPACITY",
    skill: "PRIMARY GOAL IS TECHNIQUE, PRECISION, AND MOTOR CONTROL",
  },
  ego: {
    low: "LOW EGO: CLEAN EXECUTION OVER IMPRESSIVE NUMBERS",
    medium: "MEDIUM EGO: BALANCED BETWEEN FORM AND PERFORMANCE",
    high: "HIGH EGO: BIG NUMBERS, BIG RISKS, BIG CONFIDENCE",
  },
};

function normalizeToken(input: string): string {
  return input.trim().toLowerCase();
}

export function getAttributeDefinition(column: FeedbackColumnKey, value: string): string {
  const parts = value
    .split("/")
    .map((part) => normalizeToken(part))
    .filter(Boolean);

  if (parts.length === 0) {
    return "NO EXTRA DETAILS AVAILABLE FOR THIS ATTRIBUTE";
  }

  const matched = parts
    .map((part) => ATTRIBUTE_DEFINITIONS[column][part] ?? null)
    .filter((item): item is string => item !== null);

  if (matched.length === 0) {
    return "NO EXTRA DETAILS AVAILABLE FOR THIS ATTRIBUTE";
  }

  if (matched.length === 1) {
    return matched[0];
  }

  return matched.join(" / ");
}
