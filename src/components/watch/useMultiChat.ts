"use client";

import { useEffect, useState } from "react";
import { appendMessage, applyRemoval, parseIrcLine, toChatMessage, toRemoval, type ChatMessage } from "@/lib/twitch-irc";

const IRC_URL = "wss://irc-ws.chat.twitch.tv:443";
const RETRY_MIN_MS = 2000;
const RETRY_MAX_MS = 30_000;

export type ChatStatus = "connecting" | "connected" | "reconnecting" | "failed";

/**
 * Gemeinsamer Chat mehrerer Twitch-Kanäle — liest direkt im Browser des Zuschauers mit (anonym,
 * ohne Login, ohne Last auf unserem Server). Nachrichten aller Kanäle landen in einer Liste;
 * Moderation (gelöschte Nachrichten, Timeouts) wird übernommen, Shared-Chat-Doppelte gefiltert.
 * Bricht die Verbindung ab, wird mit wachsender Wartezeit neu verbunden; nach mehreren
 * Fehlschlägen am Stück meldet status "failed" (die Seite bietet dann Twitchs eigene Chats an).
 */
export function useMultiChat(channels: string[]): { messages: ChatMessage[]; status: ChatStatus } {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("connecting");
  const key = channels.map(c => c.toLowerCase()).sort().join(",");

  useEffect(() => {
    if (!key) return;
    const joined = key.split(",");
    let ws: WebSocket | null = null;
    let closed = false;
    let retry = RETRY_MIN_MS;
    let failures = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      ws = new WebSocket(IRC_URL);
      ws.onopen = () => {
        ws!.send("CAP REQ :twitch.tv/tags twitch.tv/commands");
        // Anonymes Mitlesen: beliebiges Passwort, Nick "justinfan" + Zahl.
        ws!.send("PASS SCHMOOPIIE");
        ws!.send(`NICK justinfan${Math.floor(10000 + Math.random() * 80000)}`);
        ws!.send(`JOIN ${joined.map(c => `#${c}`).join(",")}`);
      };
      ws.onmessage = ev => {
        for (const raw of String(ev.data).split("\r\n")) {
          const line = parseIrcLine(raw);
          if (!line) continue;
          if (line.command === "PING") { ws?.send(`PONG :${line.params[0] ?? "tmi.twitch.tv"}`); continue; }
          if (line.command === "001") { retry = RETRY_MIN_MS; failures = 0; setStatus("connected"); continue; }
          if (line.command === "RECONNECT") { ws?.close(); continue; }
          const msg = toChatMessage(line);
          if (msg) { setMessages(list => appendMessage(list, msg)); continue; }
          const removal = toRemoval(line);
          if (removal) setMessages(list => applyRemoval(list, removal));
        }
      };
      ws.onclose = () => {
        if (closed) return;
        failures += 1;
        setStatus(failures >= 4 ? "failed" : "reconnecting");
        timer = setTimeout(connect, retry);
        retry = Math.min(RETRY_MAX_MS, retry * 2);
      };
    };

    // Erster Verbindungsaufbau außerhalb des Effect-Körpers (kein synchrones setState im Effect).
    timer = setTimeout(() => { setMessages([]); setStatus("connecting"); connect(); }, 0);
    return () => {
      closed = true;
      clearTimeout(timer);
      ws?.close();
    };
  }, [key]);

  return { messages, status };
}
