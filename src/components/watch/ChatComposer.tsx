"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Send } from "@/components/icons";
import type { ChatChannel } from "./MultiChatPanel";

type Me = { loggedIn: false } | { loggedIn: true; login: string; displayName: string };

/**
 * Schreiben im gemeinsamen Chat — mit Twitch-Login des Zuschauers, in den gewählten Kanal (Standard:
 * der Stream, der gerade Ton hat). Die eigene Nachricht erscheint über den normalen Chat-Empfang
 * in der Liste. Lehnt Twitch ab (Nur Follower, Slow-Mode, AutoMod …), steht die Begründung darunter.
 */
export default function ChatComposer({ channels, activeChannel }: { channels: ChatChannel[]; activeChannel: string | null }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loginHref, setLoginHref] = useState("/api/twitch/viewer/login");
  // Bewusst gewählter Kanal; ohne Wahl folgt das Feld dem Stream mit Ton.
  const [picked, setPicked] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/twitch/viewer/me", { cache: "no-store" })
      .then(r => r.json())
      .then((d: Me) => { if (!cancelled) setMe(d); })
      .catch(() => { if (!cancelled) setMe({ loggedIn: false }); });
    const t = setTimeout(() => {
      const url = new URL(window.location.href);
      // Rückmeldung vom Login (?twitch=abgebrochen|fehler) einmal anzeigen und aus der URL nehmen.
      const status = url.searchParams.get("twitch");
      if (status) {
        toast.error(status === "abgebrochen" ? "Twitch-Anmeldung abgebrochen" : "Twitch-Anmeldung hat nicht geklappt");
        url.searchParams.delete("twitch");
        window.history.replaceState(null, "", url);
      }
      setLoginHref(`/api/twitch/viewer/login?returnTo=${encodeURIComponent(url.pathname + url.search)}`);
    }, 0);
    return () => { cancelled = true; clearTimeout(t); };
  }, []);

  const target = channels.some(c => c.login === picked) ? picked : activeChannel ?? channels[0]?.login ?? null;

  async function send() {
    if (!target || !text.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/twitch/viewer/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: target, message: text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Nachricht wurde nicht gesendet");
        if (data.code === "LOGIN") setMe({ loggedIn: false });
        return;
      }
      setText("");
    } finally {
      setSending(false);
    }
  }

  async function logout() {
    await fetch("/api/twitch/viewer/logout", { method: "POST" }).catch(() => {});
    setMe({ loggedIn: false });
  }

  if (!me) return null;
  if (!me.loggedIn) {
    return (
      <div className="shrink-0 border-t border-white/[0.06] p-2.5">
        <a
          href={loginHref}
          className="flex items-center justify-center gap-2 w-full rounded-lg py-2 text-sm font-medium text-white bg-[#9146ff] hover:bg-[#7c3aed] transition-colors"
        >
          Mit Twitch anmelden, um mitzuschreiben
        </a>
      </div>
    );
  }

  return (
    <div className="shrink-0 border-t border-white/[0.06] p-2.5 space-y-1.5">
      {channels.length > 1 && (
        <div className="flex flex-wrap gap-1">
          {channels.map(c => (
            <button
              key={c.login}
              onClick={() => setPicked(c.login)}
              aria-pressed={target === c.login}
              className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md border transition-colors ${
                target === c.login ? "border-white/30 text-white" : "border-white/[0.06] text-gray-500 hover:text-gray-300"
              }`}
              style={target === c.login ? { background: `${c.color}33` } : undefined}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.color }} /> {c.name}
            </button>
          ))}
        </div>
      )}
      <form onSubmit={e => { e.preventDefault(); void send(); }} className="flex gap-1.5">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          maxLength={500}
          placeholder={target ? `Nachricht an ${channels.find(c => c.login === target)?.name ?? target}` : "Nachricht"}
          className="input-glass flex-1 min-w-0 !py-1.5 text-sm"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          aria-label="Senden"
          className="shrink-0 px-3 rounded-lg bg-teal-500/20 border border-teal-400/40 text-teal-100 disabled:opacity-40"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
      {error && <p className="text-[11px] text-rose-300">{error}</p>}
      <p className="text-[11px] text-gray-500">
        Angemeldet als <span className="text-[#c4a3ff]">{me.displayName}</span> ·{" "}
        <button onClick={logout} className="hover:text-gray-300 underline-offset-2 hover:underline">Abmelden</button>
      </p>
    </div>
  );
}
