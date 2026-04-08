'use client';

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

type ExerciseIconCellProps = {
  exerciseSlug: string;
  exerciseName: string;
};

function resolveExerciseIconPath(exerciseSlug: string): string {
  if (!exerciseSlug) {
    return "";
  }

  return `/exercises/${exerciseSlug}.svg`;
}

export function ExerciseIconCell({ exerciseSlug, exerciseName }: ExerciseIconCellProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const [touchOpen, setTouchOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!touchOpen) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      if (!buttonRef.current?.contains(event.target as Node)) {
        setTouchOpen(false);
      }
    };

    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [touchOpen]);

  const iconPath = useMemo(() => resolveExerciseIconPath(exerciseSlug), [exerciseSlug]);

  return (
    <button
      ref={buttonRef}
      type="button"
      className={`exercise-icon-cell ${touchOpen ? "exercise-icon-cell--touch-open" : ""}`}
      aria-label={exerciseName}
      aria-pressed={touchOpen}
      onBlur={() => setTouchOpen(false)}
      onPointerDown={(event) => {
        if (event.pointerType !== "mouse") {
          event.preventDefault();
          setTouchOpen((current) => !current);
        }
      }}
    >
      <span className="exercise-icon-cell__icon-wrap" aria-hidden>
        {!imageFailed && iconPath ? (
          <Image
            src={iconPath}
            alt=""
            className="exercise-icon-cell__icon"
            width={40}
            height={40}
            onError={() => setImageFailed(true)}
          />
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
  );
}
