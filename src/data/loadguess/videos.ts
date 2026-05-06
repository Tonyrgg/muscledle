import type { LoadGuessVideo } from "@/lib/loadguess/types";

// Add future clips here. Each record owns the playback asset and the true load in kg.
export const LOAD_GUESS_VIDEOS: LoadGuessVideo[] = [
  {
    id: "clip-001",
    title: "Load Clip 01",
    blurredVideoUrl: "/videos/weightGuessBlurred/video1blurred.mp4",
    originalVideoUrl: "/videos/weightGuessClear/video1clean.mp4",
    targetKg: 90,
    targetLb: 200,
    startKg: 60,
    stepKg: 5,
  },
  {
    id: "clip-002",
    title: "Load Clip 02",
    blurredVideoUrl: "/videos/weightGuessBlurred/video2blurred.mp4",
    originalVideoUrl: "/videos/weightGuessClear/video2clean.mp4",
    targetKg: 120,
    targetLb: 260,
    startKg: 60,
    stepKg: 5,
  },
  {
    id: "clip-003",
    title: "Load Clip 03",
    blurredVideoUrl: "/videos/weightGuessBlurred/video3blurred.mp4",
    originalVideoUrl: "/videos/weightGuessClear/video3clean.mp4",
    targetKg: 160,
    targetLb: 370,
    startKg: 60,
    stepKg: 5,
  },
  {
    id: "clip-004",
    title: "Load Clip 04",
    blurredVideoUrl: "/videos/weightGuessBlurred/video4blurred.mp4",
    originalVideoUrl: "/videos/weightGuessClear/video4clean.mp4",
    targetKg: 110,
    targetLb: 220,
    startKg: 60,
    stepKg: 5,
  },
];
