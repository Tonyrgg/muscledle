import type { LoadGuessVideo } from "@/lib/loadguess/types";

// Add future clips here. Each record owns the playback asset and the true load in kg.
export const LOAD_GUESS_VIDEOS: LoadGuessVideo[] = [
  {
  id: "clip-004",
  title: "Load Clip 04",
  exercise: "Bench Press",
  blurredVideoUrl: "/videos/loadguess/0503.mp4",
  originalVideoUrl: "/videos/loadguess/0503.mp4",
  targetKg: 90,
  targetLb: 200,
  startKg: 60,
  stepKg: 5,
}
];
