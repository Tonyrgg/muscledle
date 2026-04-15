"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getMuscleGroupIconPath, resolveMuscleGroupIconKey } from "@/lib/exercises/icons";

type ExerciseIconCellProps = {
  exerciseSlug: string;
  exerciseName: string;
  exerciseMuscleGroup: string | null;
};

function resolveColumnIconPath(slug: string, name: string, muscleGroup: string | null): string {
  const resolvedKey = resolveMuscleGroupIconKey({
    slug,
    name,
    muscle_group: muscleGroup,
  });

  // Keep a local-only hierarchy: primary anatomical icon + permanent local fallback.
  // Future providers can be appended here, but are intentionally disabled for now.
  const candidates = [
    getMuscleGroupIconPath(resolvedKey),
    "/muscle-icons/core.svg",
  ];

  return candidates.find(Boolean) ?? "/muscle-icons/core.svg";
}

export function ExerciseIconCell({ exerciseSlug, exerciseName, exerciseMuscleGroup }: ExerciseIconCellProps) {
  const [touchOpen, setTouchOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const iconPath = useMemo(
    () => resolveColumnIconPath(exerciseSlug, exerciseName, exerciseMuscleGroup),
    [exerciseMuscleGroup, exerciseName, exerciseSlug],
  );

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
          <img
            src={iconPath}
            alt=""
            className="exercise-icon-cell__icon"
            width={90}
            height={90}
            loading="lazy"
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

                <img
                  src={iconPath}
                  alt={`Demo ${exerciseName}`}
                  className="exercise-media-preview__media"
                  width={720}
                  height={460}
                />
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
