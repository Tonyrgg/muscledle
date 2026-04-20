export type ExerciseNaming = {
  slug: string;
  canonical_name: string;
  display_name: string;
  aliases: string[];
  merged_into_slug: string | null;
};

type MappingEntry = {
  oldName: string;
  newName: string;
  oldSlug: string;
  newSlug: string;
  mergedIntoSlug: string | null;
};

const RAW_NAMING_MAPPING = `
Ab Wheel Rollout -> Ab Wheel Rollout
Alternate Lateral Pulldown -> Single-Arm Lat Pulldown
Arnold Press -> Arnold Press
Back Extension -> Back Extension
Barbell Alternate Biceps Curl -> Alternating Barbell Curl
Barbell Bench Front Squat -> Front Squat
Barbell Bent Over Row -> Barbell Bent Over Row
Barbell Clean and press -> Barbell Clean and Press
Barbell Clean-grip Front Squat -> Clean-Grip Front Squat
Barbell Close-grip Bench Press -> Close-Grip Bench Press
Barbell Deadlift -> Barbell Deadlift
Barbell Decline Wide-grip Press -> Wide-Grip Decline Bench Press
Barbell Front Raise -> Barbell Front Raise
Barbell Glute Bridge Two Legs On Bench (male) -> Barbell Glute Bridge
Barbell Good Morning -> Barbell Good Morning
Barbell Incline Reverse-grip Press -> Reverse-Grip Incline Bench Press
Barbell Incline Shoulder Raise -> Incline Front Raise
Barbell Jm Bench Press -> JM Press
Barbell Jump Squat -> Barbell Jump Squat
Barbell Lying Close-grip Triceps Extension -> Close-Grip Skull Crusher
Barbell Lying Extension -> Barbell Skull Crusher
Barbell Narrow Stance Squat -> Narrow Stance Squat
Barbell One Arm Side Deadlift -> One-Arm Barbell Deadlift
Barbell Rear Delt Row -> Rear Delt Barbell Row
Barbell Reverse Wrist Curl -> Reverse Wrist Curl
Barbell Rollerout From Bench -> Barbell Rollout
Barbell Seated Behind Head Military Press -> Behind-the-Neck Seated Press
Barbell Seated Calf Raise -> Seated Barbell Calf Raise
Barbell Wide-grip Upright Row -> Wide-Grip Upright Row
Bench Press -> Bench Press
Bench Press Narrow Grip -> Close-Grip Bench Press (MERGE)
Bicep Curl -> Dumbbell Curl
Bodyweight Biceps Curl -> Bodyweight Curl
Bulgarian Split Squat -> Bulgarian Split Squat
Cable Alternate Shoulder Press -> Single-Arm Cable Shoulder Press
Cable Alternate Triceps Extension -> Single-Arm Cable Triceps Extension
Cable Bench Press -> Cable Chest Press
Cable Cross-over Reverse Fly -> Cable Reverse Fly
Cable Cross-over Variation -> Cable Crossover
Cable Crossover -> Cable Crossover
Cable Crunch -> Cable Crunch
Cable Deadlift -> Cable Deadlift
Cable Decline Fly -> Decline Cable Fly
Cable Front Raise -> Cable Front Raise
Cable Hammer Curl (with Rope) -> Rope Hammer Curl
Cable Incline Pushdown -> Incline Cable Pulldown
Cable Kneeling Crunch -> Kneeling Cable Crunch
Cable Lateral Raise -> Cable Lateral Raise
Cable Rear Delt Row (stirrups) -> Cable Rear Delt Row
Cable Rear Delt Row (with Rope) -> Rope Rear Delt Row
Cable Reverse Grip Triceps Pushdown (sz-bar) (with Arm Blaster) -> Reverse-Grip Triceps Pushdown
Cable Standing Pulldown (with Rope) -> Standing Rope Pulldown
Cable Woodchopper -> Cable Woodchopper
Calf Press Using Leg Press Machine -> Leg Press Calf Raise
Calf Raise using Hack Squat Machine -> Hack Squat Calf Raise
Chest Dips -> Chest Dips
Chest Fly -> Dumbbell Chest Fly
Chin Up -> Chin-Up
Close-Grip Bench Press -> Close-Grip Bench Press
DB Underhand bench press -> Underhand Dumbbell Bench Press
Decline Bench Leg Raise -> Decline Bench Leg Raise
Decline Bench Press -> Decline Bench Press
Double-Leg Abdominal Press -> Double Leg Crunch
Dumbbell Bench Press -> Dumbbell Bench Press
Dumbbell Bench Seated Press -> Seated Dumbbell Press
Dumbbell Bench Squat -> Dumbbell Squat
Dumbbell Bicep Curl Lunge With Bowling Motion -> Curl to Lunge
Dumbbell bicep curl to press -> Dumbbell Curl to Press
Dumbbell Row -> Dumbbell Row
Elbows Tucked DB Bench Press -> Tucked-Elbow Dumbbell Press
Face Pull -> Face Pull
Front Raise -> Dumbbell Front Raise
Hammer Curl -> Hammer Curl
Hanging Leg Raise -> Hanging Leg Raise
Incline Dumbbell Press -> Incline Dumbbell Press
Kettlebell One Legged Deadlift -> Single-Leg Kettlebell Deadlift
Lat Pulldown -> Lat Pulldown
Leg Curl -> Leg Curl
Leg Extension -> Leg Extension
Leg Press -> Leg Press
Lunges -> Lunges
Machine Chest Press -> Machine Chest Press
Military Press -> Military Press
Overhead Tricep Extension -> Overhead Triceps Extension
Plank -> Plank
Pull-Up -> Pull-Up
Push-Up -> Push-Up
Reverse Grip Bench Press -> Reverse-Grip Bench Press
Romanian Deadlift -> Romanian Deadlift
Russian Twist -> Russian Twist
Seated Bench Press -> Seated Chest Press
Seated Cable Row -> Seated Cable Row
Single Arm Plank to Row -> Single-Arm Plank Row
Skull Crusher -> Skull Crusher
Squat -> Back Squat
Standing Calf Raise -> Standing Calf Raise
Sumo Deadlift -> Sumo Deadlift
T-Bar row -> T-Bar Row
Tricep Pushdown -> Triceps Pushdown
Upright Row -> Upright Row
`;

function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function slugify(value: string): string {
  return stripDiacritics(value)
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function normalizeGuessText(value: string): string {
  return stripDiacritics(value)
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeGuessCompact(value: string): string {
  return normalizeGuessText(value).replace(/\s+/g, "");
}

function parseMapping(): MappingEntry[] {
  const lines = RAW_NAMING_MAPPING.split("\n").map((line) => line.trim()).filter(Boolean);

  return lines.map((line) => {
    const match = line.match(/^(.*?)\s*->\s*(.*?)(?:\s+\(MERGE\))?$/);
    if (!match) {
      throw new Error(`Invalid naming mapping line: ${line}`);
    }

    const oldName = match[1].trim();
    const newName = match[2].trim();
    const isMerge = /\(MERGE\)\s*$/.test(line);

    return {
      oldName,
      newName,
      oldSlug: slugify(oldName),
      newSlug: slugify(newName),
      mergedIntoSlug: isMerge ? slugify(newName) : null,
    };
  });
}

const MAPPING_ENTRIES = parseMapping();
const MAPPING_BY_OLD_SLUG = new Map(MAPPING_ENTRIES.map((entry) => [entry.oldSlug, entry]));
const MERGE_SOURCES_BY_TARGET = MAPPING_ENTRIES.reduce((acc, entry) => {
  if (!entry.mergedIntoSlug) return acc;
  const list = acc.get(entry.mergedIntoSlug) ?? [];
  list.push(entry);
  acc.set(entry.mergedIntoSlug, list);
  return acc;
}, new Map<string, MappingEntry[]>());

function addAliasVariants(output: Set<string>, candidate: string): void {
  const raw = candidate.trim();
  if (!raw) return;

  const variants = new Set<string>([raw]);
  variants.add(raw.replace(/-/g, " "));
  variants.add(raw.replace(/\s+/g, "-"));
  variants.add(raw.replace(/[()]/g, "").replace(/\s+/g, " ").trim());
  variants.add(raw.replace(/-/g, " ").replace(/[()]/g, "").replace(/\s+/g, " ").trim());
  variants.add(raw.replace(/\btricep\b/gi, "triceps"));
  variants.add(raw.replace(/\btriceps\b/gi, "tricep"));
  variants.add(raw.replace(/\bbicep\b/gi, "biceps"));
  variants.add(raw.replace(/\bbiceps\b/gi, "bicep"));
  variants.add(raw.replace(/\bchin-up\b/gi, "chin up"));
  variants.add(raw.replace(/\bchin up\b/gi, "chin-up"));
  variants.add(raw.replace(/\bpull-up\b/gi, "pull up"));
  variants.add(raw.replace(/\bpull up\b/gi, "pull-up"));
  variants.add(raw.replace(/\bt-bar\b/gi, "t bar"));
  variants.add(raw.replace(/\bt bar\b/gi, "t-bar"));
  variants.add(raw.replace(/\blunge\b/gi, "lunges"));
  variants.add(raw.replace(/\blunges\b/gi, "lunge"));
  variants.add(raw.replace(/\bdip\b/gi, "dips"));
  variants.add(raw.replace(/\bdips\b/gi, "dip"));

  for (const variant of variants) {
    const clean = variant.trim().replace(/\s+/g, " ");
    if (clean) output.add(clean);
  }
}

function dedupeAliases(input: Set<string>): string[] {
  const normalized = new Set<string>();
  const compact = new Set<string>();
  const output: string[] = [];

  for (const alias of input) {
    const n = normalizeGuessText(alias);
    if (!n) continue;
    const c = normalizeGuessCompact(alias);
    if (normalized.has(n) || compact.has(c)) continue;
    normalized.add(n);
    compact.add(c);
    output.push(alias);
  }

  return output.sort((a, b) => a.localeCompare(b));
}

export function isMergedExerciseSlug(slug: string): boolean {
  const entry = MAPPING_BY_OLD_SLUG.get(slug);
  return Boolean(entry?.mergedIntoSlug);
}

export function resolveMergedIntoSlug(slug: string): string | null {
  return MAPPING_BY_OLD_SLUG.get(slug)?.mergedIntoSlug ?? null;
}

export function getExerciseNaming(slug: string, fallbackName: string, baseAliases: string[] = []): ExerciseNaming {
  const entry = MAPPING_BY_OLD_SLUG.get(slug);
  const displayName = entry?.newName ?? fallbackName;
  const canonicalName = entry?.newName ?? fallbackName;
  const mergedInto = entry?.mergedIntoSlug ?? null;

  const aliasSet = new Set<string>();
  addAliasVariants(aliasSet, fallbackName);
  addAliasVariants(aliasSet, displayName);
  addAliasVariants(aliasSet, canonicalName);

  for (const alias of baseAliases) {
    addAliasVariants(aliasSet, alias);
  }

  if (entry) {
    addAliasVariants(aliasSet, entry.oldName);
    addAliasVariants(aliasSet, entry.newName);
  }

  if (!mergedInto) {
    const mergeSources = MERGE_SOURCES_BY_TARGET.get(slug) ?? [];
    for (const source of mergeSources) {
      addAliasVariants(aliasSet, source.oldName);
      addAliasVariants(aliasSet, source.newName);
    }
  }

  return {
    slug,
    canonical_name: canonicalName,
    display_name: displayName,
    aliases: dedupeAliases(aliasSet),
    merged_into_slug: mergedInto,
  };
}

export function listNamingMappings(): readonly MappingEntry[] {
  return MAPPING_ENTRIES;
}

