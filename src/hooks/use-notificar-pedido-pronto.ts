import { useEffect, useRef } from "react";
import { toast } from "sonner";

type Status = "recebido" | "em_preparo" | "pronto" | "entregue" | "cancelado";

function beep() {
  if (typeof window === "undefined") return;
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
    setTimeout(() => ctx.close(), 600);
  } catch {
    /* noop */
  }
}

/**
 * Detecta transição do pedido para "pronto" e notifica o cliente
 * uma única vez (toast + beep + vibração).
 */
export function useNotificarPedidoPronto(
  pedidoId: string | undefined,
  status: Status | undefined,
) {
  const prev = useRef<Status | null>(null);

  useEffect(() => {
    if (!pedidoId || !status) return;
    const key = `pedido-status-visto:${pedidoId}`;
    const visto =
      typeof window !== "undefined"
        ? (window.sessionStorage.getItem(key) as Status | null)
        : null;
    const anterior = prev.current ?? visto;

    if (status === "pronto" && anterior !== "pronto" && anterior !== "entregue") {
      toast.success("🔔 Seu pedido está pronto!");
      try {
        navigator.vibrate?.([200, 100, 200]);
      } catch {
        /* noop */
      }
      beep();
    }

    prev.current = status;
    if (typeof window !== "undefined") window.sessionStorage.setItem(key, status);
  }, [pedidoId, status]);
}