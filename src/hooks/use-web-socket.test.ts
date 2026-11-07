import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useWebSocket } from "./use-web-socket";

/** A controllable stand-in for the browser WebSocket. */
class FakeSocket {
  static instances: FakeSocket[] = [];
  readyState = 0;
  sent: string[] = [];
  closedWith?: number;
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  constructor(readonly url: string) {
    FakeSocket.instances.push(this);
  }
  send(data: string) {
    this.sent.push(data);
  }
  close(code?: number) {
    this.closedWith = code;
    this.readyState = 3;
  }
  // Test controls
  open() {
    this.readyState = 1;
    this.onopen?.();
  }
  message(data: unknown) {
    this.onmessage?.({ data });
  }
  drop() {
    this.readyState = 3;
    this.onclose?.();
  }
}

const latest = () => FakeSocket.instances.at(-1)!;

function setup(overrides: Partial<Parameters<typeof useWebSocket>[0]> = {}) {
  const onMessage = vi.fn();
  const hook = renderHook(() =>
    useWebSocket({
      url: "wss://example.test/feed",
      onMessage,
      onOpen: (send) => send("subscribe"),
      WebSocketImpl: FakeSocket as unknown as typeof WebSocket,
      delay: (attempt) => 1_000 * (attempt + 1),
      maxRetries: 3,
      ...overrides,
    }),
  );
  return { ...hook, onMessage };
}

beforeEach(() => {
  FakeSocket.instances = [];
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("useWebSocket", () => {
  it("connects, subscribes on open and delivers messages", () => {
    const { result, onMessage } = setup();
    expect(result.current.status).toBe("connecting");

    act(() => latest().open());
    expect(result.current.status).toBe("open");
    expect(latest().sent).toEqual(["subscribe"]);

    act(() => latest().message("hello"));
    expect(onMessage).toHaveBeenCalledWith("hello");
  });

  it("reconnects with backoff after a drop and resubscribes", () => {
    const { result } = setup();
    act(() => latest().open());
    act(() => latest().drop());
    expect(result.current.status).toBe("reconnecting");
    expect(FakeSocket.instances).toHaveLength(1);

    act(() => vi.advanceTimersByTime(999));
    expect(FakeSocket.instances).toHaveLength(1);
    act(() => vi.advanceTimersByTime(1));
    expect(FakeSocket.instances).toHaveLength(2);

    act(() => latest().open());
    expect(result.current.status).toBe("open");
    expect(latest().sent).toEqual(["subscribe"]);
  });

  it("gives up after maxRetries consecutive failures, and can start over", () => {
    const { result } = setup();
    for (let i = 0; i < 3; i++) {
      act(() => latest().drop());
      act(() => vi.runOnlyPendingTimers());
    }
    act(() => latest().drop());
    expect(result.current.status).toBe("failed");
    expect(FakeSocket.instances).toHaveLength(4);

    act(() => result.current.reconnect());
    expect(FakeSocket.instances).toHaveLength(5);
    expect(result.current.status).toBe("connecting");
  });

  it("pauses while the tab is hidden and reconnects when visible", () => {
    const { result } = setup();
    act(() => latest().open());
    const first = latest();

    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(result.current.status).toBe("paused");
    expect(first.closedWith).toBe(1000);

    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(FakeSocket.instances).toHaveLength(2);
    expect(result.current.status).toBe("connecting");
  });

  it("closes on unmount without reconnecting", () => {
    const { unmount } = setup();
    act(() => latest().open());
    const socket = latest();
    unmount();
    expect(socket.closedWith).toBe(1000);
    act(() => vi.runAllTimers());
    expect(FakeSocket.instances).toHaveLength(1);
  });

  it("stays closed when disabled", () => {
    const { result } = setup({ enabled: false });
    expect(result.current.status).toBe("idle");
    expect(FakeSocket.instances).toHaveLength(0);
  });
});
