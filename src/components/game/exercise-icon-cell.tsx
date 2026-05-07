"use client";

import { createPortal } from "react-dom";
import { useEffect, useId, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
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

const TOOLTIP_OPEN_EVENT = "liftdle-feedback-tooltip-open";
const EXERCISE_MEDIA_TOOLTIP =
  "GIFS ARE DEMONSTRATIVE. SOME DO NOT PERFECTLY MATCH THE EXERCISE, BUT THEY ARE CLOSE. THERE IS CURRENTLY LIMITED SOURCE MATERIAL, AND WE ARE WORKING ON IT.";

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
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);
  const cachedMediaUrl = getCachedExerciseMediaUrl(exerciseSlug) ?? null;
  const [resolvedMedia, setResolvedMedia] = useState<{ slug: string; url: string | null }>({
    slug: exerciseSlug,
    url: cachedMediaUrl,
  });
  const [mediaResolved, setMediaResolved] = useState(() => cachedMediaUrl !== null);
  const [loadedMediaUrl, setLoadedMediaUrl] = useState<string | null>(null);
  const cellRef = useRef<HTMLDivElement | null>(null);
  const tooltipId = useId();
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
  const mediaUrl =
    cachedMediaUrl ??
    (resolvedMedia.slug === exerciseSlug ? resolvedMedia.url : null);
  const mediaReady = mediaUrl !== null && loadedMediaUrl === mediaUrl;
  const showLoadingSkeleton = !mediaResolved || (mediaUrl !== null && !mediaReady);
  const shouldShowFallback = mediaResolved && mediaUrl === null;

  useEffect(() => {
    let cancelled = false;

    void resolveExerciseMediaUrl(exerciseSlug).then((resolved) => {
      if (cancelled) return;
      setResolvedMedia({ slug: exerciseSlug, url: resolved });
      setMediaResolved(true);
    });

    return () => {
      cancelled = true;
    };
  }, [exerciseSlug]);

  useEffect(() => {
    const onAnotherTooltipOpen = (event: Event) => {
      const customEvent = event as CustomEvent<{ id?: string }>;
      if (customEvent.detail?.id === tooltipId) {
        return;
      }

      setTooltipOpen(false);
      setCursorPosition(null);
    };

    window.addEventListener(TOOLTIP_OPEN_EVENT, onAnotherTooltipOpen as EventListener);
    return () => window.removeEventListener(TOOLTIP_OPEN_EVENT, onAnotherTooltipOpen as EventListener);
  }, [tooltipId]);

  useEffect(() => {
    if (!tooltipOpen) {
      return;
    }

    const closeTooltip = () => {
      setTooltipOpen(false);
      setCursorPosition(null);
    };

    const onDocumentPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) {
        closeTooltip();
        return;
      }

      if (cellRef.current?.contains(target)) {
        return;
      }

      closeTooltip();
    };

    document.addEventListener("pointerdown", onDocumentPointerDown, true);
    window.addEventListener("scroll", closeTooltip, true);
    window.addEventListener("resize", closeTooltip);

    return () => {
      document.removeEventListener("pointerdown", onDocumentPointerDown, true);
      window.removeEventListener("scroll", closeTooltip, true);
      window.removeEventListener("resize", closeTooltip);
    };
  }, [tooltipOpen]);

  const getClampedViewportPosition = (clientX: number, clientY: number): { x: number; y: number } => {
    const viewportPadding = 12;
    const tooltipMaxWidth = 320;
    const tooltipHalfWidth = tooltipMaxWidth / 2;
    const minX = viewportPadding + tooltipHalfWidth;
    const maxX = Math.max(minX, window.innerWidth - viewportPadding - tooltipHalfWidth);
    const minY = 44;
    const maxY = Math.max(minY, window.innerHeight - viewportPadding);

    return {
      x: Math.max(minX, Math.min(clientX, maxX)),
      y: Math.max(minY, Math.min(clientY - 10, maxY)),
    };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!tooltipOpen) {
      return;
    }

    setCursorPosition(getClampedViewportPosition(event.clientX, event.clientY));
  };

  const handleClick = (event: ReactPointerEvent<HTMLDivElement>) => {
    const nextOpen = !tooltipOpen;
    setTooltipOpen(nextOpen);

    if (!nextOpen) {
      setCursorPosition(null);
      return;
    }

    window.dispatchEvent(new CustomEvent(TOOLTIP_OPEN_EVENT, { detail: { id: tooltipId } }));
    setCursorPosition(getClampedViewportPosition(event.clientX, event.clientY));
  };

  const handlePointerLeave = () => {
    setTooltipOpen(false);
    setCursorPosition(null);
  };

  return (
    <div
      ref={cellRef}
      className={`exercise-icon-cell ${mediaUrl ? "exercise-icon-cell--has-media" : ""} ${tooltipOpen ? "exercise-icon-cell--tooltip-open" : ""}`.trim()}
      role="button"
      aria-label={exerciseName}
      tabIndex={0}
      onClick={handleClick}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <span className="exercise-icon-cell__icon-wrap" aria-hidden>
        {showLoadingSkeleton ? (
          <span className="exercise-icon-cell__skeleton" />
        ) : null}
        {mediaUrl ? (
          <img
            src={mediaUrl}
            alt=""
            className={`exercise-icon-cell__gif ${mediaReady ? "exercise-icon-cell__gif--ready" : "exercise-icon-cell__gif--loading"}`}
            width={120}
            height={120}
            loading="lazy"
            onLoad={() => {
              markExerciseMediaLoaded(mediaUrl);
              setLoadedMediaUrl(mediaUrl);
            }}
            onError={() => {
              setResolvedMedia({ slug: exerciseSlug, url: null });
              setMediaResolved(true);
              setLoadedMediaUrl(null);
            }}
          />
        ) : null}

        {shouldShowFallback ? (
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
      {tooltipOpen && cursorPosition && typeof document !== "undefined"
        ? createPortal(
            <div
              className="feedback-cell__tooltip"
              style={{
                left: `${cursorPosition.x}px`,
                top: `${cursorPosition.y}px`,
              }}
            >
              {EXERCISE_MEDIA_TOOLTIP}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
