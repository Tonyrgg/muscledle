'use client';

import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";

type DailyCelebrationProps = {
  durationMs: number;
};

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function createEmojiShapes(scalar: number) {
  const emojis = ["\u{1F389}", "\u{1F38A}", "\u2728", "\u{1F3C6}", "\u{1F4AA}", "\u{1F3CB}\uFE0F", "\u{1F525}"];
  return emojis.map((text) => confetti.shapeFromText({ text, scalar }));
}

function fireLeftCannon(
  burst: ReturnType<typeof confetti.create>,
  emojiShapes: ReturnType<typeof createEmojiShapes>,
) {
  return burst({
    particleCount: 9,
    startVelocity: randomBetween(26, 38),
    angle: randomBetween(40, 58),
    spread: randomBetween(26, 40),
    ticks: 260,
    gravity: 0.9,
    decay: 0.965,
    scalar: 2.35,
    drift: 0.045,
    origin: { x: 0, y: randomBetween(0.18, 0.86) },
    shapes: emojiShapes,
    flat: true,
  });
}

function fireRightCannon(
  burst: ReturnType<typeof confetti.create>,
  emojiShapes: ReturnType<typeof createEmojiShapes>,
) {
  return burst({
    particleCount: 9,
    startVelocity: randomBetween(26, 38),
    angle: randomBetween(122, 140),
    spread: randomBetween(26, 40),
    ticks: 260,
    gravity: 0.9,
    decay: 0.965,
    scalar: 2.35,
    drift: -0.045,
    origin: { x: 1, y: randomBetween(0.18, 0.86) },
    shapes: emojiShapes,
    flat: true,
  });
}

export function DailyCelebration({ durationMs }: DailyCelebrationProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const safeDuration = Math.max(800, durationMs);
    const emojiShapes = createEmojiShapes(2.35);
    const burst = confetti.create(canvas, {
      resize: true,
      useWorker: true,
      disableForReducedMotion: true,
    });

    const startTime = performance.now();
    let nextShotAt = startTime;
    let rafId = 0;

    const frame = (now: number) => {
      const elapsed = now - startTime;
      const progressAt = (timestamp: number) => Math.min(1, Math.max(0, (timestamp - startTime) / safeDuration));
      const gapAt = (timestamp: number) => {
        const progress = progressAt(timestamp);
        const eased = progress * progress * (3 - 2 * progress);
        return 58 + eased * 20;
      };

      while (now >= nextShotAt && elapsed < safeDuration + 100) {
        void fireLeftCannon(burst, emojiShapes);
        void fireRightCannon(burst, emojiShapes);
        nextShotAt += gapAt(nextShotAt);
      }

      if (elapsed < safeDuration) {
        rafId = window.requestAnimationFrame(frame);
      }
    };

    rafId = window.requestAnimationFrame(frame);

    return () => {
      window.cancelAnimationFrame(rafId);
      burst.reset();
    };
  }, [durationMs]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 220,
      }}
    />
  );
}
