import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useCountUp } from "./use-count-up";

let now = 0;
let queued: FrameRequestCallback[] = [];
const runFrame = (ms: number) => {
  now += ms;
  const callbacks = queued;
  queued = [];
  callbacks.forEach((cb) => cb(now));
};

function allowMotion(allowed: boolean) {
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches: q.includes("reduce") ? !allowed : false,
    media: q,
  }));
}

beforeEach(() => {
  now = 0;
  queued = [];
  vi.spyOn(performance, "now").mockImplementation(() => now);
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => queued.push(cb));
  vi.stubGlobal("cancelAnimationFrame", () => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useCountUp", () => {
  it("counts up from zero with an ease-out and lands exactly on the target", () => {
    allowMotion(true);
    const { result } = renderHook(() => useCountUp(1_000, { fromZero: true, durationMs: 600 }));
    expect(result.current).toBe(0);

    act(() => runFrame(300));
    expect(result.current).toBeGreaterThan(500); // ease-out: past halfway at half time
    expect(result.current).toBeLessThan(1_000);

    act(() => runFrame(300));
    expect(result.current).toBe(1_000);
  });

  it("animates from the previous value when the target changes", () => {
    allowMotion(true);
    const { result, rerender } = renderHook(({ target }) => useCountUp(target), {
      initialProps: { target: 100 },
    });
    expect(result.current).toBe(100);
    rerender({ target: 200 });
    act(() => runFrame(150));
    expect(result.current).toBeGreaterThan(100);
    expect(result.current).toBeLessThan(200);
    act(() => runFrame(600));
    expect(result.current).toBe(200);
  });

  it("shows the exact value at once under reduced motion", () => {
    allowMotion(false);
    const { result, rerender } = renderHook(
      ({ target }) => useCountUp(target, { fromZero: true }),
      {
        initialProps: { target: 500 },
      },
    );
    expect(result.current).toBe(500);
    rerender({ target: 900 });
    expect(result.current).toBe(900);
    expect(queued).toHaveLength(0);
  });
});
