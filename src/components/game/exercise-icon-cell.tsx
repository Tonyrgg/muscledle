'use client';

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ExerciseMediaPreview } from "@/components/exercises/exercise-media-preview";
import { getExerciseIconCandidates } from "@/lib/exercises/icons";
import {
  clearExerciseMediaUrl,
  getCachedExerciseMediaUrl,
  hasResolvedExerciseMedia,
  isExerciseMediaLoaded,
  markExerciseMediaLoaded,
  resolveExerciseMediaUrl,
} from "@/lib/game/exercise-media-client";

type ExerciseIconCellProps = {
  exerciseSlug: string;
  exerciseName: string;
  exerciseMuscleGroup: string | null;
};

export function ExerciseIconCell({
  exerciseSlug,
  exerciseName,
  exerciseMuscleGroup,
}: ExerciseIconCellProps) {
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [touchOpen, setTouchOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mediaState, setMediaState] = useState<{ slug: string; url: string | null; resolved: boolean }>(() => ({
    slug: exerciseSlug,
    url: getCachedExerciseMediaUrl(exerciseSlug) ?? null,
    resolved: hasResolvedExerciseMedia(exerciseSlug),
  }));
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const iconCandidates = useMemo(
    () => getExerciseIconCandidates({ slug: exerciseSlug, muscle_group: exerciseMuscleGroup }),
    [exerciseMuscleGroup, exerciseSlug],
  );

  const safeCandidateIndex = Math.min(candidateIndex, Math.max(0, iconCandidates.length - 1));
  const activeIconPath = iconCandidates[safeCandidateIndex] ?? "";
  const mediaUrl =
    mediaState.slug === exerciseSlug
      ? mediaState.url
      : (getCachedExerciseMediaUrl(exerciseSlug) ?? null);
  const [, forceGifRefresh] = useState(0);
  const isGifLoaded = Boolean(mediaUrl) && isExerciseMediaLoaded(mediaUrl);

  useEffect(() => {
    if (mediaState.resolved) {
      return;
    }

    let active = true;

    async function loadExerciseMedia() {
      const nextUrl = await resolveExerciseMediaUrl(exerciseSlug);
      if (active) {
        setMediaState({ slug: exerciseSlug, url: nextUrl, resolved: true });
      }
    }

    void loadExerciseMedia();

    return () => {
      active = false;
    };
  }, [exerciseSlug, mediaState.resolved]);

  useEffect(() => {
    if (!touchOpen && !isModalOpen) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      if (!buttonRef.current?.contains(event.target as Node)) {
        setTouchOpen(false);
      }
    };

    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [isModalOpen, touchOpen]);

  useEffect(() => {
    if (!isModalOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsModalOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isModalOpen]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`exercise-icon-cell ${touchOpen ? "exercise-icon-cell--touch-open" : ""}`}
        aria-label={exerciseName}
        aria-pressed={touchOpen}
        onBlur={() => setTouchOpen(false)}
        onClick={() => setIsModalOpen(true)}
        onPointerDown={(event) => {
          if (event.pointerType !== "mouse") {
            event.preventDefault();
            setTouchOpen((current) => !current);
          }
        }}
      >
        <span className="exercise-icon-cell__icon-wrap" aria-hidden>
          {mediaUrl && isGifLoaded ? (
            <img
              src={mediaUrl}
              alt=""
              className="exercise-icon-cell__gif exercise-icon-cell__gif--ready"
              loading="lazy"
              onLoad={() => {
                markExerciseMediaLoaded(mediaUrl);
                forceGifRefresh((current) => current + 1);
              }}
              onError={() => {
                clearExerciseMediaUrl(exerciseSlug);
                setMediaState({ slug: exerciseSlug, url: null, resolved: true });
                forceGifRefresh((current) => current + 1);
              }}
            />
          ) : activeIconPath ? (
            <>
              {mediaUrl ? (
                <img
                  src={mediaUrl}
                  alt=""
                  className="exercise-icon-cell__gif exercise-icon-cell__gif--loading"
                  loading="lazy"
                  onLoad={() => {
                    markExerciseMediaLoaded(mediaUrl);
                    forceGifRefresh((current) => current + 1);
                  }}
                  onError={() => {
                    clearExerciseMediaUrl(exerciseSlug);
                    setMediaState({ slug: exerciseSlug, url: null, resolved: true });
                    forceGifRefresh((current) => current + 1);
                  }}
                />
              ) : null}
              <Image
                key={`${exerciseSlug}-${activeIconPath}`}
                src={activeIconPath}
                alt=""
                className="exercise-icon-cell__icon"
                width={40}
                height={40}
                onError={() => {
                  setCandidateIndex((current) => {
                    if (current >= iconCandidates.length - 1) {
                      return current;
                    }

                    return current + 1;
                  });
                }}
              />
            </>
          ) : (
            <span className="exercise-icon-cell__fallback">
              <span />
              <span />
              <span />
            </span>
          )}
        </span>

        <span className="exercise-icon-cell__overlay">{exerciseName}</span>
      </button>

      {typeof document !== "undefined" && isModalOpen
        ? createPortal(
            <div
              className="exercise-media-modal"
              role="dialog"
              aria-modal="true"
              aria-label={`Exercise demo ${exerciseName}`}
              onClick={() => setIsModalOpen(false)}
            >
              <div className="exercise-media-modal__panel" onClick={(event) => event.stopPropagation()}>
                <div className="exercise-media-modal__header">
                  <h3 className="exercise-media-modal__title">{exerciseName}</h3>
                  <button
                    type="button"
                    className="exercise-media-modal__close"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Close
                  </button>
                </div>

                <ExerciseMediaPreview exerciseSlug={exerciseSlug} exerciseName={exerciseName} />
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
