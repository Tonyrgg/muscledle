export type WgerApiPage<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type WgerExercisePayload = {
  id: number;
  uuid?: string | null;
  exercise_base: number | null;
  name?: string | null;
  description?: string | null;
  category?: { id: number; name: string } | null;
  equipment?: Array<{ id: number; name: string }>;
  muscles?: Array<{ id: number; name: string }>;
  muscles_secondary?: Array<{ id: number; name: string }>;
  images?: Array<{ id: number; image: string; is_main?: boolean; license_author?: string | null }>;
  videos?: Array<{ id: number; video: string; is_main?: boolean; duration?: number | null }>;
  aliases?: string[] | null;
  translations?: Array<{
    id: number;
    language?: number | null;
    name?: string | null;
    description?: string | null;
    aliases?: string[] | null;
  }>;
  language?: number | null;
};
