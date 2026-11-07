"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { backoffDelay } from "./backoff";

export type SocketStatus = "connecting" | "open" | "reconnecting" | "paused" | "failed" | "idle";

export interface UseWebSocketOptions {
  url: string;
  /** False keeps the socket closed (status "idle"). */
  enabled?: boolean;
  /** Called on every (re)connect, e.g. to send a subscribe message. */
  onOpen?: (send: (data: string) => void) => void;
  onMessage: (data: unknown) => void;
  /** Consecutive failed attempts before giving up with status "failed". */
  maxRetries?: number;
  /** Close while the tab is hidden and reconnect when it is visible again. */
  pauseWhenHidden?: boolean;
  /** Injection points for tests. */
  WebSocketImpl?: typeof WebSocket;
  delay?: (attempt: number) => number;
}

/**
 * A WebSocket with the lifecycle a dashboard needs: exposes its status, reconnects with
 * exponential backoff and jitter after unexpected closes, gives up after `maxRetries` consecutive
 * failures (so a caller can fall back), pauses while the tab is hidden, and always closes on
 * unmount. Callbacks are read from refs, so passing new functions does not reconnect.
 */
export function useWebSocket({
  url,
  enabled = true,
  onOpen,
  onMessage,
  maxRetries = 5,
  pauseWhenHidden = true,
  WebSocketImpl,
  delay = (attempt) => backoffDelay(attempt),
}: UseWebSocketOptions) {
  const [status, setStatus] = useState<SocketStatus>(enabled ? "connecting" : "idle");
  const [attempt, setAttempt] = useState(0);
  const [generation, setGeneration] = useState(0);
  const socketRef = useRef<WebSocket | null>(null);
  const handlers = useRef({ onOpen, onMessage, delay });

  useEffect(() => {
    handlers.current = { onOpen, onMessage, delay };
  });

  useEffect(() => {
    if (!enabled) return;
    const Impl = WebSocketImpl ?? globalThis.WebSocket;
    let failures = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;
    let paused = false;

    const send = (data: string) => {
      if (socketRef.current?.readyState === 1) socketRef.current.send(data);
    };

    const schedule = () => {
      if (disposed || paused) return;
      if (failures >= maxRetries) {
        setStatus("failed");
        return;
      }
      setStatus("reconnecting");
      setAttempt(failures);
      timer = setTimeout(connect, handlers.current.delay(failures));
      failures += 1;
    };

    function connect() {
      if (disposed || paused) return;
      setStatus((s) => (s === "reconnecting" ? s : "connecting"));
      let socket: WebSocket;
      try {
        socket = new Impl(url);
      } catch {
        schedule();
        return;
      }
      socketRef.current = socket;
      socket.onopen = () => {
        failures = 0;
        setAttempt(0);
        setStatus("open");
        handlers.current.onOpen?.(send);
      };
      socket.onmessage = (event: MessageEvent) => handlers.current.onMessage(event.data);
      socket.onerror = () => {
        // An error is always followed by close; reconnecting is handled there.
      };
      socket.onclose = () => {
        if (socketRef.current === socket) socketRef.current = null;
        schedule();
      };
    }

    const closeQuietly = () => {
      const socket = socketRef.current;
      socketRef.current = null;
      if (socket) {
        socket.onclose = null;
        socket.onmessage = null;
        socket.onopen = null;
        socket.onerror = null;
        if (socket.readyState === 0 || socket.readyState === 1) socket.close(1000);
      }
    };

    const onVisibility = () => {
      if (!pauseWhenHidden) return;
      if (document.hidden) {
        paused = true;
        clearTimeout(timer);
        closeQuietly();
        setStatus("paused");
      } else if (paused) {
        paused = false;
        failures = 0;
        connect();
      }
    };

    connect();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      disposed = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      closeQuietly();
    };
  }, [url, enabled, maxRetries, pauseWhenHidden, WebSocketImpl, generation]);

  const send = useCallback((data: string) => {
    if (socketRef.current?.readyState === 1) socketRef.current.send(data);
  }, []);

  /** Starts over after "failed" (or forces a fresh connection). */
  const reconnect = useCallback(() => setGeneration((g) => g + 1), []);

  return { status: enabled ? status : ("idle" as SocketStatus), attempt, send, reconnect };
}
