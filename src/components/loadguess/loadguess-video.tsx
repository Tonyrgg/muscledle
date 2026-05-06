"use client";

import { useEffect, useRef, useState } from "react";
import type { LoadGuessVideo as LoadGuessVideoType } from "@/lib/loadguess/types";

type LoadGuessVideoProps = {
  video: LoadGuessVideoType;
  sourceUrl?: string;
};

type PiPVideoElement = HTMLVideoElement & {
  webkitSetPresentationMode?: (mode: "inline" | "picture-in-picture" | "fullscreen") => void;
  webkitRequestFullscreen?: () => Promise<void> | void;
};

export function LoadGuessVideo({
  video,
  sourceUrl = video.blurredVideoUrl,
}: LoadGuessVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const pipSupported =
    typeof document !== "undefined" &&
    (("pictureInPictureEnabled" in document && document.pictureInPictureEnabled) ||
      (typeof HTMLVideoElement !== "undefined" &&
        "webkitSetPresentationMode" in HTMLVideoElement.prototype));
  const fullscreenSupported =
    typeof document !== "undefined" &&
    typeof HTMLVideoElement !== "undefined" &&
    ("requestFullscreen" in HTMLVideoElement.prototype ||
      "webkitRequestFullscreen" in HTMLVideoElement.prototype);

  useEffect(() => {
    setIsReady(false);
    setIsPaused(false);
  }, [sourceUrl]);

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

  async function handleFullscreen() {
    const player = videoRef.current as PiPVideoElement | null;
    if (!player) {
      return;
    }

    try {
      if (typeof player.requestFullscreen === "function") {
        await player.requestFullscreen();
        return;
      }

      if (typeof player.webkitRequestFullscreen === "function") {
        await player.webkitRequestFullscreen();
      }
    } catch {
      return;
    }
  }

  return (
    <section
      key={`${video.id}-${sourceUrl}`}
      className="loadguess-video"
      aria-label={video.title}
    >
      <div className="loadguess-video__frame">
        {!isReady ? (
          <div className="loadguess-video__skeleton" aria-hidden="true">
            <div className="loadguess-video__skeleton-badge">Priming clip</div>
            <div className="loadguess-video__skeleton-stage">
              <span className="loadguess-video__skeleton-ring loadguess-video__skeleton-ring--outer" />
              <span className="loadguess-video__skeleton-ring loadguess-video__skeleton-ring--inner" />
              <span className="loadguess-video__skeleton-dot" />
            </div>
            <div className="loadguess-video__skeleton-bars">
              <span className="loadguess-video__skeleton-bar loadguess-video__skeleton-bar--long" />
              <span className="loadguess-video__skeleton-bar loadguess-video__skeleton-bar--mid" />
              <span className="loadguess-video__skeleton-bar loadguess-video__skeleton-bar--short" />
            </div>
          </div>
        ) : null}

        <video
          key={`${video.id}-${sourceUrl}`}
          ref={videoRef}
          className={`loadguess-video__player ${isReady ? "loadguess-video__player--ready" : ""}`}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          poster={video.posterUrl}
          onLoadedData={() => setIsReady(true)}
          onCanPlay={() => setIsReady(true)}
          onError={() => setIsReady(true)}
          onClick={() => {
            void handleTogglePlayback();
          }}
          onPause={() => setIsPaused(true)}
          onPlay={() => setIsPaused(false)}
        >
          <source src={sourceUrl} type="video/mp4" />
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

          <button
            type="button"
            className="loadguess-video__control"
            aria-label="Open fullscreen video"
            disabled={!fullscreenSupported}
            onClick={() => {
              void handleFullscreen();
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M5 9V5h4v2H7v2zm10-4h4v4h-2V7h-2zm2 10h2v4h-4v-2h2zM7 17h2v2H5v-4h2z"
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
