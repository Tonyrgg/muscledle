import type {
  EGO_VALUES,
  EQUIPMENT_VALUES,
  GOAL_VALUES,
  MOVEMENT_VALUES,
  MUSCLE_GROUP_VALUES,
  MUSCLE_VALUES,
  PATTERN_VALUES,
  REPS_VALUES,
} from "@/lib/exercises/schema";

export type Muscle = (typeof MUSCLE_VALUES)[number];
export type Equipment = (typeof EQUIPMENT_VALUES)[number];
export type Movement = (typeof MOVEMENT_VALUES)[number];
export type Pattern = (typeof PATTERN_VALUES)[number];
export type Reps = (typeof REPS_VALUES)[number];
export type Goal = (typeof GOAL_VALUES)[number];
export type Ego = (typeof EGO_VALUES)[number];
export type MuscleGroup = (typeof MUSCLE_GROUP_VALUES)[number];

export type Exercise = {
  id: string;
  slug: string;
  name: string;
  aliases: string[];
  muscle: Muscle[];
  equipment: Equipment[];
  movement: Movement[];
  pattern: Pattern[];
  reps: Reps[];
  goal: Goal[];
  ego: Ego[];
  muscle_group: MuscleGroup;
  is_live: boolean;
  created_at?: string;
  updated_at?: string;
};

export type FeedbackColor = "green" | "yellow" | "red";

export type GuessFeedback = {
  muscle: FeedbackColor;
  equipment: FeedbackColor;
  movement: FeedbackColor;
  pattern: FeedbackColor;
  reps: FeedbackColor;
  goal: FeedbackColor;
  ego: FeedbackColor;
};

export type GuessResult = {
  guess: Exercise;
  feedback: GuessFeedback;
  isCorrect: boolean;
};
