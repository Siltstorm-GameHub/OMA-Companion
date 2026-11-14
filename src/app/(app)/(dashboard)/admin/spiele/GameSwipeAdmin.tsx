"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import GameCover from "@/components/GameCover";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Check, Flame, RefreshCw, Trash2, X } from "@/components/icons";
import type { AdminTip } from "@/lib/games/drop";

export interface AdminDropItem { key: string; name: string; coverUrl: string | null; label: string; tipBy: string | null; slug: string | null }
export interface AdminDrop { week: string; endsAt: string; items: AdminDropItem[] }

const fmt = (iso: string) => new Date(iso).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "Europe/Berlin" });

async function call(url: string, init?: RequestInit) {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Fehlgeschlagen");
  return data;
}

/** GameSwipe im Admin: Drop der Woche ansehen/neu zusammenstellen, Empfehlungen prüfen, Stand der Quellen. */
export default function GameSwipeAdmin({ drop, tips, feeds }: {
  drop: AdminDrop | null;
  tips: AdminTip[];
  feeds: { label: string; count: number }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function run(id: string, fn: () => Promise<unknown>, ok: string) {
    setBusy(id);
    try {
      await fn();
      toast.success(ok);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehlgeschlagen");
    } finally {
      setBusy(null);
    }
  }

  const rebuild = (refreshFeeds: boolean) =>
    run(refreshFeeds ? "feeds" : "drop", () => call("/api/admin/games/drop", { method: "POST", body: JSON.stringify({ refreshFeeds }) }),
      "Drop neu zusammengestellt");
  const review = (tip: AdminTip, action: "approve" | "reject") =>
    run(tip.id, () => call(`/api/admin/games/tips/${tip.id}`, { method: "PATCH", body: JSON.stringify({ action }) }),
      action === "approve" ? "Freigegeben — kommt in den nächsten Drop" : "Abgelehnt");
  const remove = (tip: AdminTip) =>
    run(tip.id, () => call(`/api/admin/games/tips/${tip.id}`, { method: "DELETE" }), "Empfehlung entfernt");

  const pending = tips.filter(t => t.status === "pending");
  const queued = tips.filter(t => t.status === "approved");
  const used = tips.filter(t => t.status === "used");

  return (
    <section className="surface rounded-2xl p-4 space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2"><Flame className="w-4 h-4 text-orange-400" /> GameSwipe: Drop der Woche</h2>
          <p className="text-xs text-gray-400 mt-1 max-w-xl">
            Jeden Montag entsteht automatisch ein Drop mit bis zu 8 Karten: zuerst freigegebene Empfehlungen, dann reihum Gratis-Aktionen,
            neu im Abo, Neuerscheinungen, Angebote und Trends. Neu zusammenstellen benachrichtigt niemanden erneut.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => rebuild(true)} disabled={busy !== null}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Quellen + Drop neu laden
          </Button>
          <Button size="sm" onClick={() => rebuild(false)} disabled={busy !== null}>Drop neu zusammenstellen</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {feeds.map(f => (
          <span key={f.label} className="text-[11px] px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-gray-300">
            {f.label}: <span className="text-white font-semibold">{f.count}</span>
          </span>
        ))}
      </div>

      {drop ? (
        <div className="space-y-2">
          <p className="text-xs text-gray-500">Woche {drop.week} · läuft bis {fmt(drop.endsAt)} · {drop.items.length} Karten</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {drop.items.map(i => {
              const body = (
                <>
                  <GameCover game={i.name} coverUrl={i.coverUrl} className="w-full aspect-[16/9]" rounded="rounded-lg" fallbackVariant="plain" />
                  <p className="text-xs font-semibold text-white mt-1.5 truncate">{i.name}</p>
                  <p className="text-[11px] text-gray-500 truncate">{i.tipBy ? `Empfohlen von ${i.tipBy}` : i.label}</p>
                </>
              );
              return i.slug
                ? <Link key={i.key} href={`/spiele/${i.slug}`} className="block hover:opacity-90">{body}</Link>
                : <div key={i.key}>{body}</div>;
            })}
          </div>
        </div>
      ) : (
        <p className="text-xs text-gray-500">Noch kein Drop für diese Woche — der tägliche Cron legt ihn an, oder oben neu zusammenstellen.</p>
      )}

      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Empfehlungen</h3>
        <p className="text-[11px] text-gray-500">
          Mitglieder empfehlen Spiele auf der Spielseite („Empfehlen“). Freigegebene kommen in den nächsten Drop (höchstens 3 je Woche).
        </p>
        {tips.length === 0 && <p className="text-xs text-gray-500">Noch keine Empfehlungen.</p>}
        {[...pending, ...queued, ...used].map(t => (
          <div key={t.id} className="flex items-center gap-3 rounded-xl bg-white/[0.02] border border-white/[0.06] px-3 py-2">
            <GameCover game={t.game.name} coverUrl={t.game.coverUrl} className="w-16 aspect-[16/9] shrink-0" rounded="rounded-md" fallbackVariant="plain" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">
                <Link href={`/spiele/${t.game.slug}`} className="hover:underline">{t.game.name}</Link>
                <span className="text-xs text-gray-500"> · von {t.by ?? "gelöschtem Konto"}</span>
              </p>
              {t.note && <p className="text-xs text-gray-400 truncate">„{t.note}“</p>}
            </div>
            {t.status === "pending" && <Badge tone="warning">Wartet</Badge>}
            {t.status === "approved" && <Badge tone="success">Nächster Drop</Badge>}
            {t.status === "used" && <Badge tone="neutral">Lief {t.usedWeek}</Badge>}
            {t.status === "pending" && (
              <>
                <button type="button" title="Freigeben" disabled={busy !== null} onClick={() => review(t, "approve")}
                  className="p-1.5 rounded-lg text-emerald-300 hover:bg-emerald-500/15 disabled:opacity-40"><Check className="w-4 h-4" /></button>
                <button type="button" title="Ablehnen" disabled={busy !== null} onClick={() => review(t, "reject")}
                  className="p-1.5 rounded-lg text-gray-400 hover:bg-white/[0.08] disabled:opacity-40"><X className="w-4 h-4" /></button>
              </>
            )}
            {t.status === "approved" && (
              <button type="button" title="Entfernen" disabled={busy !== null} onClick={() => remove(t)}
                className="p-1.5 rounded-lg text-gray-500 hover:text-rose-300 hover:bg-rose-500/10 disabled:opacity-40"><Trash2 className="w-4 h-4" /></button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
