"use client";
// ============================================
// Büro in kurz — rechte Spalte des Community-Boards (Desktop): Deine Woche (Gehalt, Bonus, heute gezählte
// Beiträge), Für dich zu tun (Empfehlungen als Ein-Klick-Aktionen ins Verfassen-Feld) und Coaching.
// Das volle Büro (Gehaltshistorie, Bildwünsche, Kampagnen, eigene Beiträge, Coach-Werkzeuge) liegt unter
// /community-board/buero; am Handy ist das der Reiter "Büro".
// ============================================

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatFixed } from "@/lib/format-number";
import { formatBerlinDateTime } from "@/lib/time";
import CoinIcon from "@/components/CoinIcon";
import { CalendarDays, ChevronRight, FileText, GraduationCap, ImagePlus, Megaphone, X } from "@/components/icons";
import type { ComposeRequest } from "./compose";

interface Projected { coinsAwarded: number; maxCoinsAwarded: number; voteBonusMultiplier: number; ownVotes: number; tierLabel: string | null }
interface Overview { dailyContributions: { used: number; limit: number; remaining: number }; coachSelf: { availableUntil: string | null } }
interface Rec {
  eventId: string; title: string; reason: string; url?: string; urgency?: string; urgent?: boolean; noCreate?: boolean;
  recap?: "week" | "month"; photoRequestId?: string; collage?: boolean; scopeEventId?: string; postTemplate?: string; trainingSessionId?: string;
}

const JOB = "content_creator";
const MAX_RECS = 4;

async function get<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

/** Empfehlung → Vorbelegung fürs Verfassen-Feld (gleiche Logik wie "Erstellen" im Büro) */
function requestFor(e: Rec): ComposeRequest {
  if (e.recap) return { kind: "post", prefill: { recap: e.recap } };
  if (e.trainingSessionId) return { kind: "post", prefill: { trainingSessionId: e.trainingSessionId, template: "training" } };
  if (e.scopeEventId) return { kind: "post", eventId: e.scopeEventId, prefill: { template: e.postTemplate } };
  if (e.collage) return { kind: "post", tool: "photo", prefill: { collage: true } };
  if (e.photoRequestId) return { kind: "post", tool: "photo", prefill: { photoRequestId: e.photoRequestId, title: e.title } };
  return { kind: "post", eventId: e.eventId };
}

function iconFor(e: Rec) {
  if (e.photoRequestId || e.collage) return <ImagePlus className="size-4 text-success" />;
  if (e.recap) return <FileText className="size-4 text-primary-fg" />;
  if (e.trainingSessionId) return <GraduationCap className="size-4 text-violet-300" />;
  return <Megaphone className="size-4 text-primary-fg" />;
}

export default function OfficeSidebar({ onCompose }: { onCompose: (req: ComposeRequest) => void }) {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [projected, setProjected] = useState<Projected | null>(null);
  const [recs, setRecs] = useState<Rec[] | null>(null);
  const [now] = useState(() => Date.now());
  const [payLoaded, setPayLoaded] = useState(false);
  const dash = payLoaded ? "–" : "…";

  useEffect(() => {
    get<Overview>("/api/community-jobs").then(setOverview);
    get<Projected>(`/api/community-jobs/projected-payout?jobKey=${JOB}`).then(p => { setProjected(p); setPayLoaded(true); });
    get<{ events: Rec[] }>(`/api/community-jobs/recommendations?jobKey=${JOB}`).then(d => setRecs(d?.events ?? []));
  }, []);

  function dismiss(id: string) {
    setRecs(r => r?.filter(e => e.eventId !== id) ?? r);
    fetch("/api/community-jobs/recommendations/dismiss", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobKey: JOB, itemKey: id }),
    }).catch(() => {});
  }

  const daily = overview?.dailyContributions;
  const pct = projected && projected.maxCoinsAwarded > 0 ? Math.min(100, Math.round((projected.coinsAwarded / projected.maxCoinsAwarded) * 100)) : 0;
  const coachUntil = overview?.coachSelf.availableUntil ? new Date(overview.coachSelf.availableUntil) : null;
  const coachOn = !!coachUntil && coachUntil.getTime() > now;
  const shown = (recs ?? []).slice(0, MAX_RECS);

  return (
    <div className="space-y-3">
      {/* Deine Woche */}
      <section className="rounded-card border border-line bg-surface p-4 shadow-card">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-subtle">Deine Woche</h2>
          <Link href="/community-board/buero?ansicht=gehalt" className="text-xs font-semibold text-primary-fg hover:text-fg">Gehalt</Link>
        </div>
        <p className="mt-1.5 flex items-baseline gap-1.5">
          <CoinIcon size={16} />
          <span className="text-xl font-extrabold tabular-nums text-coin">{projected ? projected.coinsAwarded : dash}</span>
          <span className="text-xs text-subtle">{projected ? `von max. ${projected.maxCoinsAwarded}` : ""}</span>
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3"><div className="h-full rounded-full bg-coin" style={{ width: `${pct}%` }} /></div>
        <p className="mt-2 text-xs text-muted">
          {projected ? <>{projected.tierLabel ?? "Noch keine Stufe"} · Bonus ×{formatFixed(projected.voteBonusMultiplier, 1)}</> : payLoaded ? "Gehalt gerade nicht abrufbar" : "…"}
        </p>
        {daily && (
          <p className={`mt-0.5 text-xs ${daily.remaining > 0 ? "text-subtle" : "text-warning"}`}
            title="Pro Tag zählen so viele Beiträge fürs Gehalt. Weitere sind erlaubt, zählen aber nicht.">
            Heute gezählt: {daily.used}/{daily.limit} Beiträge
          </p>
        )}
      </section>

      {/* Für dich zu tun */}
      <section className="rounded-card border border-line bg-surface p-4 shadow-card">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-subtle">Für dich zu tun</h2>
        {recs === null ? (
          <p className="mt-2 text-xs text-subtle">Lädt …</p>
        ) : shown.length === 0 ? (
          <p className="mt-2 text-xs text-muted">Gerade nichts offen — teil einfach, was dir gefällt.</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {shown.map(e => (
              <li key={e.eventId} className="group flex items-center gap-1">
                <button type="button" disabled={e.noCreate} onClick={() => onCompose(requestFor(e))}
                  className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-control px-2 text-left transition-colors hover:bg-surface-2 disabled:cursor-default disabled:hover:bg-transparent">
                  {iconFor(e)}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-fg">{e.title}</span>
                    <span className={`block truncate text-xs ${e.urgent ? "text-warning" : "text-subtle"}`}>{e.urgency ? `${e.urgency} · ` : ""}{e.reason}</span>
                  </span>
                  {!e.noCreate && <ChevronRight className="size-4 shrink-0 text-subtle" />}
                </button>
                <button type="button" onClick={() => dismiss(e.eventId)} aria-label="Ausblenden" title="Nicht relevant — ausblenden"
                  className="grid size-8 shrink-0 place-items-center rounded-control text-subtle opacity-0 transition-opacity hover:text-danger focus-visible:opacity-100 group-hover:opacity-100">
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {(recs?.length ?? 0) > MAX_RECS && (
          <Link href="/community-board/buero" className="mt-2 inline-block text-xs font-semibold text-primary-fg hover:text-fg">
            +{(recs?.length ?? 0) - MAX_RECS} weitere im Büro
          </Link>
        )}
      </section>

      {/* Coaching */}
      <section className="rounded-card border border-line bg-surface p-4 shadow-card">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-subtle">Coaching</h2>
          <Link href="/community-board/buero?job=coach" className="text-xs font-semibold text-primary-fg hover:text-fg">Öffnen</Link>
        </div>
        <p className="mt-2 flex items-center gap-2 text-sm text-fg">
          <span className={`size-2 rounded-full ${coachOn ? "bg-success" : "bg-line-strong"}`} />
          {coachOn ? <>Du hilfst gerade · bis {formatBerlinDateTime(coachUntil!, { timeStyle: "short" })}</> : "Gerade nicht als Helfer verfügbar"}
        </p>
        <p className="mt-1 text-xs text-subtle">Termine, Hilfe-Anfragen, Mentees und Anleitungen</p>
      </section>

      <Link href="/community-board/buero"
        className="flex min-h-11 items-center justify-between rounded-card border border-line bg-surface px-4 text-sm font-semibold text-fg shadow-card transition-colors hover:border-line-strong">
        <span className="flex items-center gap-2"><CalendarDays className="size-4 text-subtle" /> Ganzes Büro öffnen</span>
        <ChevronRight className="size-4 text-subtle" />
      </Link>
    </div>
  );
}
