"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, ExternalLink, Loader2, Search, Users, X, Check } from "@/components/icons";
import type { SessionPerson, SessionView } from "@/lib/watch-sessions";
import type { WatchMember } from "@/lib/watch-together";

type Mine = { hosting: SessionView | null; invites: SessionView[]; joined: SessionView[] };

const POLL_MS = 10_000;
const MAX_INVITES = 3;
const STATUS_LABEL: Record<string, string> = { invited: "eingeladen", accepted: "dabei", declined: "abgelehnt" };

/**
 * "Gemeinsam streamen" in der Live-Steuerung: Mitspieler einladen → fester Link /zusammen?s=…, unter
 * dem Zuschauer alle Streams nebeneinander mit gemeinsamem Chat sehen. Eingeladene bestätigen hier.
 */
export default function WatchSessionPanel() {
  const [mine, setMine] = useState<Mine | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/watch-sessions", { cache: "no-store" }).catch(() => null);
    if (res?.ok) setMine(await res.json());
  }, []);

  useEffect(() => {
    const first = setTimeout(load, 0);
    const t = setInterval(load, POLL_MS);
    return () => { clearTimeout(first); clearInterval(t); };
  }, [load]);

  async function act(sessionId: string, body: Record<string, unknown>, key: string, success?: string) {
    setBusy(key);
    try {
      const res = await fetch(`/api/watch-sessions/${sessionId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error ?? "Hat nicht geklappt"); return; }
      if (success) toast.success(success);
      await load();
    } finally {
      setBusy(null);
    }
  }

  if (!mine) return null;

  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
        <Users className="w-3.5 h-3.5" /> Gemeinsam streamen
      </h2>

      {/* Einladungen an mich */}
      {mine.invites.map(s => (
        <div key={s.id} className="rounded-xl border border-teal-500/30 bg-teal-500/10 p-3 space-y-2">
          <p className="text-sm text-teal-100">
            <span className="font-semibold">{s.host.name}</span> lädt dich ein, gemeinsam zu streamen{s.title ? <> – „{s.title}“</> : null}.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => act(s.id, { action: "accept" }, `a${s.id}`, "Angenommen – ihr erscheint jetzt gemeinsam")}
              disabled={busy === `a${s.id}`}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-teal-500/20 border border-teal-400/50 text-teal-100"
            >
              {busy === `a${s.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Annehmen
            </button>
            <button
              onClick={() => act(s.id, { action: "decline" }, `d${s.id}`)}
              className="text-sm px-3 py-1.5 rounded-lg border border-white/[0.08] text-gray-300"
            >
              Ablehnen
            </button>
          </div>
        </div>
      ))}

      {/* Sessions, bei denen ich mitmache */}
      {mine.joined.map(s => (
        <div key={s.id} className="rounded-xl border border-white/[0.08] p-3 space-y-2">
          <p className="text-sm text-gray-200">Du streamst gemeinsam mit <span className="font-semibold">{s.host.name}</span>{s.title ? <> – „{s.title}“</> : null}.</p>
          <ShareLink slug={s.slug} />
          <button onClick={() => act(s.id, { action: "leave" }, `l${s.id}`)} className="text-xs text-gray-500 hover:text-rose-300">Verlassen</button>
        </div>
      ))}

      {/* Eigene Session */}
      {mine.hosting ? (
        <HostingView session={mine.hosting} busy={busy} act={act} />
      ) : creating ? (
        <CreateSession onDone={() => { setCreating(false); void load(); }} onCancel={() => setCreating(false)} />
      ) : (
        <>
          <p className="text-xs text-gray-500">
            Spielst du mit anderen zusammen? Lade bis zu {MAX_INVITES} Mitglieder ein – Zuschauer sehen eure Streams dann
            nebeneinander mit einem gemeinsamen Chat.
          </p>
          <button
            onClick={() => setCreating(true)}
            className="w-full rounded-xl py-3 text-sm font-semibold border border-white/[0.08] text-gray-200 hover:border-teal-500/40 hover:bg-teal-500/10"
          >
            Mitspieler einladen
          </button>
        </>
      )}
    </div>
  );
}

function ShareLink({ slug }: { slug: string }) {
  const [url, setUrl] = useState(`/zusammen?s=${slug}`);
  useEffect(() => { const t = setTimeout(() => setUrl(`${window.location.origin}/zusammen?s=${slug}`), 0); return () => clearTimeout(t); }, [slug]);
  return (
    <div className="flex items-center gap-2">
      <code className="flex-1 min-w-0 truncate text-xs text-gray-300 bg-black/40 border border-white/[0.08] rounded-lg px-2.5 py-2">{url}</code>
      <button
        onClick={async () => { try { await navigator.clipboard.writeText(url); toast.success("Link kopiert"); } catch { toast.message(url); } }}
        title="Link kopieren"
        className="shrink-0 p-2 rounded-lg border border-teal-500/40 text-teal-300 hover:bg-teal-500/15"
      >
        <Copy className="w-4 h-4" />
      </button>
      <a href={url} target="_blank" rel="noopener noreferrer" title="Öffnen" className="shrink-0 p-2 rounded-lg border border-white/[0.08] text-gray-400 hover:text-teal-300">
        <ExternalLink className="w-4 h-4" />
      </a>
    </div>
  );
}

function PersonRow({ p, onRemove, busy }: { p: SessionPerson; onRemove?: () => void; busy?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`w-2 h-2 rounded-full shrink-0 ${p.live ? "bg-rose-400" : "bg-gray-600"}`} title={p.live ? "live" : "offline"} />
      <span className="text-gray-200 truncate">{p.name}</span>
      <span className={`text-[11px] ${p.status === "accepted" ? "text-teal-300" : p.status === "declined" ? "text-gray-500" : "text-amber-300"}`}>
        {STATUS_LABEL[p.status] ?? p.status}
      </span>
      <div className="flex-1" />
      {onRemove && (
        <button onClick={onRemove} disabled={busy} title="Entfernen" className="p-1 text-gray-500 hover:text-rose-300 disabled:opacity-40">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

function HostingView({ session, busy, act }: {
  session: SessionView; busy: string | null;
  act: (id: string, body: Record<string, unknown>, key: string, success?: string) => Promise<void>;
}) {
  const [inviting, setInviting] = useState(false);
  const open = session.members.filter(m => m.status !== "declined").length;
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-200">Deine Session{session.title ? <> „{session.title}“</> : null} läuft. Teile den Link mit deinen Zuschauern:</p>
      <ShareLink slug={session.slug} />
      <div className="space-y-1.5">
        <PersonRow p={session.host} />
        {session.members.map(m => (
          <PersonRow
            key={m.userId}
            p={m}
            busy={busy === `r${m.userId}`}
            onRemove={() => act(session.id, { action: "remove", userId: m.userId }, `r${m.userId}`)}
          />
        ))}
      </div>
      {inviting ? (
        <InvitePicker
          max={MAX_INVITES - open}
          exclude={[session.host.userId, ...session.members.filter(m => m.status !== "declined").map(m => m.userId)]}
          submitLabel="Einladen"
          onSubmit={async ids => { await act(session.id, { action: "invite", userIds: ids }, "invite", "Einladung verschickt"); setInviting(false); }}
          onCancel={() => setInviting(false)}
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          {open < MAX_INVITES && (
            <button onClick={() => setInviting(true)} className="text-sm px-3 py-1.5 rounded-lg border border-white/[0.08] text-gray-200 hover:border-teal-500/40">
              Weitere einladen
            </button>
          )}
          <button
            onClick={() => act(session.id, { action: "end" }, "end", "Session beendet")}
            disabled={busy === "end"}
            className="text-sm px-3 py-1.5 rounded-lg border border-rose-400/40 text-rose-200 bg-rose-500/10 hover:bg-rose-500/20"
          >
            Session beenden
          </button>
        </div>
      )}
    </div>
  );
}

function CreateSession({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [title, setTitle] = useState("");
  return (
    <div className="space-y-3">
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        maxLength={60}
        placeholder="Titel (optional), z.B. „Rocket League 2v2“"
        className="input-glass"
      />
      <InvitePicker
        max={MAX_INVITES}
        exclude={[]}
        submitLabel="Session starten & einladen"
        onCancel={onCancel}
        onSubmit={async ids => {
          const res = await fetch("/api/watch-sessions", {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, inviteUserIds: ids }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) { toast.error(data.error ?? "Session konnte nicht gestartet werden"); return; }
          toast.success("Session gestartet – Einladungen sind raus");
          onDone();
        }}
      />
    </div>
  );
}

/** Mitglieder auswählen (live zuerst, Suche nach Name). */
function InvitePicker({ max, exclude, submitLabel, onSubmit, onCancel }: {
  max: number; exclude: string[]; submitLabel: string;
  onSubmit: (ids: string[]) => Promise<void>; onCancel: () => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<WatchMember[] | null>(null);
  const [picked, setPicked] = useState<WatchMember[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      const res = await fetch(`/api/watch-sessions/candidates?q=${encodeURIComponent(q)}`, { cache: "no-store" }).catch(() => null);
      const data = res?.ok ? await res.json() : { members: [] };
      if (!cancelled) setResults(data.members);
    }, q ? 250 : 0);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q]);

  const toggle = (m: WatchMember) =>
    setPicked(p => (p.some(x => x.userId === m.userId) ? p.filter(x => x.userId !== m.userId) : p.length < max ? [...p, m] : p));
  const list = (results ?? []).filter(m => !exclude.includes(m.userId));

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Mitglied suchen" className="input-glass" style={{ paddingLeft: 36 }} />
      </div>
      {picked.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {picked.map(m => (
            <button key={m.userId} onClick={() => toggle(m)} className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-teal-500/20 text-teal-100">
              {m.name} <X className="w-3 h-3" />
            </button>
          ))}
        </div>
      )}
      <div className="max-h-56 overflow-y-auto space-y-1">
        {results === null && <p className="flex items-center gap-2 text-xs text-gray-500"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Lade Mitglieder …</p>}
        {results !== null && list.length === 0 && <p className="text-xs text-gray-500">Niemand gefunden (nur Mitglieder mit Twitch-Namen).</p>}
        {list.map(m => {
          const on = picked.some(x => x.userId === m.userId);
          return (
            <button
              key={m.userId}
              onClick={() => toggle(m)}
              disabled={!on && picked.length >= max}
              className={`w-full flex items-center gap-2 text-left text-sm px-2.5 py-2 rounded-lg border disabled:opacity-40 ${
                on ? "border-teal-400/60 bg-teal-500/15 text-teal-100" : "border-white/[0.06] text-gray-200 hover:border-white/20"
              }`}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${m.live ? "bg-rose-400" : "bg-gray-600"}`} />
              <span className="truncate">{m.name}</span>
              {m.live && m.game && <span className="text-xs text-gray-500 truncate">· {m.game}</span>}
              {on && <Check className="w-4 h-4 ml-auto shrink-0" />}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2">
        <button
          onClick={async () => { setSending(true); try { await onSubmit(picked.map(m => m.userId)); } finally { setSending(false); } }}
          disabled={picked.length === 0 || sending}
          className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-teal-500/20 border border-teal-400/50 text-teal-100 disabled:opacity-40"
        >
          {sending && <Loader2 className="w-4 h-4 animate-spin" />} {submitLabel}
        </button>
        <button onClick={onCancel} className="text-sm px-3 py-2 rounded-lg border border-white/[0.08] text-gray-400">Abbrechen</button>
      </div>
    </div>
  );
}
