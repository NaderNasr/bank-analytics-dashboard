"use client";

import { useEffect, useRef, useState } from "react";

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

export function motionAllowed() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Animates a number to `target` with an ease-out curve (~600 ms), from its previous value or,
 * with `fromZero`, from 0 on first appearance. Always lands on the exact target, and returns the
 * target directly under reduced motion or where matchMedia isn't available (tests, server).
 */
export function useCountUp(
  target: number,
  { durationMs = 600, fromZero = false }: { durationMs?: number; fromZero?: boolean } = {},
): number {
  const [display, setDisplay] = useState(() => (fromZero && motionAllowed() ? 0 : target));
  const current = useRef(display);

  useEffect(() => {
    if (!motionAllowed()) return;
    const start = current.current;
    if (start === target) return;
    let frame = 0;
    const began = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - began) / durationMs, 1);
      const value = t === 1 ? target : start + (target - start) * easeOutCubic(t);
      current.current = value;
      setDisplay(value);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return motionAllowed() ? display : target;
}
