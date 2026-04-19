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

export type PreferredCoachNotes = {
  title: string;
  coach_take: string;
  make_it_easier: string;
  level_it_up: string;
  build_size: string;
  secondary_key: string;
  secondary_value: string;
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

type CoachProgramOverrideCanonical = {
  whyUse: string;
  easier: string;
  harder: string;
  buildSize: string;
  buildStrengthOrSkill: string;
};

type CoachProgramOverridePreferred = {
  coach_take: string;
  make_it_easier: string;
  level_it_up: string;
  build_size: string;
  build_strength?: string;
  build_skill?: string;
  build_control?: string;
  build_resilience?: string;
  chase_pump?: string;
  build_power?: string;
};

type CoachProgramOverride = CoachProgramOverrideCanonical | CoachProgramOverridePreferred;

const COACH_PROGRAM_OVERRIDES: Record<string, CoachProgramOverride> = {
  "bench-press": {
    whyUse: "One of the cleanest ways to build pressing strength and track progress over time.",
    easier: "Dumbbell Bench Press",
    harder: "Paused Bench Press",
    buildSize: "4 x 6-10, rest 2:00-2:30",
    buildStrengthOrSkill: "5 x 3-5, rest 2:30-3:30",
  },
  squat: {
    whyUse: "The king of lower-body lifts for strength, size, and total output.",
    easier: "Goblet Squat",
    harder: "Pause Squat",
    buildSize: "4 x 6-10, rest 2:00-2:30",
    buildStrengthOrSkill: "5 x 3-5, rest 2:30-3:30",
  },
  "barbell-deadlift": {
    whyUse: "Pure force production. Few lifts build raw strength like a heavy deadlift.",
    easier: "Romanian Deadlift",
    harder: "Paused Deadlift",
    buildSize: "4 x 5-8, rest 2:30-3:00",
    buildStrengthOrSkill: "5 x 2-5, rest 3:00-4:00",
  },
  "pull-up": {
    whyUse: "Bodyweight strength benchmark that builds back, arms, and respect.",
    easier: "Band-Assisted Pull-Up",
    harder: "Weighted Pull-Up",
    buildSize: "4 x 6-10, rest 2:00-2:30",
    buildStrengthOrSkill: "5 x 3-5, rest 2:30-3:30",
  },
  "chin-up": {
    whyUse: "Elite vertical pull with extra biceps involvement and strong carryover.",
    easier: "Band-Assisted Chin Up",
    harder: "Weighted Chin Up",
    buildSize: "4 x 6-10, rest 2:00-2:30",
    buildStrengthOrSkill: "5 x 3-5, rest 2:30-3:30",
  },
  "military-press": {
    whyUse: "Strict overhead pressing that exposes weaknesses and builds real shoulder strength.",
    easier: "Seated Dumbbell Press",
    harder: "Paused Military Press",
    buildSize: "4 x 6-10, rest 2:00-2:30",
    buildStrengthOrSkill: "5 x 3-5, rest 2:30-3:30",
  },
  "dumbbell-bench-press": {
    whyUse: "Great chest press with more freedom of motion and joint-friendly mechanics.",
    easier: "Machine Chest Press",
    harder: "Paused Dumbbell Bench Press",
    buildSize: "4 x 8-12, rest 90-150s",
    buildStrengthOrSkill: "4 x 5-8, rest 2:00-3:00",
  },
  "incline-dumbbell-press": {
    whyUse: "Top-tier upper chest builder with solid shoulder comfort.",
    easier: "Machine Incline Press",
    harder: "Tempo Incline Dumbbell Press",
    buildSize: "4 x 8-12, rest 90-150s",
    buildStrengthOrSkill: "4 x 5-8, rest 2:00-3:00",
  },
  "machine-chest-press": {
    whyUse: "Stable chest pressing that lets you push close to failure safely.",
    easier: "Light Machine Chest Press",
    harder: "Single-Arm Machine Press",
    buildSize: "3-5 x 8-12, rest 60-120s",
    buildStrengthOrSkill: "4 x 5-8, rest 2:00-2:30",
  },
  "lat-pulldown": {
    whyUse: "Reliable vertical pull for building lats when bodyweight pulls are limited.",
    easier: "Assisted Lat Pulldown",
    harder: "Slow Eccentric Lat Pulldown",
    buildSize: "3-5 x 8-12, rest 60-120s",
    buildStrengthOrSkill: "4 x 5-8, rest 2:00-2:30",
  },
  "seated-cable-row": {
    whyUse: "Consistent horizontal pull with great tension and easy progression.",
    easier: "Chest-Supported Row Machine",
    harder: "Paused Seated Cable Row",
    buildSize: "3-5 x 8-12, rest 60-120s",
    buildStrengthOrSkill: "4 x 5-8, rest 2:00-2:30",
  },
  "barbell-bent-over-row": {
    whyUse: "Heavy row that builds back thickness, grip, and discipline.",
    easier: "Chest-Supported Row",
    harder: "Paused Bent Over Row",
    buildSize: "4 x 6-10, rest 90-150s",
    buildStrengthOrSkill: "5 x 4-6, rest 2:30-3:00",
  },
  "dumbbell-row": {
    whyUse: "Excellent unilateral row for lats, upper back, and side-to-side balance.",
    easier: "Machine Row",
    harder: "Paused Dumbbell Row",
    buildSize: "4 x 8-12, rest 60-120s",
    buildStrengthOrSkill: "4 x 6-8, rest 2:00-2:30",
  },
  "t-bar-row": {
    whyUse: "Big overload row for back mass with strong stability.",
    easier: "Chest-Supported T-Bar Row",
    harder: "Paused T-Bar Row",
    buildSize: "4 x 8-12, rest 90-150s",
    buildStrengthOrSkill: "4 x 5-8, rest 2:00-3:00",
  },
  "leg-press": {
    whyUse: "High-output leg builder that lets you train hard without balancing a barbell.",
    easier: "Light Leg Press",
    harder: "Tempo Leg Press",
    buildSize: "4 x 10-15, rest 90-150s",
    buildStrengthOrSkill: "4 x 6-10, rest 2:00-3:00",
  },
  "bulgarian-split-squat": {
    whyUse: "Brutal unilateral leg builder with huge glute and quad payoff.",
    easier: "Bodyweight Split Squat",
    harder: "Tempo Bulgarian Split Squat",
    buildSize: "3-4 x 8-12 each side, rest 60-120s",
    buildStrengthOrSkill: "4 x 6-8 each side, rest 2:00",
  },
  "romanian-deadlift": {
    whyUse: "Elite hinge for hamstrings, glutes, and posterior chain control.",
    easier: "Dumbbell Romanian Deadlift",
    harder: "Paused Romanian Deadlift",
    buildSize: "4 x 8-12, rest 90-150s",
    buildStrengthOrSkill: "4 x 5-8, rest 2:00-3:00",
  },
  lunges: {
    whyUse: "Simple, effective leg work that builds capacity and athletic control.",
    easier: "Bodyweight Reverse Lunge",
    harder: "Walking Lunges",
    buildSize: "3-4 x 10-14 each side, rest 60-120s",
    buildStrengthOrSkill: "4 x 6-8 each side, rest 2:00",
  },
  "bicep-curl": {
    whyUse: "Classic arm builder that still works when progressed with intent.",
    easier: "Cable Curl",
    harder: "Slow Eccentric Curl",
    buildSize: "3-5 x 10-15, rest 45-75s",
    buildStrengthOrSkill: "Chase pump: 2 x 20 burn reps",
  },
  "hammer-curl": {
    whyUse: "Strong biceps and forearm combo with great carryover to pulling strength.",
    easier: "Rope Hammer Curl",
    harder: "Cross-Body Hammer Curl",
    buildSize: "3-5 x 10-15, rest 45-75s",
    buildStrengthOrSkill: "Chase pump: 2 x 20 burn reps",
  },
  "skull-crusher": {
    whyUse: "Heavy triceps builder when you want more than cables can offer.",
    easier: "Cable Pushdown",
    harder: "Paused Skull Crusher",
    buildSize: "3-5 x 8-12, rest 60-120s",
    buildStrengthOrSkill: "Chase pump: 2 x 15 burn reps",
  },
  "tricep-pushdown": {
    whyUse: "Low-fatigue triceps volume that fits almost any upper day.",
    easier: "Band Pushdown",
    harder: "Slow Eccentric Pushdown",
    buildSize: "3-5 x 10-15, rest 45-75s",
    buildStrengthOrSkill: "Chase pump: 2 x 20 burn reps",
  },
  "cable-lateral-raise": {
    whyUse: "Elite side-delt tension with minimal fatigue and maximum control.",
    easier: "Dumbbell Lateral Raise",
    harder: "Lean-Away Cable Raise",
    buildSize: "3-5 x 12-20, rest 45-75s",
    buildStrengthOrSkill: "Chase pump: 2 x 25 burn reps",
  },
  "face-pull": {
    whyUse: "Rear delts, upper back, and shoulder hygiene in one move.",
    easier: "Light Rope Face Pull",
    harder: "Paused Face Pull",
    buildSize: "3-5 x 12-20, rest 45-75s",
    buildStrengthOrSkill: "Build control: 2 x 15 perfect reps",
  },
  "push-up": {
    whyUse: "Timeless bodyweight press that scales from beginner to elite.",
    easier: "Incline Push-Up",
    harder: "Weighted Push-Up",
    buildSize: "4 x 10-20, rest 60-120s",
    buildStrengthOrSkill: "5 x 5-8, rest 2:00",
  },
  "ab-wheel-rollout": {
    whyUse: "One of the hardest anti-extension core drills when done right.",
    easier: "Kneeling Rollout",
    harder: "Standing Rollout",
    buildSize: "4 x 5-10, rest 60-120s",
    buildStrengthOrSkill: "Build skill: 5 x 3 quality reps",
  },
  "arnold-press": {
    whyUse: "Shoulder press with extra range and front-delt involvement for balanced growth.",
    easier: "Seated Dumbbell Press",
    harder: "Slow Eccentric Arnold Press",
    buildSize: "4 x 8-12, rest 60-120s",
    buildStrengthOrSkill: "4 x 5-8, rest 2:00-2:30",
  },
  "alternate-lateral-pulldown": {
    whyUse: "Single-side pulldown that helps clean up imbalances and improve lat focus.",
    easier: "Machine Lat Pulldown",
    harder: "Paused Alternate Lateral Pulldown",
    buildSize: "3-5 x 8-12 each side, rest 60-120s",
    buildStrengthOrSkill: "4 x 5-8 each side, rest 2:00",
  },
  "back-extension": {
    whyUse: "Simple posterior-chain work for lower back endurance and glute support.",
    easier: "Bodyweight Back Extension",
    harder: "Weighted Back Extension",
    buildSize: "3-5 x 12-20, rest 45-90s",
    buildStrengthOrSkill: "Build resilience: 3 x 15 strict reps",
  },
  "barbell-alternate-biceps-curl": {
    whyUse: "Old-school arm work that adds load while training each side independently.",
    easier: "Alternating Dumbbell Curl",
    harder: "Slow Eccentric Alternate Curl",
    buildSize: "3-5 x 10-15, rest 45-75s",
    buildStrengthOrSkill: "Chase pump: 2 x 20 burn reps",
  },
  "barbell-bench-front-squat": {
    whyUse: "Front-loaded squat pattern that hammers quads and core posture.",
    easier: "Goblet Squat",
    harder: "Paused Front Squat",
    buildSize: "4 x 6-10, rest 2:00-2:30",
    buildStrengthOrSkill: "5 x 3-5, rest 2:30-3:30",
  },
  "barbell-clean-and-press": {
    whyUse: "Power plus pressing in one move. Athletic, demanding, rewarding.",
    easier: "Dumbbell Clean and Press",
    harder: "Strict Clean and Press",
    buildSize: "Build power: 5 x 3 reps, rest 2:00-3:00",
    buildStrengthOrSkill: "Build skill: 6 x 2 crisp reps",
  },
  "barbell-clean-grip-front-squat": {
    whyUse: "Strong front squat variation that challenges wrist mobility and trunk strength.",
    easier: "Cross-Arm Front Squat",
    harder: "Paused Clean-Grip Front Squat",
    buildSize: "4 x 6-10, rest 2:00-2:30",
    buildStrengthOrSkill: "5 x 3-5, rest 2:30-3:30",
  },
  "barbell-close-grip-bench-press": {
    whyUse: "Heavy press that shifts more work to triceps without losing overload.",
    easier: "Close-Grip Machine Press",
    harder: "Paused Close-Grip Bench Press",
    buildSize: "4 x 6-10, rest 2:00-2:30",
    buildStrengthOrSkill: "5 x 3-5, rest 2:30-3:30",
  },
  "barbell-decline-wide-grip-press": {
    whyUse: "Stable chest press that can feel strong and shoulder-friendly for some lifters.",
    easier: "Decline Machine Press",
    harder: "Paused Decline Press",
    buildSize: "4 x 8-12, rest 90-150s",
    buildStrengthOrSkill: "4 x 5-8, rest 2:00-3:00",
  },
  "barbell-front-raise": {
    whyUse: "Direct front-delt loading when pressing volume alone is not enough.",
    easier: "Plate Front Raise",
    harder: "Slow Eccentric Front Raise",
    buildSize: "3-4 x 12-15, rest 45-75s",
    buildStrengthOrSkill: "Chase pump: 2 x 20 burn reps",
  },
  "barbell-glute-bridge-two-legs-on-bench-male": {
    whyUse: "Glute-focused bridge with strong lockout tension and low back-friendly loading.",
    easier: "Bodyweight Glute Bridge",
    harder: "Paused Barbell Glute Bridge",
    buildSize: "4 x 8-15, rest 60-120s",
    buildStrengthOrSkill: "4 x 6-8, rest 2:00",
  },
  "barbell-good-morning": {
    whyUse: "Advanced hinge that builds posterior chain strength and torso control.",
    easier: "Romanian Deadlift",
    harder: "Paused Good Morning",
    buildSize: "3-4 x 8-12, rest 90-150s",
    buildStrengthOrSkill: "4 x 5-8, rest 2:00-3:00",
  },
  "barbell-incline-reverse-grip-press": {
    whyUse: "Unique incline press that can bias upper chest and triceps.",
    easier: "Incline Dumbbell Press",
    harder: "Paused Reverse-Grip Incline Press",
    buildSize: "4 x 8-12, rest 90-150s",
    buildStrengthOrSkill: "4 x 5-8, rest 2:00-3:00",
  },
  "barbell-incline-shoulder-raise": {
    whyUse: "Front-delt isolation with a stable incline setup and clean line of pull.",
    easier: "Dumbbell Front Raise",
    harder: "Slow Eccentric Incline Raise",
    buildSize: "3-4 x 12-15, rest 45-75s",
    buildStrengthOrSkill: "Chase pump: 2 x 20 burn reps",
  },
  "barbell-jm-bench-press": {
    whyUse: "Hybrid press-extension move built for serious triceps strength.",
    easier: "Close-Grip Bench Press",
    harder: "Paused JM Press",
    buildSize: "4 x 6-10, rest 90-150s",
    buildStrengthOrSkill: "5 x 3-5, rest 2:30-3:30",
  },
  "barbell-jump-squat": {
    whyUse: "Explosive lower-body training for speed, power, and intent.",
    easier: "Bodyweight Jump Squat",
    harder: "Trap Bar Jump Squat",
    buildSize: "Build power: 6 x 3 fast reps, rest 90-150s",
    buildStrengthOrSkill: "Build skill: 5 x 2 crisp reps",
  },
  "barbell-lying-close-grip-triceps-extension": {
    whyUse: "Direct triceps work with a stable bar path and strong overload potential.",
    easier: "EZ-Bar Skull Crusher",
    harder: "Paused Triceps Extension",
    buildSize: "3-5 x 8-12, rest 60-120s",
    buildStrengthOrSkill: "Chase pump: 2 x 15 burn reps",
  },
  "barbell-lying-extension": {
    whyUse: "Classic elbow-extension move for adding triceps size.",
    easier: "Cable Overhead Extension",
    harder: "Slow Eccentric Lying Extension",
    buildSize: "3-5 x 10-12, rest 60-120s",
    buildStrengthOrSkill: "Chase pump: 2 x 15 burn reps",
  },
  "barbell-narrow-stance-squat": {
    whyUse: "Squat variation that often increases quad demand and control.",
    easier: "Goblet Narrow Squat",
    harder: "Paused Narrow Squat",
    buildSize: "4 x 6-10, rest 2:00-2:30",
    buildStrengthOrSkill: "5 x 3-5, rest 2:30-3:30",
  },
  "barbell-one-arm-side-deadlift": {
    whyUse: "Offset hinge that challenges grip, obliques, and total-body stability.",
    easier: "Single Dumbbell Deadlift",
    harder: "Heavier Offset Deadlift",
    buildSize: "4 x 6-10 each side, rest 90-150s",
    buildStrengthOrSkill: "5 x 3-5 each side, rest 2:00-3:00",
  },
  "barbell-rear-delt-row": {
    whyUse: "Rear-delt dominant row that adds upper-back detail and posture support.",
    easier: "Cable Rear Delt Row",
    harder: "Paused Rear Delt Row",
    buildSize: "3-5 x 10-15, rest 45-90s",
    buildStrengthOrSkill: "Build control: 2 x 15 perfect reps",
  },
  "barbell-reverse-wrist-curl": {
    whyUse: "Forearm extensor work that balances heavy gripping and curl volume.",
    easier: "Dumbbell Reverse Wrist Curl",
    harder: "Slow Eccentric Wrist Curl",
    buildSize: "3-4 x 15-20, rest 30-60s",
    buildStrengthOrSkill: "Build resilience: 2 x 25 reps",
  },
  "barbell-rollerout-from-bench": {
    whyUse: "Loaded rollout variation that lights up abs and anti-extension strength.",
    easier: "Kneeling Barbell Rollout",
    harder: "Longer Range Rollerout",
    buildSize: "Build control: 4 x 6-10, rest 60-120s",
    buildStrengthOrSkill: "Build skill: 5 x 3 quality reps",
  },
  "barbell-seated-behind-head-military-press": {
    whyUse: "Advanced shoulder press demanding mobility, control, and caution.",
    easier: "Standard Seated Press",
    harder: "Paused Behind Head Press",
    buildSize: "3-4 x 8-10, rest 90-150s",
    buildStrengthOrSkill: "Build control: 4 x 5 clean reps",
  },
  "barbell-seated-calf-raise": {
    whyUse: "Great soleus-focused calf work with easy progression.",
    easier: "Bodyweight Seated Calf Raise",
    harder: "Paused Seated Calf Raise",
    buildSize: "4 x 12-20, rest 45-75s",
    buildStrengthOrSkill: "Chase pump: 2 x 25 burn reps",
  },
  "barbell-wide-grip-upright-row": {
    whyUse: "Upper trap and delt builder when performed with clean mechanics.",
    easier: "Dumbbell Upright Row",
    harder: "Cable Upright Row",
    buildSize: "3-4 x 10-15, rest 45-90s",
    buildStrengthOrSkill: "Build control: 2 x 15 smooth reps",
  },
  "bench-press-narrow-grip": {
    whyUse: "Pressing variation that adds triceps demand while keeping heavy loading potential.",
    easier: "Machine Close-Grip Press",
    harder: "Paused Narrow Grip Bench Press",
    buildSize: "4 x 6-10, rest 2:00-2:30",
    buildStrengthOrSkill: "5 x 3-5, rest 2:30-3:30",
  },
  "bodyweight-biceps-curl": {
    whyUse: "Creative bodyweight curl variation that challenges arms through leverage.",
    easier: "Higher-Angle Bodyweight Curl",
    harder: "Feet-Elevated Bodyweight Curl",
    buildSize: "3-5 x 8-15, rest 60-120s",
    buildStrengthOrSkill: "4 x 5-8, rest 2:00",
  },
  "cable-alternate-shoulder-press": {
    whyUse: "Shoulder press with constant tension and clean unilateral control.",
    easier: "Machine Shoulder Press",
    harder: "Slow Eccentric Cable Shoulder Press",
    buildSize: "3-5 x 8-12 each side, rest 60-120s",
    buildStrengthOrSkill: "4 x 5-8 each side, rest 2:00",
  },
  "cable-alternate-triceps-extension": {
    whyUse: "Single-arm triceps work that improves feel, control, and symmetry.",
    easier: "Light Cable Extension",
    harder: "Overhead Cable Extension",
    buildSize: "3-5 x 10-15 each side, rest 45-75s",
    buildStrengthOrSkill: "Chase pump: 2 x 20 burn reps",
  },
  "cable-bench-press": {
    whyUse: "Pressing pattern with constant tension and smooth resistance curve.",
    easier: "Machine Chest Press",
    harder: "Paused Cable Bench Press",
    buildSize: "4 x 8-12, rest 60-120s",
    buildStrengthOrSkill: "4 x 5-8, rest 2:00-2:30",
  },
  "cable-cross-over-reverse-fly": {
    whyUse: "Rear-delt isolation with cables for clean tension and shoulder-friendly mechanics.",
    easier: "Reverse Pec Deck",
    harder: "Paused Reverse Fly",
    buildSize: "3-5 x 12-20, rest 45-75s",
    buildStrengthOrSkill: "Build control: 2 x 15 perfect reps",
  },
  "cable-cross-over-variation": {
    whyUse: "Chest-focused cable press/fly hybrid for tension and squeeze.",
    easier: "Machine Fly",
    harder: "Slow Eccentric Cross-over Variation",
    buildSize: "3-5 x 10-15, rest 45-75s",
    buildStrengthOrSkill: "Chase pump: 2 x 20 burn reps",
  },
  "cable-crossover": {
    whyUse: "Classic chest finisher that keeps tension where it matters most.",
    easier: "Machine Pec Deck",
    harder: "High-to-Low Cable Crossover",
    buildSize: "3-5 x 12-15, rest 45-75s",
    buildStrengthOrSkill: "Chase pump: 2 x 20 burn reps",
  },
  "cable-crunch": {
    whyUse: "Loaded ab work that is easy to progress and easy to feel.",
    easier: "Bodyweight Crunch",
    harder: "Paused Cable Crunch",
    buildSize: "4 x 10-20, rest 45-75s",
    buildStrengthOrSkill: "Build control: 3 x 12 strict reps",
  },
  "cable-deadlift": {
    whyUse: "Hinge pattern with smooth resistance and beginner-friendly loading.",
    easier: "Cable Pull-Through",
    harder: "Paused Cable Deadlift",
    buildSize: "4 x 8-12, rest 60-120s",
    buildStrengthOrSkill: "4 x 5-8, rest 2:00-2:30",
  },
  "cable-decline-fly": {
    whyUse: "Lower-chest biased cable fly with strong constant tension.",
    easier: "Machine Fly",
    harder: "Slow Eccentric Decline Fly",
    buildSize: "3-5 x 12-15, rest 45-75s",
    buildStrengthOrSkill: "Chase pump: 2 x 20 burn reps",
  },
  "cable-front-raise": {
    whyUse: "Controlled front-delt isolation with consistent cable tension.",
    easier: "Plate Front Raise",
    harder: "Single-Arm Cable Front Raise",
    buildSize: "3-4 x 12-15, rest 45-75s",
    buildStrengthOrSkill: "Chase pump: 2 x 20 burn reps",
  },
  "cable-hammer-curl-with-rope": {
    whyUse: "Arm builder that blends biceps, brachialis, and forearm work.",
    easier: "Dumbbell Hammer Curl",
    harder: "Cross-Body Rope Curl",
    buildSize: "3-5 x 10-15, rest 45-75s",
    buildStrengthOrSkill: "Chase pump: 2 x 20 burn reps",
  },
  "cable-incline-pushdown": {
    whyUse: "Lat-focused cable pull variation with a unique angle and stretch.",
    easier: "Straight-Arm Pulldown",
    harder: "Slow Eccentric Incline Pushdown",
    buildSize: "3-5 x 10-15, rest 45-75s",
    buildStrengthOrSkill: "Build control: 2 x 15 smooth reps",
  },
  "cable-kneeling-crunch": {
    whyUse: "Stable kneeling setup that makes weighted ab work easy to standardize.",
    easier: "Bodyweight Crunch",
    harder: "Paused Kneeling Crunch",
    buildSize: "4 x 10-20, rest 45-75s",
    buildStrengthOrSkill: "Build control: 3 x 12 strict reps",
  },
  "cable-rear-delt-row-stirrups": {
    whyUse: "Rear-delt row that combines scap control with upper-back detail.",
    easier: "Reverse Pec Deck",
    harder: "Paused Rear Delt Row",
    buildSize: "3-5 x 12-15, rest 45-75s",
    buildStrengthOrSkill: "Build control: 2 x 15 perfect reps",
  },
  "cable-rear-delt-row-with-rope": {
    whyUse: "Rope row variation that hits rear delts with smooth cable tension.",
    easier: "Face Pull",
    harder: "Paused Rope Rear Delt Row",
    buildSize: "3-5 x 12-15, rest 45-75s",
    buildStrengthOrSkill: "Build control: 2 x 15 perfect reps",
  },
  "cable-reverse-grip-triceps-pushdown-sz-bar-with-arm-blaster": {
    whyUse: "Triceps pushdown variation that often feels cleaner on elbows and wrists.",
    easier: "Standard Rope Pushdown",
    harder: "Single-Arm Reverse Pushdown",
    buildSize: "3-5 x 10-15, rest 45-75s",
    buildStrengthOrSkill: "Chase pump: 2 x 20 burn reps",
  },
  "cable-standing-pulldown-with-rope": {
    whyUse: "Lat-focused pull that teaches shoulder extension and control.",
    easier: "Straight-Arm Pulldown",
    harder: "Slow Eccentric Standing Pulldown",
    buildSize: "3-5 x 10-15, rest 45-75s",
    buildStrengthOrSkill: "Build control: 2 x 15 clean reps",
  },
  "cable-woodchopper": {
    whyUse: "Dynamic trunk rotation work for athletic core strength and control.",
    easier: "Half-Kneeling Woodchopper",
    harder: "Heavier Cable Woodchopper",
    buildSize: "3-4 x 10-15 each side, rest 45-75s",
    buildStrengthOrSkill: "Build control: 3 x 10 crisp reps",
  },
  "calf-press-using-leg-press-machine": {
    whyUse: "Easy-to-load calf work with big stretch and safe setup.",
    easier: "Bodyweight Calf Raise",
    harder: "Paused Calf Press",
    buildSize: "4 x 12-20, rest 45-75s",
    buildStrengthOrSkill: "Chase pump: 2 x 25 burn reps",
  },
  "calf-raise-using-hack-squat-machine": {
    whyUse: "Stable calf training that lets you push hard through full range.",
    easier: "Standing Bodyweight Calf Raise",
    harder: "Paused Hack Calf Raise",
    buildSize: "4 x 12-20, rest 45-75s",
    buildStrengthOrSkill: "Chase pump: 2 x 25 burn reps",
  },
  "chest-dips": {
    whyUse: "Deep pressing pattern that can rapidly grow chest and triceps.",
    easier: "Assisted Dips",
    harder: "Weighted Dips",
    buildSize: "4 x 6-10, rest 90-150s",
    buildStrengthOrSkill: "5 x 3-5, rest 2:30-3:30",
  },
  "chest-fly": {
    whyUse: "Direct chest tension with minimal need for heavy loading.",
    easier: "Machine Fly",
    harder: "Slow Eccentric Chest Fly",
    buildSize: "3-5 x 10-15, rest 45-75s",
    buildStrengthOrSkill: "Chase pump: 2 x 20 burn reps",
  },
  "close-grip-bench-press": {
    whyUse: "Heavy triceps-focused press with excellent carryover to bigger bench numbers.",
    easier: "Machine Close-Grip Press",
    harder: "Paused Close-Grip Bench Press",
    buildSize: "4 x 6-10, rest 2:00-2:30",
    buildStrengthOrSkill: "5 x 3-5, rest 2:30-3:30",
  },
  "db-underhand-bench-press": {
    whyUse: "Unique dumbbell press variation that can improve chest feel and arm drive.",
    easier: "Flat Dumbbell Bench Press",
    harder: "Paused Underhand DB Press",
    buildSize: "4 x 8-12, rest 90-150s",
    buildStrengthOrSkill: "4 x 5-8, rest 2:00-3:00",
  },
  "decline-bench-leg-raise": {
    whyUse: "Simple lower-ab focused movement that is easy to scale and feel.",
    easier: "Flat Bench Knee Raise",
    harder: "Slow Eccentric Leg Raise",
    buildSize: "3-5 x 12-20, rest 45-75s",
    buildStrengthOrSkill: "Build control: 3 x 12 strict reps",
  },
  "decline-bench-press": {
    whyUse: "Strong pressing variation that often feels stable and powerful.",
    easier: "Decline Dumbbell Press",
    harder: "Paused Decline Bench Press",
    buildSize: "4 x 6-10, rest 2:00-2:30",
    buildStrengthOrSkill: "5 x 3-5, rest 2:30-3:30",
  },
  "double-leg-abdominal-press": {
    whyUse: "Direct trunk flexion work for controlled ab volume and tension.",
    easier: "Bent-Knee Ab Press",
    harder: "Slow Eccentric Ab Press",
    buildSize: "3-5 x 12-20, rest 45-75s",
    buildStrengthOrSkill: "Build control: 3 x 12 strict reps",
  },
  "dumbbell-bench-seated-press": {
    whyUse: "Stable seated shoulder press that lets you load delts with confidence.",
    easier: "Machine Shoulder Press",
    harder: "Paused Seated Dumbbell Press",
    buildSize: "4 x 8-12, rest 60-120s",
    buildStrengthOrSkill: "4 x 5-8, rest 2:00-2:30",
  },
  "dumbbell-bench-squat": {
    whyUse: "Accessible squat pattern that builds legs without needing a barbell rack.",
    easier: "Goblet Squat",
    harder: "Tempo Dumbbell Bench Squat",
    buildSize: "4 x 8-12, rest 60-120s",
    buildStrengthOrSkill: "4 x 6-8, rest 2:00-2:30",
  },
  "dumbbell-bicep-curl-lunge-with-bowling-motion": {
    whyUse: "Hybrid move combining arm work, balance, and lower-body control.",
    easier: "Static Curl Lunge",
    harder: "Walking Curl Lunge",
    buildSize: "3-4 x 10 each side, rest 60-120s",
    buildStrengthOrSkill: "Build control: 3 x 8 smooth reps",
  },
  "dumbbell-bicep-curl-to-press": {
    whyUse: "Full-body flow move blending curls, pressing, and coordination.",
    easier: "Seated Curl to Press",
    harder: "Alternating Curl to Press",
    buildSize: "3-5 x 8-12, rest 60-120s",
    buildStrengthOrSkill: "Build control: 3 x 8 clean reps",
  },
  "elbows-tucked-db-bench-press": {
    whyUse: "Chest press variation that increases triceps drive and shoulder comfort.",
    easier: "Neutral Grip Dumbbell Press",
    harder: "Paused Elbows Tucked Press",
    buildSize: "4 x 8-12, rest 90-150s",
    buildStrengthOrSkill: "4 x 5-8, rest 2:00-3:00",
  },
  "front-raise": {
    whyUse: "Useful front-delt isolation when overhead pressing volume is low.",
    easier: "Plate Front Raise",
    harder: "Slow Eccentric Front Raise",
    buildSize: "3-4 x 12-15, rest 45-75s",
    buildStrengthOrSkill: "Chase pump: 2 x 20 burn reps",
  },
  "hanging-leg-raise": {
    whyUse: "High-value abs movement that also trains grip and trunk control.",
    easier: "Captain Chair Knee Raise",
    harder: "Toes-to-Bar",
    buildSize: "4 x 8-15, rest 60-120s",
    buildStrengthOrSkill: "Build skill: 5 x 5 strict reps",
  },
  "kettlebell-one-legged-deadlift": {
    whyUse: "Single-leg hinge that builds balance, hamstrings, and hip control.",
    easier: "Bodyweight Single-Leg Hinge",
    harder: "Double Kettlebell Single-Leg Deadlift",
    buildSize: "3-4 x 8-12 each side, rest 60-120s",
    buildStrengthOrSkill: "Build control: 4 x 6 clean reps",
  },
  "leg-curl": {
    whyUse: "Direct hamstring volume with low fatigue and easy progression.",
    easier: "Swiss Ball Leg Curl",
    harder: "Slow Eccentric Leg Curl",
    buildSize: "3-5 x 10-15, rest 45-75s",
    buildStrengthOrSkill: "Chase pump: 2 x 20 burn reps",
  },
  "leg-extension": {
    coach_take: "Pure quad isolation that is easy to standardize and progress.",
    make_it_easier: "Bodyweight Sissy Squat Hold",
    level_it_up: "Paused Leg Extension",
    build_size: "3-5 x 10-15, rest 45-75s",
    chase_pump: "2 x 20 burn reps",
  },
  "overhead-tricep-extension": {
    whyUse: "Great long-head triceps builder thanks to the overhead stretch position.",
    easier: "Single Dumbbell Extension",
    harder: "Cable Overhead Extension",
    buildSize: "3-5 x 10-15, rest 45-75s",
    buildStrengthOrSkill: "Chase pump: 2 x 20 burn reps",
  },
  plank: {
    whyUse: "Simple on paper, brutally effective when full-body tension is real.",
    easier: "Knee Plank",
    harder: "Weighted Plank",
    buildSize: "Build control: 3 x 30-45s",
    buildStrengthOrSkill: "Build resilience: 3 x 60s+",
  },
  "reverse-grip-bench-press": {
    whyUse: "Unique press that can emphasize upper chest and triceps for some lifters.",
    easier: "Neutral Grip Dumbbell Press",
    harder: "Paused Reverse Grip Bench Press",
    buildSize: "4 x 6-10, rest 2:00-2:30",
    buildStrengthOrSkill: "5 x 3-5, rest 2:30-3:30",
  },
  "russian-twist": {
    whyUse: "Rotational core work best used for controlled volume, not speed chaos.",
    easier: "Bodyweight Russian Twist",
    harder: "Feet-Elevated Russian Twist",
    buildSize: "3-4 x 16-30 total reps, rest 30-60s",
    buildStrengthOrSkill: "Build control: 3 x 12 crisp reps",
  },
  "seated-bench-press": {
    whyUse: "Stable machine press that rewards hard effort and clean progression.",
    easier: "Light Seated Press",
    harder: "Paused Seated Bench Press",
    buildSize: "4 x 8-12, rest 60-120s",
    buildStrengthOrSkill: "4 x 5-8, rest 2:00-2:30",
  },
  "single-arm-plank-to-row": {
    whyUse: "Anti-rotation core challenge that mixes stability with pulling control.",
    easier: "Bird Dog Row",
    harder: "Renegade Row",
    buildSize: "3-4 x 8-12 each side, rest 60-120s",
    buildStrengthOrSkill: "Build control: 3 x 6 strict reps",
  },
  "standing-calf-raise": {
    whyUse: "Classic calf builder for gastroc size and ankle strength.",
    easier: "Bodyweight Calf Raise",
    harder: "Paused Standing Calf Raise",
    buildSize: "4 x 12-20, rest 45-75s",
    buildStrengthOrSkill: "Chase pump: 2 x 25 burn reps",
  },
  "sumo-deadlift": {
    whyUse: "Wide-stance pull that can favor hips, quads, and shorter bar path leverage.",
    easier: "Kettlebell Sumo Deadlift",
    harder: "Paused Sumo Deadlift",
    buildSize: "4 x 5-8, rest 2:30-3:00",
    buildStrengthOrSkill: "5 x 2-5, rest 3:00-4:00",
  },
  "upright-row": {
    whyUse: "Trap and delt builder best performed smooth and controlled.",
    easier: "Dumbbell Upright Row",
    harder: "Cable Upright Row",
    buildSize: "3-4 x 10-15, rest 45-75s",
    buildStrengthOrSkill: "Build control: 2 x 15 clean reps",
  },
};

function toCanonicalCoachProgramOverride(override: CoachProgramOverride): CoachProgramOverrideCanonical {
  if ("whyUse" in override) return override;

  const secondary =
    override.build_strength ??
    override.build_skill ??
    override.build_control ??
    override.build_resilience ??
    override.chase_pump ??
    override.build_power;

  return {
    whyUse: override.coach_take,
    easier: override.make_it_easier,
    harder: override.level_it_up,
    buildSize: override.build_size,
    buildStrengthOrSkill: secondary ?? "",
  };
}

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

  let result: PostGameInsights = { whyUse, cues, mistakes, variants, dose };

  const override = OVERRIDES[exercise.slug];
  if (override) {
    result = override;
  }

  const coachProgramOverride = COACH_PROGRAM_OVERRIDES[exercise.slug];
  if (coachProgramOverride) {
    const canonical = toCanonicalCoachProgramOverride(coachProgramOverride);
    result = {
      ...result,
      whyUse: canonical.whyUse,
      variants: {
        easier: canonical.easier,
        harder: canonical.harder,
      },
      dose: {
        hypertrophy: canonical.buildSize,
        strengthOrSkill: canonical.buildStrengthOrSkill,
      },
    };
  }

  return result;
}

function toSnakeCase(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\w\s/+-]/g, "")
    .replace(/[\/+\-]/g, " ")
    .replace(/\s+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function parseSecondaryDose(value: string): { key: string; value: string } {
  const raw = value.trim();
  const match = raw.match(/^([^:]+):\s*(.+)$/);
  if (!match) {
    return { key: "build_strength", value: raw };
  }

  const label = match[1].trim().toLowerCase();
  const payload = match[2].trim();
  const explicitMap: Record<string, string> = {
    "build strength": "build_strength",
    "strength/skill": "build_strength",
    "strength skill": "build_strength",
    "build skill": "build_skill",
    "build control": "build_control",
    "build resilience": "build_resilience",
    "chase pump": "chase_pump",
    "build power": "build_power",
  };

  return {
    key: explicitMap[label] ?? toSnakeCase(label),
    value: payload,
  };
}

export function toPreferredCoachNotes(insights: PostGameInsights): PreferredCoachNotes {
  const secondary = parseSecondaryDose(insights.dose.strengthOrSkill);
  return {
    title: "",
    coach_take: insights.whyUse,
    make_it_easier: insights.variants.easier,
    level_it_up: insights.variants.harder,
    build_size: insights.dose.hypertrophy,
    secondary_key: secondary.key || "build_strength",
    secondary_value: secondary.value || insights.dose.strengthOrSkill,
  };
}

function preferredSecondaryFromOverride(
  override: CoachProgramOverridePreferred,
): { key: string; value: string } {
  const candidates: Array<[string, string | undefined]> = [
    ["build_strength", override.build_strength],
    ["build_skill", override.build_skill],
    ["build_control", override.build_control],
    ["build_resilience", override.build_resilience],
    ["chase_pump", override.chase_pump],
    ["build_power", override.build_power],
  ];
  const found = candidates.find(([, value]) => Boolean(value?.trim()));
  if (!found) return { key: "build_strength", value: "" };
  return { key: found[0], value: found[1]!.trim() };
}

export function buildPreferredCoachNotesForSlug(slug: string, insights: PostGameInsights): PreferredCoachNotes {
  const override = COACH_PROGRAM_OVERRIDES[slug];
  if (override && "coach_take" in override) {
    const secondary = preferredSecondaryFromOverride(override);
    return {
      title: slug,
      coach_take: override.coach_take,
      make_it_easier: override.make_it_easier,
      level_it_up: override.level_it_up,
      build_size: override.build_size,
      secondary_key: secondary.key,
      secondary_value: secondary.value,
    };
  }

  const secondary = parseSecondaryDose(insights.dose.strengthOrSkill);
  return {
    title: slug,
    coach_take: insights.whyUse,
    make_it_easier: insights.variants.easier,
    level_it_up: insights.variants.harder,
    build_size: insights.dose.hypertrophy,
    secondary_key: secondary.key || "build_strength",
    secondary_value: secondary.value || insights.dose.strengthOrSkill,
  };
}

