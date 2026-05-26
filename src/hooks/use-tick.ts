import { useEffect, useState } from "react";

/** Força re-render no intervalo dado (em ms). Usado para timers que dependem do relógio. */
export function useTick(intervalMs: number = 30_000) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}