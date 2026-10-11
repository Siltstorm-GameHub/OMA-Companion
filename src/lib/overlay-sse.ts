import type { NextRequest } from "next/server";

// Serverless Functions laufen nicht beliebig lange — der Stream beendet sich nach MAX_STREAM_MS
// von selbst, sauber statt per Timeout gekappt. Der Browser-`EventSource` verbindet sich danach
// neu; der Client behält dabei seinen letzten Zustand, für OBS ist das unsichtbar.
const MAX_STREAM_MS = 4 * 60 * 1000;
const HEARTBEAT_MS = 15_000;

/** Signalisiert dem Stream, dass er sich beenden soll (z.B. Token wurde neu erzeugt). */
export const CLOSE_STREAM = Symbol("close-stream");

/**
 * Server-Sent-Events-Stream für die OBS-Overlays: fragt `load` alle `pollMs` ab und schickt nur
 * dann ein "update", wenn sich die Antwort geändert hat. `load` darf billig sein, weil die
 * eigentliche Last in lib/overlay-state.ts gecacht und zusammengelegt wird.
 * `null` = gerade nichts zu senden (z.B. transient), CLOSE_STREAM = Verbindung beenden.
 */
export function overlayStreamResponse(
  req: NextRequest,
  pollMs: number,
  load: () => Promise<unknown | null | typeof CLOSE_STREAM>,
): Response {
  const encoder = new TextEncoder();
  let closed = false;
  const timers: { poll?: ReturnType<typeof setInterval>; heartbeat?: ReturnType<typeof setInterval>; close?: ReturnType<typeof setTimeout> } = {};
  const stopTimers = () => {
    closed = true;
    clearInterval(timers.poll);
    clearInterval(timers.heartbeat);
    clearTimeout(timers.close);
  };

  const stream = new ReadableStream({
    async start(controller) {
      const close = () => {
        if (closed) return;
        stopTimers();
        try { controller.close(); } catch { /* schon geschlossen */ }
      };
      const write = (chunk: string) => {
        if (closed) return;
        try { controller.enqueue(encoder.encode(chunk)); } catch { close(); }
      };

      let lastPayload = "";
      let busy = false;
      const poll = async () => {
        if (closed || busy) return;
        busy = true;
        try {
          const data = await load();
          if (data === CLOSE_STREAM) return close();
          if (data == null) return;
          const payload = JSON.stringify(data);
          if (payload !== lastPayload) {
            lastPayload = payload;
            write(`event: update\ndata: ${payload}\n\n`);
          }
        } catch {
          // transienter DB-Fehler — beim nächsten Tick erneut versuchen
        } finally {
          busy = false;
        }
      };

      req.signal.addEventListener("abort", close);
      // Build-Kennung zuerst: ein Overlay mit Code von einem älteren Deployment lädt sich daraufhin
      // neu (siehe useOverlayStream) — sonst kennt es z.B. neu hinzugekommene Hintergründe nicht.
      write(`event: build\ndata: ${JSON.stringify(process.env.OMA_BUILD_ID ?? "dev")}\n\n`);
      await poll();
      if (closed) return;
      timers.poll = setInterval(poll, pollMs);
      timers.heartbeat = setInterval(() => write(`: ping\n\n`), HEARTBEAT_MS);
      timers.close = setTimeout(close, MAX_STREAM_MS);
    },
    cancel() {
      stopTimers();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
