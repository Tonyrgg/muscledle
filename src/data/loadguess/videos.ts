import type { LoadGuessVideo } from "@/lib/loadguess/types";

// Add future clips here. Each record owns the playback asset and the true load in kg.
export const LOAD_GUESS_VIDEOS: LoadGuessVideo[] = [
  {
    id: "clip-001",
    title: "Load Clip 01",
    exercise: "Bench Press",
    blurredVideoUrl: "/videos/loadguess/13944407_1080_1920_30fps.mp4",
    originalVideoUrl: "/videos/loadguess/13944407_1080_1920_30fps.mp4",
    targetKg: 100,
    targetLb: 220,
    startKg: 55,
    stepKg: 5,
  },
  {
    id: "clip-002",
    title: "Load Clip 02",
    exercise: "Deadlift",
    blurredVideoUrl: "/videos/loadguess/16368952-hd_1080_1920_30fps.mp4",
    originalVideoUrl: "/videos/loadguess/16368952-hd_1080_1920_30fps.mp4",
    targetKg: 140,
    targetLb: 309,
    startKg: 80,
    stepKg: 5,
  },
  {
    id: "clip-003",
    title: "Load Clip 03",
    exercise: "Back Squat",
    blurredVideoUrl: "/videos/loadguess/20549943-hd_1080_1920_30fps.mp4",
    originalVideoUrl: "/videos/loadguess/20549943-hd_1080_1920_30fps.mp4",
    targetKg: 120,
    targetLb: 265,
    startKg: 60,
    stepKg: 5,
  },
];
