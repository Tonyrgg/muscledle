"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  getMuscleGroupIconKey,
  getMuscleGroupIconPath,
  resolveMuscleGroupIconKey,
} from "@/lib/exercises/icons";
import {
  getCachedExerciseMediaUrl,
  markExerciseMediaLoaded,
  resolveExerciseMediaUrl,
} from "@/lib/game/exercise-media-client";

type ExerciseIconCellProps = {
  exerciseSlug: string;
  exerciseName: string;
  exerciseMuscleGroup: string | null;
  exerciseMuscleValues?: string | null;
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

function parseMuscleTokens(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split("/")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function ExerciseIconCell({
  exerciseSlug,
  exerciseName,
  exerciseMuscleGroup,
  exerciseMuscleValues = null,
}: ExerciseIconCellProps) {
  const [touchOpen, setTouchOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [resolvedMedia, setResolvedMedia] = useState<{ slug: string; url: string | null }>({
    slug: exerciseSlug,
    url: null,
  });
  const [loadedMediaUrl, setLoadedMediaUrl] = useState<string | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const iconPath = useMemo(
    () => resolveColumnIconPath(exerciseSlug, exerciseName, exerciseMuscleGroup),
    [exerciseMuscleGroup, exerciseName, exerciseSlug],
  );
  const splitIconPaths = useMemo(() => {
    const tokens = parseMuscleTokens(exerciseMuscleValues);
    if (tokens.length < 2) return null;

    const first = getMuscleGroupIconPath(getMuscleGroupIconKey(tokens[0]));
    const second = getMuscleGroupIconPath(getMuscleGroupIconKey(tokens[1]));
    if (!first || !second || first === second) return null;

    return [first, second] as const;
  }, [exerciseMuscleValues]);
  const cachedMediaUrl = getCachedExerciseMediaUrl(exerciseSlug) ?? null;
  const mediaUrl =
    cachedMediaUrl ??
    (resolvedMedia.slug === exerciseSlug ? resolvedMedia.url : null);
  const mediaReady = mediaUrl !== null && loadedMediaUrl === mediaUrl;

  useEffect(() => {
    let cancelled = false;

    void resolveExerciseMediaUrl(exerciseSlug).then((resolved) => {
      if (cancelled) return;
      setResolvedMedia({ slug: exerciseSlug, url: resolved });
    });

    return () => {
      cancelled = true;
    };
  }, [exerciseSlug]);

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
        className={`exercise-icon-cell ${mediaUrl ? "exercise-icon-cell--has-media" : ""} ${touchOpen ? "exercise-icon-cell--touch-open" : ""}`}
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
          {mediaUrl ? (
            <img
              src={mediaUrl}
              alt=""
              className={`exercise-icon-cell__gif ${mediaReady ? "exercise-icon-cell__gif--ready" : "exercise-icon-cell__gif--loading"}`}
              width={90}
              height={90}
              loading="lazy"
              onLoad={() => {
                markExerciseMediaLoaded(mediaUrl);
                setLoadedMediaUrl(mediaUrl);
              }}
              onError={() => {
                setResolvedMedia({ slug: exerciseSlug, url: null });
                setLoadedMediaUrl(null);
              }}
            />
          ) : null}

          {!mediaReady ? (
            splitIconPaths ? (
              <span className="exercise-icon-cell__split">
                <img
                  src={splitIconPaths[0]}
                  alt=""
                  className="exercise-icon-cell__split-part exercise-icon-cell__split-part--primary"
                  width={90}
                  height={90}
                  loading="lazy"
                />
                <img
                  src={splitIconPaths[1]}
                  alt=""
                  className="exercise-icon-cell__split-part exercise-icon-cell__split-part--secondary"
                  width={90}
                  height={90}
                  loading="lazy"
                />
                <span className="exercise-icon-cell__split-divider" />
              </span>
            ) : (
              <img
                src={iconPath}
                alt=""
                className="exercise-icon-cell__icon"
                width={90}
                height={90}
                loading="lazy"
              />
            )
          ) : null}
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

                {mediaUrl ? (
                  <img
                    src={mediaUrl}
                    alt={`Demo ${exerciseName}`}
                    className="exercise-media-preview__media"
                    width={720}
                    height={460}
                  />
                ) : splitIconPaths ? (
                  <div className="exercise-media-preview__split" aria-label={`Icone muscolari ${exerciseName}`}>
                    <img
                      src={splitIconPaths[0]}
                      alt=""
                      className="exercise-media-preview__split-part exercise-media-preview__split-part--primary"
                      width={720}
                      height={460}
                    />
                    <img
                      src={splitIconPaths[1]}
                      alt=""
                      className="exercise-media-preview__split-part exercise-media-preview__split-part--secondary"
                      width={720}
                      height={460}
                    />
                    <span className="exercise-media-preview__split-divider" />
                  </div>
                ) : (
                  <img
                    src={iconPath}
                    alt={`Demo ${exerciseName}`}
                    className="exercise-media-preview__media"
                    width={720}
                    height={460}
                  />
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
