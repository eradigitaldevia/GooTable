const TTL_MS = 6 * 60 * 60 * 1000; // 6h

function key(qrToken: string) {
  return `upsell:imp:${qrToken}`;
}

interface Stored {
  ts: number;
  counts: Record<string, number>;
}

function read(qrToken: string): Stored {
  if (typeof window === "undefined") return { ts: Date.now(), counts: {} };
  try {
    const raw = window.localStorage.getItem(key(qrToken));
    if (!raw) return { ts: Date.now(), counts: {} };
    const parsed = JSON.parse(raw) as Stored;
    if (!parsed || typeof parsed.ts !== "number" || Date.now() - parsed.ts > TTL_MS) {
      return { ts: Date.now(), counts: {} };
    }
    return { ts: parsed.ts, counts: parsed.counts ?? {} };
  } catch {
    return { ts: Date.now(), counts: {} };
  }
}

function write(qrToken: string, data: Stored) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key(qrToken), JSON.stringify(data));
  } catch {
    /* storage cheio/desabilitado — ignora */
  }
}

export function getImpressoes(qrToken: string): Record<string, number> {
  return read(qrToken).counts;
}

export function registrarImpressoes(qrToken: string, produtoIds: string[]) {
  if (produtoIds.length === 0) return;
  const cur = read(qrToken);
  const counts = { ...cur.counts };
  for (const id of produtoIds) {
    counts[id] = (counts[id] ?? 0) + 1;
  }
  write(qrToken, { ts: cur.ts || Date.now(), counts });
}