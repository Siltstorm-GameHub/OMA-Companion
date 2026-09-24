"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Copy, ExternalLink, Star } from "@/components/icons";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import MarkdownLite from "./MarkdownLite";
import { IDEA_LIFECYCLES, IDEA_INTEREST_KINDS, ideaCategoryLabel, ideaLifecycleMeta } from "@/lib/idea-lifecycle";
import { formatBerlinDate } from "@/lib/time";

/** Körper einer Ideen-Karte im Community-Board (und auf der Ideen-Seite): Ergebnis, Status, Frist, Herkunft, Begründungen. */

export interface IdeaEntry {
  id: string; title?: string; description?: string; status?: string; category?: string | null;
  lifecycle?: string; lifecycleNote?: string | null; votingEndsAt?: string | null;
  sourceEventId?: string | null; sourceReportId?: string | null;
  voteCount?: number; avgStars?: number; distribution?: number[];
  imageUrls?: string[]; version?: number; editedAt?: string | null; lastEditNote?: string | null;
  gameAppId?: number | null; gameName?: string | null; draftEventId?: string | null;
  interestParticipate?: number; interestHelp?: number; myInterests?: string[];
  author: { id: string; username: string | null; name: string | null };
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Fehlgeschlagen");
  return data as T;
}

function StarRow({ value }: { value: number }) {
  return (
    <span className="inline-flex" aria-label={`${value.toFixed(1)} von 5 Sternen`}>
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} className={`w-3.5 h-3.5 ${n <= Math.round(value) ? "text-amber-400 fill-amber-400" : "text-gray-700"}`} />
      ))}
    </span>
  );
}

function Result({ entry }: { entry: IdeaEntry }) {
  const count = entry.voteCount ?? 0;
  if (count === 0) return <p className="text-[11px] text-gray-600">Noch keine Bewertungen.</p>;
  const dist = entry.distribution ?? [0, 0, 0, 0, 0];
  const max = Math.max(1, ...dist);
  return (
    <div className="flex items-center gap-3">
      <div className="text-center shrink-0">
        <p className="text-lg font-bold text-white tabular-nums leading-none">{(entry.avgStars ?? 0).toFixed(1)}</p>
        <StarRow value={entry.avgStars ?? 0} />
        <p className="text-[10px] text-gray-500 mt-0.5">{count} {count === 1 ? "Stimme" : "Stimmen"}</p>
      </div>
      <div className="flex-1 space-y-0.5 min-w-0">
        {dist.map((n, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[10px] text-gray-500">
            <span className="w-2 tabular-nums">{5 - i}</span>
            <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div className="h-full rounded-full bg-amber-400/80" style={{ width: `${(n / max) * 100}%` }} />
            </div>
            <span className="w-4 text-right tabular-nums">{n}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface Reason { id: string; stars: number; reason: string; voter: { id: string; username: string | null; name: string | null } }

function Reasons({ ideaId }: { ideaId: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Reason[] | null>(null);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !items) api<{ votes: Reason[] }>(`/api/community-jobs/ideas/${ideaId}/votes`).then(d => setItems(d.votes)).catch(() => setItems([]));
  }

  return (
    <div className="space-y-1.5">
      <button onClick={toggle} aria-expanded={open} className="text-[11px] text-gray-500 hover:text-teal-400 transition-colors">
        {open ? "Begründungen ausblenden" : "Begründungen ansehen (nur für dich sichtbar)"}
      </button>
      {open && (items === null ? <p className="text-[11px] text-gray-600">Lädt…</p> : items.length === 0 ? <p className="text-[11px] text-gray-600">Noch keine Begründungen.</p> : (
        <ul className="space-y-1.5">
          {items.map(v => (
            <li key={v.id} className="rounded-lg bg-white/[0.03] px-2.5 py-1.5 text-xs">
              <p className="flex items-center gap-1.5 text-gray-400"><StarRow value={v.stars} /> <span>{v.voter.username ?? v.voter.name ?? "?"}</span></p>
              <p className="text-gray-300 whitespace-pre-line break-words">{v.reason}</p>
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
}

function ImageGrid({ urls }: { urls: string[] }) {
  if (urls.length === 0) return null;
  return (
    <div className={`grid gap-1.5 ${urls.length === 1 ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-3"}`}>
      {urls.map(u => (
        <a key={u} href={u} target="_blank" rel="noreferrer" className="block rounded-lg overflow-hidden bg-black/30">
          {/* eslint-disable-next-line @next/next/no-img-element -- Blob-Bilder beliebiger Größe */}
          <img src={u} alt="" loading="lazy" className={`w-full object-cover ${urls.length === 1 ? "max-h-72" : "h-28"}`} />
        </a>
      ))}
    </div>
  );
}

interface GameInfo { appId: number; name: string; image: string | null; price: string | null; discountPercent: number; players: number | null; url: string; communityEvents: number }

function GameCard({ appId, fallbackName }: { appId: number; fallbackName?: string | null }) {
  const [info, setInfo] = useState<GameInfo | null | undefined>(undefined);
  useEffect(() => {
    api<GameInfo>(`/api/community-jobs/ideas/game?appId=${appId}`).then(setInfo).catch(() => setInfo(null));
  }, [appId]);

  const url = `https://store.steampowered.com/app/${appId}`;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg bg-white/[0.03] border border-white/10 p-2 hover:border-teal-500/30 transition-colors">
      {info?.image && (
        // eslint-disable-next-line @next/next/no-img-element -- Steam-Header-Bild
        <img src={info.image} alt="" className="w-24 h-11 rounded object-cover shrink-0" />
      )}
      <span className="min-w-0 text-xs">
        <span className="block font-semibold text-gray-100 truncate">{info?.name ?? fallbackName ?? "Steam-Spiel"}</span>
        <span className="block text-[11px] text-gray-500">
          {info === undefined ? "Lädt…" : [
            info?.price ? `${info.price}${info.discountPercent > 0 ? ` (-${info.discountPercent}%)` : ""}` : null,
            info?.players != null ? `${info.players.toLocaleString("de-DE")} spielen gerade` : null,
            info && info.communityEvents > 0 ? `in der Community gespielt (${info.communityEvents} Events)` : null,
          ].filter(Boolean).join(" · ") || "Steam-Store"}
        </span>
      </span>
      <ExternalLink className="w-3 h-3 text-gray-600 shrink-0 ml-auto" />
    </a>
  );
}

function InterestBar({ entry, onChanged }: { entry: IdeaEntry; onChanged: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const mine = entry.myInterests ?? [];

  async function toggle(kind: string) {
    setBusy(kind);
    try {
      await api(`/api/community-jobs/ideas/${entry.id}/interest`, { method: "POST", body: JSON.stringify({ kind, on: !mine.includes(kind) }) });
      onChanged();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Fehlgeschlagen"); }
    finally { setBusy(null); }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {IDEA_INTEREST_KINDS.map(k => {
        const on = mine.includes(k.id);
        const count = k.id === "PARTICIPATE" ? entry.interestParticipate ?? 0 : entry.interestHelp ?? 0;
        return (
          <Button key={k.id} size="sm" variant={on ? "primary" : "outline"} loading={busy === k.id} onClick={() => toggle(k.id)}>
            {on ? k.doneLabel : k.label}{count > 0 ? ` (${count})` : ""}
          </Button>
        );
      })}
    </div>
  );
}

interface Revision { id: string; version: number; title: string; description: string; note: string | null; savedAt: string }

function Versions({ entry }: { entry: IdeaEntry }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Revision[] | null>(null);
  if ((entry.version ?? 1) <= 1) return null;

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !items) api<{ revisions: Revision[] }>(`/api/community-jobs/ideas/${entry.id}/revisions`).then(d => setItems(d.revisions)).catch(() => setItems([]));
  }

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] text-gray-500">
        Version {entry.version}{entry.editedAt ? ` · überarbeitet am ${formatBerlinDate(entry.editedAt)}` : ""}{entry.lastEditNote ? ` — ${entry.lastEditNote}` : ""}
        {" "}<button onClick={toggle} aria-expanded={open} className="text-teal-400 hover:text-teal-300 transition-colors">{open ? "Frühere Fassungen ausblenden" : "Frühere Fassungen"}</button>
      </p>
      {open && (items === null ? <p className="text-[11px] text-gray-600">Lädt…</p> : (
        <ul className="space-y-1.5">
          {items.map(r => (
            <li key={r.id} className="rounded-lg bg-white/[0.03] px-2.5 py-1.5 text-xs">
              <p className="text-gray-400">Version {r.version} · {formatBerlinDate(r.savedAt)}{r.note ? ` · ${r.note}` : ""}</p>
              <p className="text-gray-300 font-medium">{r.title}</p>
              <MarkdownLite text={r.description} className="text-xs text-gray-400" />
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
}

function StatusControl({ entry, onChanged }: { entry: IdeaEntry; onChanged: () => void }) {
  const [lifecycle, setLifecycle] = useState(entry.lifecycle ?? "OPEN");
  const [note, setNote] = useState(entry.lifecycleNote ?? "");
  const [busy, setBusy] = useState(false);
  const [draftBusy, setDraftBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await api(`/api/community-jobs/ideas/${entry.id}/status`, { method: "PATCH", body: JSON.stringify({ lifecycle, note }) });
      toast.success("Status gespeichert");
      onChanged();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Fehlgeschlagen"); }
    finally { setBusy(false); }
  }

  async function createDraft() {
    setDraftBusy(true);
    try {
      const d = await api<{ eventId: string }>(`/api/community-jobs/ideas/${entry.id}/event-draft`, { method: "POST" });
      toast.success("Event-Entwurf angelegt");
      window.location.href = `/admin/events/${d.eventId}`;
    } catch (err) { toast.error(err instanceof Error ? err.message : "Fehlgeschlagen"); }
    finally { setDraftBusy(false); }
  }

  return (
    <div className="rounded-lg bg-white/[0.03] border border-white/10 p-2.5 space-y-1.5">
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Team: Status setzen</p>
      <div className="flex flex-wrap items-center gap-1.5">
        <Select size="sm" value={lifecycle} onChange={e => setLifecycle(e.target.value)} aria-label="Status">
          {IDEA_LIFECYCLES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
        </Select>
        <input value={note} onChange={e => setNote(e.target.value)} maxLength={300} placeholder="Kurze Begründung (geht an den Autor)"
          className="flex-1 min-w-[10rem] bg-white/[0.04] border border-white/10 rounded px-2 py-1 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-500/40" />
        <Button size="sm" variant="outline" loading={busy} onClick={save}>Speichern</Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {entry.draftEventId
          ? <Link href={`/admin/events/${entry.draftEventId}`} className="text-[11px] text-teal-400 hover:text-teal-300 transition-colors">Event-Entwurf öffnen →</Link>
          : <Button size="sm" variant="ghost" loading={draftBusy} onClick={createDraft}>Event-Entwurf aus dieser Idee anlegen</Button>}
      </div>
    </div>
  );
}

export default function IdeaBody({ entry, currentUserId, onChanged, onIdeaPage = false, actions }: {
  entry: IdeaEntry; currentUserId: string | undefined; onChanged: () => void; onIdeaPage?: boolean; actions: React.ReactNode;
}) {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const isMod = role === "moderator" || role === "admin";
  const isAuthor = entry.author.id === currentUserId;
  const meta = ideaLifecycleMeta(entry.lifecycle);
  const category = ideaCategoryLabel(entry.category);
  const ends = entry.votingEndsAt ? new Date(entry.votingEndsAt) : null;
  const endsInFuture = ends ? ends.getTime() > Date.now() : false;

  async function copyLink() {
    try { await navigator.clipboard.writeText(`${window.location.origin}/community-board/idea/${entry.id}`); toast.success("Link kopiert"); }
    catch { toast.error("Kopieren nicht möglich"); }
  }

  return (
    <>
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {entry.lifecycle && entry.lifecycle !== "OPEN" && <Badge tone={meta.tone as BadgeTone}>{meta.label}</Badge>}
          {category && <Badge tone="info">{category}</Badge>}
          {ends && (endsInFuture
            ? <span className="text-[10px] text-gray-500">Abstimmung bis {formatBerlinDate(ends, { day: "2-digit", month: "2-digit" })}</span>
            : <span className="text-[10px] text-gray-600">Abstimmung beendet</span>)}
        </div>
        <p className="text-sm font-semibold text-white">
          {onIdeaPage ? entry.title : <Link href={`/community-board/idea/${entry.id}`} className="hover:text-teal-300 transition-colors">{entry.title}</Link>}
        </p>
        {entry.lifecycleNote && entry.lifecycle !== "OPEN" && <p className="text-[11px] text-gray-400">Team: {entry.lifecycleNote}</p>}
      </div>

      <MarkdownLite text={entry.description ?? ""} className="text-xs text-gray-400" />
      <ImageGrid urls={entry.imageUrls ?? []} />
      {entry.gameAppId && <GameCard appId={entry.gameAppId} fallbackName={entry.gameName} />}
      <Versions entry={entry} />

      {(entry.sourceEventId || entry.sourceReportId) && (
        <p className="text-[11px] text-gray-500">
          Entstanden zu{" "}
          {entry.sourceEventId && <Link href={`/tournament/${entry.sourceEventId}`} className="text-teal-400 hover:text-teal-300">einem Event</Link>}
          {entry.sourceEventId && entry.sourceReportId && " und "}
          {entry.sourceReportId && <Link href={`/community-board/report/${entry.sourceReportId}`} className="text-teal-400 hover:text-teal-300">einem Bericht</Link>}
        </p>
      )}

      <Result entry={entry} />

      <InterestBar entry={entry} onChanged={onChanged} />

      <div className="flex flex-wrap items-center gap-2">
        {actions}
        <button onClick={copyLink} title="Link zur Idee kopieren" aria-label="Link kopieren" className="p-1 text-gray-600 hover:text-teal-400 transition-colors"><Copy className="w-3.5 h-3.5" /></button>
      </div>

      {isAuthor && (entry.voteCount ?? 0) > 0 && <Reasons ideaId={entry.id} />}
      {isMod && <StatusControl entry={entry} onChanged={onChanged} />}
    </>
  );
}
