import type { NextRequest } from "next/server";

// Serverless Functions laufen nicht beliebig lange — der Stream beendet sich nach MAX_STREAM_MS
// von selbst, sauber statt per Timeout gekappt. Der Browser-`EventSource` verbindet sich danach
// neu; der Client behält dabei seinen letzten Zustand, für OBS ist das unsichtbar.
const MAX_STREAM_MS = 4 * 60 * 1000;
const HEARTBEAT_MS = 15_000;

/** Nach so langer Zeit ohne Änderung gilt ein Stream als ruhig und fragt im langsamen Takt ab. */
export const IDLE_AFTER_MS = 60_000;

/**
 * Abfragetakt eines Streams: `fast`, solange sich in den letzten IDLE_AFTER_MS etwas geändert hat,
 * sonst `idle`. Eine OBS-Quelle steht meist stundenlang unverändert herum (oft auch, wenn gar nicht
 * gestreamt wird) — jeder Takt kostet Vercel-CPU (Free-Plan-Limit "Fluid Active CPU"). `idle` darf
 * vom zuletzt gesendeten Stand abhängen (z.B. laufendes Turnier → etwas schneller).
 */
export type StreamPacing = { fast: number; idle: number | ((last: unknown) => number) };

/** Takt für den nächsten Tick. `msSinceChange` ist Infinity, solange sich seit dem Verbindungsaufbau
 *  nichts geändert hat — ein Neuverbinden (alle MAX_STREAM_MS) startet also nicht wieder schnell. */
export function nextPollMs(pacing: StreamPacing, msSinceChange: number, last: unknown): number {
  if (msSinceChange < IDLE_AFTER_MS) return pacing.fast;
  return typeof pacing.idle === "function" ? pacing.idle(last) : pacing.idle;
}

/** Signalisiert dem Stream, dass er sich beenden soll (z.B. Token wurde neu erzeugt). */
export const CLOSE_STREAM = Symbol("close-stream");

/**
 * Server-Sent-Events-Stream für die OBS-Overlays: fragt `load` im Takt von `pacing` ab (siehe
 * nextPollMs) und schickt nur dann ein "update", wenn sich die Antwort geändert hat. `load` darf billig sein, weil die
 * eigentliche Last in lib/overlay-state.ts gecacht und zusammengelegt wird.
 * `null` = gerade nichts zu senden (z.B. transient), CLOSE_STREAM = Verbindung beenden.
 */
export function overlayStreamResponse(
  req: NextRequest,
  pacing: StreamPacing,
  load: () => Promise<unknown | null | typeof CLOSE_STREAM>,
): Response {
  const encoder = new TextEncoder();
  let closed = false;
  const timers: { poll?: ReturnType<typeof setTimeout>; heartbeat?: ReturnType<typeof setInterval>; close?: ReturnType<typeof setTimeout> } = {};
  const stopTimers = () => {
    closed = true;
    clearTimeout(timers.poll);
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
      let lastData: unknown = null;
      let lastChangeAt = -Infinity;
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
            // Der erste Stand nach dem Verbinden zählt nicht als Änderung (siehe nextPollMs).
            if (lastPayload) lastChangeAt = Date.now();
            lastPayload = payload;
            lastData = data;
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
      // Kette aus setTimeout statt setInterval, damit sich der Takt nach jedem Tick anpassen kann.
      const schedule = () => {
        if (closed) return;
        timers.poll = setTimeout(async () => { await poll(); schedule(); }, nextPollMs(pacing, Date.now() - lastChangeAt, lastData));
      };
      await poll();
      if (closed) return;
      schedule();
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
