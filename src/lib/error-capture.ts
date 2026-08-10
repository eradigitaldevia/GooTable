// Captures the original Error out-of-band so server.ts can recover the stack
// when h3 has already swallowed the throw into a generic 500 Response.

let lastCapturedError: { error: unknown; at: number } | undefined;
const TTL_MS = 5_000;

// Client disconnects (navigation, HMR reload, closed tab) surface as
// "aborted" / AbortError from the node HTTP layer. They are not app errors.
export function isClientDisconnect(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { name?: unknown; message?: unknown; code?: unknown; cause?: unknown };
  if (candidate.name === "AbortError") return true;
  if (candidate.code === "ECONNRESET" || candidate.code === "ABORT_ERR") return true;
  if (
    typeof candidate.message === "string" &&
    /(^aborted$|aborted|ECONNRESET|socket hang up|premature close|request cancell?ed)/i.test(
      candidate.message,
    )
  ) {
    return true;
  }
  return isClientDisconnect(candidate.cause);
}

function record(error: unknown) {
  if (isClientDisconnect(error)) return;
  lastCapturedError = { error, at: Date.now() };
}

if (typeof globalThis.addEventListener === "function") {
  globalThis.addEventListener("error", (event) => record((event as ErrorEvent).error ?? event));
  globalThis.addEventListener("unhandledrejection", (event) =>
    record((event as PromiseRejectionEvent).reason),
  );
}

export function consumeLastCapturedError(): unknown {
  if (!lastCapturedError) return undefined;
  if (Date.now() - lastCapturedError.at > TTL_MS) {
    lastCapturedError = undefined;
    return undefined;
  }
  const { error } = lastCapturedError;
  lastCapturedError = undefined;
  return error;
}
