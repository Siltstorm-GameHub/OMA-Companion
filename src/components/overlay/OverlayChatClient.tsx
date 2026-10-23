"use client";

import { useMultiChat } from "@/components/watch/useMultiChat";
import { CHANNEL_COLORS, type ChatMessage } from "@/lib/twitch-irc";
import { useOverlayStream } from "./useOverlayStream";
import { displayName, type StreamerOverlayPayload } from "./types";

/** Mehr passt in eine übliche Chat-Quelle ohnehin nicht — ältere fallen oben heraus. */
const MAX_VISIBLE = 40;

/**
 * OBS-Chat-Quelle (/overlay/streamer/[userId]/chat?token=…): der eigene Twitch-Chat — und beim
 * gemeinsamen Streamen (Einladungs-Session oder Mitstreamer im selben Event) automatisch die Chats
 * aller Beteiligten in einer Liste, je Kanal eine Farbe. Liest anonym direkt in OBS mit, wie die
 * Zuschauer-Seite /zusammen; welche Kanäle dazugehören, kommt live über den Streamer-Stream.
 * Transparent, Nachrichten wachsen von unten — Größe und Position legt der Streamer in OBS fest.
 */
export default function OverlayChatClient({ userId, token, initial }: { userId: string; token: string; initial: StreamerOverlayPayload }) {
  const payload = useOverlayStream(`/api/overlay/streamer/${userId}/stream?${new URLSearchParams({ token, scene: "chat" })}`, initial);
  const own = payload.streamer.twitchLogin
    ? [{ login: payload.streamer.twitchLogin.toLowerCase(), name: displayName(payload.streamer) }]
    : [];
  const channels = payload.together?.channels.length ? payload.together.channels : own;
  const { messages } = useMultiChat(channels.map(c => c.login));
  const byLogin = new Map(channels.map((c, i) => [c.login, { name: c.name, color: CHANNEL_COLORS[i % CHANNEL_COLORS.length] }]));
  // Nur beim gemeinsamen Chat zeigen die Nachrichten, aus welchem Kanal sie kommen.
  const multi = channels.length > 1;

  return (
    <div
      style={{
        position: "fixed", inset: 0, padding: 12, overflow: "hidden",
        display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 6,
        fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)", color: "#fff",
      }}
    >
      <style>{`@keyframes oma-chat-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }`}</style>
      {messages.slice(-MAX_VISIBLE).map(m => (
        <ChatLine key={m.id} message={m} channel={multi ? byLogin.get(m.channel) : undefined} lite={payload.lite} />
      ))}
    </div>
  );
}

function ChatLine({ message: m, channel, lite }: { message: ChatMessage; channel?: { name: string; color: string }; lite: boolean }) {
  return (
    <div
      style={{
        alignSelf: "flex-start", maxWidth: "100%", boxSizing: "border-box",
        background: "rgba(9,9,14,0.78)", border: "1px solid rgba(255,255,255,0.08)",
        borderLeft: channel ? `3px solid ${channel.color}` : undefined,
        borderRadius: 10, padding: "6px 11px", fontSize: 17, lineHeight: 1.4, overflowWrap: "anywhere",
        animation: lite ? undefined : "oma-chat-in 280ms ease-out",
      }}
    >
      {channel && (
        <span style={{ marginRight: 7, fontSize: 12, fontWeight: 700, color: channel.color, verticalAlign: "1px" }}>
          {channel.name}
        </span>
      )}
      <span style={{ fontWeight: 700, color: m.color ?? "#cbd5e1" }}>{m.user}</span>
      <span style={m.action ? { fontStyle: "italic", color: m.color ?? undefined } : undefined}>
        {m.action ? " " : ": "}
        {m.parts.map((p, i) => p.type === "text"
          ? <span key={i}>{p.text}</span>
          : (
            // eslint-disable-next-line @next/next/no-img-element -- Twitch-Emote in der OBS-Quelle, externe Quelle
            <img key={i} src={`https://static-cdn.jtvnw.net/emoticons/v2/${p.id}/default/dark/1.0`} alt={p.name} style={{ height: 26, verticalAlign: "middle" }} />
          ))}
      </span>
    </div>
  );
}
