"use client";

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { getAttributeDefinition, type FeedbackColumnKey } from "@/lib/exercises/attribute-definitions";
import type { RepsDirection } from "@/lib/exercises/reps-direction";
import { getValueBackdropPath, getValueBackdropSizeClass } from "@/lib/exercises/value-backdrops";
import { getCachedExerciseMediaUrl, resolveExerciseMediaUrl } from "@/lib/game/exercise-media-client";
import type { FeedbackColor } from "@/types/exercise";

type FeedbackCellProps = {
  column: FeedbackColumnKey;
  color: FeedbackColor;
  value: string;
  displayValueOverride?: string;
  isRevealing?: boolean;
  revealOrder?: number;
  exerciseMediaSlug?: string;
  backgroundIconPath?: string | null;
  splitBackgroundIconPaths?: readonly [string, string] | null;
  className?: string;
  forceBackdropPreview?: boolean;
  repsDirection?: RepsDirection;
};

const colorClassByFeedback: Record<FeedbackColor, string> = {
  green: "feedback-cell--green",
  yellow: "feedback-cell--yellow",
  red: "feedback-cell--red",
};

const TOOLTIP_OPEN_EVENT = "liftdle-feedback-tooltip-open";
const missingBackdropPaths = new Set<string>();

type ValueBackdropImageProps = {
  path: string;
  className: string;
};

function ValueBackdropImage({ path, className }: ValueBackdropImageProps) {
  const [isMissing, setIsMissing] = useState(() => missingBackdropPaths.has(path));
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (missingBackdropPaths.has(path)) {
      return;
    }

    const image = new Image();
    image.src = path;

    if (image.complete) {
      const frameId = window.requestAnimationFrame(() => {
        setIsLoaded(true);
      });

      return () => window.cancelAnimationFrame(frameId);
    }

    const handleLoad = () => setIsLoaded(true);
    const handleError = () => {
      missingBackdropPaths.add(path);
      setIsMissing(true);
      setIsLoaded(false);
    };

    image.addEventListener("load", handleLoad);
    image.addEventListener("error", handleError);

    return () => {
      image.removeEventListener("load", handleLoad);
      image.removeEventListener("error", handleError);
    };
  }, [path]);

  if (isMissing) {
    return null;
  }

  return (
    <img
      src={path}
      alt=""
      className={className}
      style={{ visibility: isLoaded ? "visible" : "hidden" }}
      onError={() => {
        missingBackdropPaths.add(path);
        setIsMissing(true);
        setIsLoaded(false);
      }}
    />
  );
}

export function FeedbackCell({
  column,
  color,
  value,
  displayValueOverride,
  isRevealing = false,
  revealOrder = 0,
  exerciseMediaSlug,
  backgroundIconPath = null,
  splitBackgroundIconPaths = null,
  className = "",
  forceBackdropPreview = false,
  repsDirection = null,
}: FeedbackCellProps) {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);
  const [resolvedMediaState, setResolvedMediaState] = useState<{ slug: string | null; hasMedia: boolean }>({
    slug: null,
    hasMedia: false,
  });
  const cellRef = useRef<HTMLDivElement | null>(null);
  const tooltipId = useId();
  const normalizedValue = value.trim();
  const displayValue = displayValueOverride?.trim() || (normalizedValue.length > 0 ? normalizedValue : "Unknown");
  const shouldTrackMedia = column === "muscle" && Boolean(exerciseMediaSlug);
  const cachedHasExerciseMedia = shouldTrackMedia && exerciseMediaSlug
    ? Boolean(getCachedExerciseMediaUrl(exerciseMediaSlug))
    : false;
  const hasExerciseMedia =
    forceBackdropPreview ||
    cachedHasExerciseMedia ||
    (shouldTrackMedia && resolvedMediaState.slug === exerciseMediaSlug && resolvedMediaState.hasMedia);

  const tooltipText = useMemo(() => getAttributeDefinition(column, displayValue), [column, displayValue]);

  useEffect(() => {
    if (!shouldTrackMedia || !exerciseMediaSlug || cachedHasExerciseMedia) {
      return;
    }

    let cancelled = false;
    void resolveExerciseMediaUrl(exerciseMediaSlug).then((resolved) => {
      if (!cancelled) {
        setResolvedMediaState({ slug: exerciseMediaSlug, hasMedia: Boolean(resolved) });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [cachedHasExerciseMedia, exerciseMediaSlug, shouldTrackMedia]);

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

    const onDocumentPointerDown = (event: globalThis.PointerEvent) => {
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

    window.dispatchEvent(
      new CustomEvent(TOOLTIP_OPEN_EVENT, { detail: { id: tooltipId } }),
    );
    setCursorPosition(getClampedViewportPosition(event.clientX, event.clientY));
  };

  const handlePointerLeave = () => {
    setTooltipOpen(false);
    setCursorPosition(null);
  };

  const style: CSSProperties | undefined = isRevealing
    ? {
        animationDelay: `${revealOrder * 180}ms`,
      }
    : undefined;
  const showMuscleBackdrop = column === "muscle" && hasExerciseMedia && Boolean(backgroundIconPath);
  const showSplitMuscleBackdrop =
    column === "muscle" &&
    hasExerciseMedia &&
    Boolean(splitBackgroundIconPaths?.[0]) &&
    Boolean(splitBackgroundIconPaths?.[1]);
  const showRepsDirectionBackdrop = column === "reps" && repsDirection !== null;
  const valueBackdropPath = useMemo(() => getValueBackdropPath(column, displayValue), [column, displayValue]);
  const valueBackdropSizeClass = useMemo(() => getValueBackdropSizeClass(column, displayValue), [column, displayValue]);
  const showValueBackdrop = !showRepsDirectionBackdrop && column !== "muscle" && Boolean(valueBackdropPath);

  return (
    <div
      ref={cellRef}
      className={`feedback-cell ${colorClassByFeedback[color]} ${isRevealing ? "feedback-cell--reveal" : ""} ${showMuscleBackdrop || showSplitMuscleBackdrop ? "feedback-cell--with-muscle-backdrop" : ""} ${showValueBackdrop ? "feedback-cell--with-value-backdrop" : ""} ${className}`.trim()}
      role="cell"
      aria-label={displayValue}
      style={style}
      onClick={handleClick}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {showSplitMuscleBackdrop ? (
        <span className="feedback-cell__muscle-backdrop feedback-cell__muscle-backdrop--split" aria-hidden>
          <img
            src={splitBackgroundIconPaths?.[0] ?? ""}
            alt=""
            loading="lazy"
            className="feedback-cell__muscle-backdrop-part feedback-cell__muscle-backdrop-part--primary"
          />
          <img
            src={splitBackgroundIconPaths?.[1] ?? ""}
            alt=""
            loading="lazy"
            className="feedback-cell__muscle-backdrop-part feedback-cell__muscle-backdrop-part--secondary"
          />
          <span className="feedback-cell__muscle-backdrop-divider" />
        </span>
      ) : null}
      {showMuscleBackdrop ? (
        <span className="feedback-cell__muscle-backdrop" aria-hidden>
          <img src={backgroundIconPath ?? ""} alt="" loading="lazy" />
        </span>
      ) : null}
      {showValueBackdrop ? (
        <span className="feedback-cell__value-backdrop" aria-hidden>
          <ValueBackdropImage
            key={valueBackdropPath ?? ""}
            path={valueBackdropPath ?? ""}
            className={`feedback-cell__value-icon ${valueBackdropSizeClass ?? ""}`.trim()}
          />
        </span>
      ) : null}
      {showRepsDirectionBackdrop ? (
        <span className="feedback-cell__value-backdrop" aria-hidden>
          <ValueBackdropImage
            key={`/icons/up-arrow.svg:${repsDirection ?? ""}`}
            path="/icons/up-arrow.svg"
            className={`feedback-cell__value-icon feedback-cell__value-icon--reps ${repsDirection === "down" ? "feedback-cell__value-icon--reps-down" : "feedback-cell__value-icon--reps-up"}`.trim()}
          />
        </span>
      ) : null}
      <span className="feedback-cell__value">{displayValue}</span>
      {tooltipOpen && cursorPosition && typeof document !== "undefined"
        ? createPortal(
            <div
              className="feedback-cell__tooltip"
              style={{
                left: `${cursorPosition.x}px`,
                top: `${cursorPosition.y}px`,
              }}
            >
              {tooltipText}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
