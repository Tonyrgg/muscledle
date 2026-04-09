'use client';

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { getExerciseIconCandidates } from "@/lib/exercises/icons";

type ExerciseIconCellProps = {
  exerciseSlug: string;
  exerciseName: string;
  exerciseMuscleGroup: string | null;
};

export function ExerciseIconCell({ exerciseSlug, exerciseName, exerciseMuscleGroup }: ExerciseIconCellProps) {
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [touchOpen, setTouchOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const iconCandidates = useMemo(
    () => getExerciseIconCandidates({ slug: exerciseSlug, muscle_group: exerciseMuscleGroup }),
    [exerciseMuscleGroup, exerciseSlug],
  );

  const activeIconPath = iconCandidates[candidateIndex] ?? "";

  useEffect(() => {
    setCandidateIndex(0);
  }, [exerciseSlug, exerciseMuscleGroup]);

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
        {activeIconPath ? (
          <Image
            key={activeIconPath}
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
