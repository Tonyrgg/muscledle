import { LOAD_GUESS_VIDEOS } from "@/data/loadguess/videos";

const preloadedUrls = new Set<string>();
const preloadElements: HTMLVideoElement[] = [];

function preloadUrl(url: string) {
  if (typeof document === "undefined" || preloadedUrls.has(url)) {
    return;
  }

  const video = document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;
  video.src = url;
  video.load();

  preloadElements.push(video);
  preloadedUrls.add(url);
}

export function preloadWeightGuessVideos() {
  for (const video of LOAD_GUESS_VIDEOS) {
    preloadUrl(video.blurredVideoUrl);
    preloadUrl(video.originalVideoUrl);
  }
}
