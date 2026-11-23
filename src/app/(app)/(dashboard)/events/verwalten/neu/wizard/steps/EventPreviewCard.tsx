"use client";
import GameCover from "@/components/GameCover";
import CoinIcon from "@/components/CoinIcon";
import { Users } from "@/components/icons";
import { formatBerlinDateTime, fromDatetimeLocalBerlin } from "@/lib/time";
import type { EventWizard } from "../useEventWizard";

/**
 * Live-Vorschau im Assistenten: so ungefähr sieht die Event-Karte für Mitglieder aus (Cover, Titel,
 * Termin, Plätze, Belohnung). Aktualisiert sich bei jeder Eingabe.
 */
export default function EventPreviewCard({ w }: { w: EventWizard }) {
  const start = w.startAt ? safeDate(w.startAt) : null;
  const first = w.placements.find(p => p.place === 1);
  const coins = Number(w.participationCoins) || 0;
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wide text-subtle">Vorschau für Mitglieder</p>
      <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
        <div className="relative aspect-[16/9]">
          <GameCover game={w.game || null} coverUrl={w.eventCoverUrl || null} className="absolute inset-0 h-full w-full" rounded="rounded-none" imgClassName="h-full w-full object-cover" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-canvas/90 via-canvas/20 to-transparent" />
          {start && (
            <span className="absolute left-2 top-2 rounded-control bg-canvas/90 px-2 py-1 text-center leading-tight shadow-card">
              <span className="block text-[10px] font-bold uppercase text-muted">{formatBerlinDateTime(start, { weekday: "short" })}</span>
              <span className="block text-base font-extrabold text-fg tabular-nums">{formatBerlinDateTime(start, { day: "numeric" })}</span>
            </span>
          )}
        </div>
        <div className="space-y-1.5 p-3">
          <p className={`line-clamp-2 text-sm font-extrabold ${w.title.trim() ? "text-fg" : "text-subtle italic"}`}>{w.title.trim() || "Titel des Events"}</p>
          <p className="text-xs text-muted">
            {start ? `${formatBerlinDateTime(start, { weekday: "long", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" })} Uhr` : "Termin fehlt noch"}
            {w.game && <> · {w.game}</>}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="inline-flex items-center gap-1 rounded-full bg-surface-3 px-2 py-0.5 text-xs font-semibold text-muted">
              <Users className="size-3" /> 0{w.maxPlayers ? `/${w.maxPlayers}` : ""}
            </span>
            {first && first.coins > 0
              ? <span className="inline-flex items-center gap-1 rounded-full bg-coin-soft px-2 py-0.5 text-xs font-bold text-coin">Platz 1: <CoinIcon size={11} />{first.coins}</span>
              : coins > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-coin-soft px-2 py-0.5 text-xs font-bold text-coin">+{coins} <CoinIcon size={11} /> fürs Mitmachen</span>}
          </div>
          <span className="mt-1 inline-flex min-h-9 w-full items-center justify-center rounded-control bg-primary text-sm font-bold text-primary-ink opacity-90">Anmelden</span>
        </div>
      </div>
    </div>
  );
}

function safeDate(local: string): Date | null {
  try { const d = fromDatetimeLocalBerlin(local); return Number.isNaN(d.getTime()) ? null : d; } catch { return null; }
}
