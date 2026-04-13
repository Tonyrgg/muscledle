"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ExerciseMediaView } from "@/components/media/exercise-media-view";
import { getExerciseIconCandidates } from "@/lib/exercises/icons";
import { useExerciseMediaAssets } from "@/lib/media/use-exercise-media-assets";
import type { ExerciseMedia } from "@/types/media";

type ExerciseIconCellProps = {
  exerciseSlug: string;
  exerciseName: string;
  exerciseMuscleGroup: string | null;
};

function buildFallbackIconMedia(slug: string, name: string, muscleGroup: string | null): ExerciseMedia[] {
  const iconPath =
    getExerciseIconCandidates({
      slug,
      name,
      muscle_group: muscleGroup,
    })[0] ?? "/muscle-icons/full-body.svg";

  return [
    {
      id: `fallback-icon-${slug}`,
      exerciseId: slug,
      mediaKind: "icon",
      source: "local",
      sourceId: slug,
      url: iconPath,
      thumbnailUrl: null,
      posterUrl: null,
      mimeType: "image/svg+xml",
      width: null,
      height: null,
      durationSeconds: null,
      isPrimary: true,
      sortOrder: 0,
      isActive: true,
      attributionText: null,
      attributionUrl: null,
      license: null,
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
    },
  ];
}

export function ExerciseIconCell({ exerciseSlug, exerciseName, exerciseMuscleGroup }: ExerciseIconCellProps) {
  const [touchOpen, setTouchOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const fallbackMedia = useMemo(
    () => buildFallbackIconMedia(exerciseSlug, exerciseName, exerciseMuscleGroup),
    [exerciseMuscleGroup, exerciseName, exerciseSlug],
  );
  const { media, loading } = useExerciseMediaAssets(exerciseSlug, fallbackMedia);

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
          <ExerciseMediaView
            media={media}
            context="list"
            alt={exerciseName}
            className={loading ? "exercise-icon-cell__gif exercise-icon-cell__gif--loading" : "exercise-icon-cell__gif exercise-icon-cell__gif--ready"}
          />
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

                <ExerciseMediaView
                  media={media}
                  context="modal"
                  alt={`Demo ${exerciseName}`}
                  className="exercise-media-preview__media"
                />
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
