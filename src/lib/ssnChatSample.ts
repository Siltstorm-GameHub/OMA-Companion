import WebSocket from "ws";

const SSN_HOST = "io.socialstream.ninja";

/**
 * Verbindet sich kurz mit dem Social-Stream-Ninja-Chat-Feed einer Session (Kanal 4 = kombinierter
 * Chat aus allen an diese Session angeschlossenen Quellen) und sammelt die Twitch-Chatnamen, die
 * waehrend des Sample-Fensters aktiv geschrieben haben.
 *
 * Naeherung statt echtem Watch-Time-Tracking: SSN liefert nur Chat-Nachrichten, keine Zuschauer-
 * /Chatter-Liste. Wird ausschliesslich waehrend ein Partner-Kanal nachweislich live ist aufgerufen
 * (siehe /api/cron/twitch-chat-coins), ein kurzes Sample-Fenster reicht daher als Aktivitaets-Indiz.
 */
export function sampleActiveTwitchChatters(sessionId: string, durationMs = 12000): Promise<string[]> {
  return new Promise((resolve) => {
    const seen = new Set<string>();
    let settled = false;
    let ws: WebSocket;

    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { ws.close(); } catch { /* bereits geschlossen */ }
      resolve([...seen]);
    };

    try {
      ws = new WebSocket(`wss://${SSN_HOST}/join/${encodeURIComponent(sessionId)}/4`);
    } catch {
      resolve([]);
      return;
    }

    const timer = setTimeout(finish, durationMs);

    ws.on("message", (raw) => {
      let parsed: unknown;
      try { parsed = JSON.parse(raw.toString()); } catch { return; }
      if (!parsed || typeof parsed !== "object") return;
      const obj = parsed as Record<string, unknown>;
      const msg = (obj.data && typeof obj.data === "object") ? (obj.data as Record<string, unknown>) : obj;
      if (msg.event) return; // Systemereignisse (Follows/Subs etc.), keine Chat-Nachricht
      if (msg.chatmessage == null) return;
      if (String(msg.type ?? "").toLowerCase() !== "twitch") return;
      const name = String(msg.chatname ?? "").trim().toLowerCase();
      if (name) seen.add(name);
    });
    ws.on("error", finish);
    ws.on("close", finish);
  });
}
