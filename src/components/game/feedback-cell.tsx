"use client";

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { getAttributeDefinition, type FeedbackColumnKey } from "@/lib/exercises/attribute-definitions";
import { getCachedExerciseMediaUrl, resolveExerciseMediaUrl } from "@/lib/game/exercise-media-client";
import type { FeedbackColor } from "@/types/exercise";

type FeedbackCellProps = {
  column: FeedbackColumnKey;
  color: FeedbackColor;
  value: string;
  isRevealing?: boolean;
  revealOrder?: number;
  exerciseMediaSlug?: string;
  backgroundIconPath?: string | null;
};

const colorClassByFeedback: Record<FeedbackColor, string> = {
  green: "feedback-cell--green",
  yellow: "feedback-cell--yellow",
  red: "feedback-cell--red",
};

const TOOLTIP_OPEN_EVENT = "liftdle-feedback-tooltip-open";

export function FeedbackCell({
  column,
  color,
  value,
  isRevealing = false,
  revealOrder = 0,
  exerciseMediaSlug,
  backgroundIconPath = null,
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
  const displayValue = normalizedValue.length > 0 ? normalizedValue : "Unknown";
  const shouldTrackMedia = column === "muscle" && Boolean(exerciseMediaSlug);
  const cachedHasExerciseMedia = shouldTrackMedia && exerciseMediaSlug
    ? Boolean(getCachedExerciseMediaUrl(exerciseMediaSlug))
    : false;
  const hasExerciseMedia =
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

  return (
    <div
      ref={cellRef}
      className={`feedback-cell ${colorClassByFeedback[color]} ${isRevealing ? "feedback-cell--reveal" : ""} ${showMuscleBackdrop ? "feedback-cell--with-muscle-backdrop" : ""}`}
      role="cell"
      aria-label={displayValue}
      style={style}
      onClick={handleClick}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {showMuscleBackdrop ? (
        <span className="feedback-cell__muscle-backdrop" aria-hidden>
          <img src={backgroundIconPath ?? ""} alt="" loading="lazy" />
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
