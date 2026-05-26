import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type RealtimeStatus = "connecting" | "connected" | "degraded" | "disconnected";

const BACKOFF_MS = [2000, 5000, 10000, 30000];

interface UseRealtimeStatusOpts {
  channelName: string;
  enabled: boolean;
  setup: (channel: RealtimeChannel) => RealtimeChannel;
  onReconnect?: () => void;
}

/**
 * Encapsula o ciclo de vida de um canal Supabase Realtime e expõe o status
 * de conexão (connecting | connected | degraded | disconnected), com
 * backoff exponencial automático, reconexão em `online`/`visibilitychange`
 * e callback `onReconnect` ao restabelecer a conexão.
 */
export function useRealtimeStatus({
  channelName,
  enabled,
  setup,
  onReconnect,
}: UseRealtimeStatusOpts): { status: RealtimeStatus; reconnect: () => void } {
  const [status, setStatus] = useState<RealtimeStatus>("connecting");

  // Refs para evitar recriar o canal a cada render quando callbacks mudam.
  const setupRef = useRef(setup);
  const onReconnectRef = useRef(onReconnect);
  useEffect(() => {
    setupRef.current = setup;
    onReconnectRef.current = onReconnect;
  }, [setup, onReconnect]);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const attemptRef = useRef(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasConnectedRef = useRef(false);
  const statusRef = useRef<RealtimeStatus>("connecting");
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const teardown = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (channelRef.current) {
      try {
        supabase.removeChannel(channelRef.current);
      } catch {
        /* ignore */
      }
      channelRef.current = null;
    }
  }, []);

  const scheduleRetry = useCallback(() => {
    if (retryTimeoutRef.current) return;
    const idx = Math.min(attemptRef.current, BACKOFF_MS.length - 1);
    const delay = BACKOFF_MS[idx];
    attemptRef.current += 1;
    retryTimeoutRef.current = setTimeout(() => {
      retryTimeoutRef.current = null;
      connectRef.current?.();
    }, delay);
  }, []);

  const connectRef = useRef<(() => void) | null>(null);

  const connect = useCallback(() => {
    if (!enabled) return;
    teardown();
    setStatus((s) => (s === "connected" ? s : "connecting"));

    const base = supabase.channel(channelName);
    const configured = setupRef.current(base);
    channelRef.current = configured;

    configured.subscribe((subStatus) => {
      if (subStatus === "SUBSCRIBED") {
        attemptRef.current = 0;
        const wasConnected = wasConnectedRef.current;
        wasConnectedRef.current = true;
        setStatus("connected");
        if (!wasConnected) return;
        // já tinha conectado antes → veio de uma queda
        onReconnectRef.current?.();
      } else if (subStatus === "TIMED_OUT") {
        setStatus("degraded");
        scheduleRetry();
      } else if (subStatus === "CHANNEL_ERROR" || subStatus === "CLOSED") {
        setStatus("disconnected");
        scheduleRetry();
      }
    });
  }, [channelName, enabled, scheduleRetry, teardown]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  const reconnect = useCallback(() => {
    attemptRef.current = 0;
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    connect();
  }, [connect]);

  useEffect(() => {
    if (!enabled) {
      teardown();
      return;
    }
    wasConnectedRef.current = false;
    connect();
    return teardown;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, channelName]);

  // Listeners de janela: online / offline / visibilitychange
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const handleOnline = () => {
      reconnect();
    };
    const handleOffline = () => {
      setStatus("disconnected");
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && statusRef.current !== "connected") {
        reconnect();
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [enabled, reconnect]);

  return { status, reconnect };
}