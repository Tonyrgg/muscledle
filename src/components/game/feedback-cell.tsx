"use client";

import { useMemo, useState, type CSSProperties, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { getAttributeDefinition, type FeedbackColumnKey } from "@/lib/exercises/attribute-definitions";
import type { FeedbackColor } from "@/types/exercise";

type FeedbackCellProps = {
  column: FeedbackColumnKey;
  color: FeedbackColor;
  value: string;
  isRevealing?: boolean;
  revealOrder?: number;
};

const colorClassByFeedback: Record<FeedbackColor, string> = {
  green: "feedback-cell--green",
  yellow: "feedback-cell--yellow",
  red: "feedback-cell--red",
};

export function FeedbackCell({ column, color, value, isRevealing = false, revealOrder = 0 }: FeedbackCellProps) {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);
  const normalizedValue = value.trim();
  const displayValue = normalizedValue.length > 0 ? normalizedValue : "Unknown";

  const tooltipText = useMemo(() => getAttributeDefinition(column, displayValue), [column, displayValue]);

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

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!tooltipOpen) {
      return;
    }

    setCursorPosition(getClampedViewportPosition(event.clientX, event.clientY));
  };

  const handleClick = (event: PointerEvent<HTMLDivElement>) => {
    const nextOpen = !tooltipOpen;
    setTooltipOpen(nextOpen);

    if (!nextOpen) {
      return;
    }

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

  return (
    <div
      className={`feedback-cell ${colorClassByFeedback[color]} ${isRevealing ? "feedback-cell--reveal" : ""}`}
      role="cell"
      aria-label={displayValue}
      style={style}
      onClick={handleClick}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <span>{displayValue}</span>
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
