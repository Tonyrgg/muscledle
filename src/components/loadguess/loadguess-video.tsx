"use client";

import { useRef, useState } from "react";
import type { LoadGuessVideo as LoadGuessVideoType } from "@/lib/loadguess/types";

type LoadGuessVideoProps = {
  video: LoadGuessVideoType;
};

type PiPVideoElement = HTMLVideoElement & {
  webkitSetPresentationMode?: (mode: "inline" | "picture-in-picture" | "fullscreen") => void;
};

export function LoadGuessVideo({ video }: LoadGuessVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const pipSupported =
    typeof document !== "undefined" &&
    (("pictureInPictureEnabled" in document && document.pictureInPictureEnabled) ||
      (typeof HTMLVideoElement !== "undefined" &&
        "webkitSetPresentationMode" in HTMLVideoElement.prototype));

  async function handleTogglePlayback() {
    const player = videoRef.current;
    if (!player) {
      return;
    }

    if (player.paused) {
      try {
        await player.play();
        setIsPaused(false);
      } catch {
        setIsPaused(true);
      }

      return;
    }

    player.pause();
    setIsPaused(true);
  }

  async function handlePictureInPicture() {
    const player = videoRef.current as PiPVideoElement | null;
    if (!player) {
      return;
    }

    try {
      if ("pictureInPictureEnabled" in document && document.pictureInPictureEnabled) {
        await player.requestPictureInPicture();
        return;
      }

      if (typeof player.webkitSetPresentationMode === "function") {
        player.webkitSetPresentationMode("picture-in-picture");
        return;
      }
    } catch {
      return;
    }
  }

  return (
    <section key={video.id} className="loadguess-video" aria-label={video.exercise}>
      <div className="loadguess-video__frame">
        <video
          key={video.id}
          ref={videoRef}
          className="loadguess-video__player"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          poster={video.posterUrl}
          onClick={() => {
            void handleTogglePlayback();
          }}
          onPause={() => setIsPaused(true)}
          onPlay={() => setIsPaused(false)}
        >
          <source src={video.blurredVideoUrl} type="video/mp4" />
          Your browser does not support the video tag.
        </video>

        <div className="loadguess-video__controls" aria-label="Video controls">
          <button
            type="button"
            className="loadguess-video__control"
            aria-label={isPaused ? "Play video" : "Pause video"}
            onClick={() => {
              void handleTogglePlayback();
            }}
          >
            {isPaused ? (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 6.5v11l8.5-5.5Z" fill="currentColor" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 6h3v12H8zM13 6h3v12h-3z" fill="currentColor" />
              </svg>
            )}
          </button>

          <button
            type="button"
            className="loadguess-video__control"
            aria-label="Open picture in picture"
            disabled={!pipSupported}
            onClick={() => {
              void handlePictureInPicture();
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M4 6h16v12H4zM6 8v8h12V8zm7 4h5v5h-5z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>

        {isPaused ? <div className="loadguess-video__paused">Paused</div> : null}
      </div>
    </section>
  );
}
