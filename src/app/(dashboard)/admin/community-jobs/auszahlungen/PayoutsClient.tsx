"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatBerlinDate, formatBerlinDateTime } from "@/lib/time";
import { getCommunityJob } from "@/lib/community-jobs";

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Fehlgeschlagen");
  return data as T;
}

interface Week { weekStart: string; totalCoins: number; jobs: { jobKey: string; label: string; paid: number; coins: number; zero: number; tiers: { label: string; count: number }[] }[] }
interface Preview {
  weekStart: string; weekEnd: string; pendingCoins: number; pendingCount: number;
  rows: { user: string; jobKey: string; alreadyPaid: boolean; coins: number; score: number | null; tier: string | null }[];
}
interface Run { id: string; ranAt: string; durationMs: number; hadError: boolean; result: string }

const LABEL = "text-[10px] font-semibold text-gray-500 uppercase tracking-widest";

export default function PayoutsClient() {
  const [weeks, setWeeks] = useState<Week[] | null>(null);
  const [runs, setRuns] = useState<Run[] | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [runBusy, setRunBusy] = useState(false);
  const [openRun, setOpenRun] = useState<string | null>(null);

  function reload() {
    api<{ weeks: Week[] }>("/api/admin/community-jobs/overview?part=payouts").then(d => setWeeks(d.weeks)).catch(() => setWeeks([]));
    api<{ runs: Run[] }>("/api/admin/community-jobs/overview?part=cron").then(d => setRuns(d.runs)).catch(() => setRuns([]));
  }
  useEffect(reload, []);

  async function loadPreview() {
    setPreviewBusy(true);
    try { setPreview(await api<Preview>("/api/admin/community-jobs/overview?part=preview")); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Fehlgeschlagen"); }
    finally { setPreviewBusy(false); }
  }

  async function runNow() {
    if (!preview) { toast.error("Bitte zuerst die Vorschau laden."); return; }
    if (!confirm(`Jetzt ${preview.pendingCount} Auszahlungen mit zusammen ${preview.pendingCoins} Münzen ausführen?`)) return;
    setRunBusy(true);
    try {
      const r = await api<{ paid: number; skipped: number; failed: number }>("/api/admin/community-jobs/payout-run", { method: "POST" });
      toast.success(`${r.paid} ausgezahlt, ${r.skipped} übersprungen${r.failed ? `, ${r.failed} fehlgeschlagen` : ""}`);
      setPreview(null);
      reload();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Fehlgeschlagen"); }
    finally { setRunBusy(false); }
  }

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h2 className={LABEL}>Nächster Lauf (Vorschau)</h2>
        <div className="glass rounded-xl p-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" loading={previewBusy} onClick={loadPreview}>Vorschau berechnen</Button>
            <Button size="sm" variant="danger" loading={runBusy} disabled={!preview || preview.pendingCount === 0} onClick={runNow}>Jetzt ausführen (nur Admin)</Button>
            <span className="text-[11px] text-gray-500">Rechnet nur, schreibt nichts. „Ausführen“ zahlt nur noch nicht ausgezahlte Mitglieder.</span>
          </div>
          {preview && (
            <>
              <p className="text-xs text-gray-300">
                Woche {formatBerlinDate(preview.weekStart)} – {formatBerlinDate(new Date(new Date(preview.weekEnd).getTime() - 1))}:{" "}
                <span className="text-white font-semibold">{preview.pendingCount}</span> offen, zusammen <span className="text-white font-semibold">{preview.pendingCoins}</span> Münzen
              </p>
              <div className="max-h-72 overflow-y-auto divide-y divide-white/[0.04]">
                {preview.rows.map((r, i) => (
                  <div key={i} className="py-1.5 flex items-center justify-between gap-3 text-xs">
                    <span className="text-gray-200 truncate">{r.user} <span className="text-gray-600">· {getCommunityJob(r.jobKey)?.label ?? r.jobKey}</span></span>
                    <span className="shrink-0 text-gray-400">
                      {r.alreadyPaid ? <Badge tone="neutral">bereits gezahlt · {r.coins}</Badge>
                        : <>Score {r.score ?? "–"} · {r.tier ?? "keine Stufe"} · <span className="text-white">{r.coins}</span></>}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className={LABEL}>Täglicher Lauf (letzte 10)</h2>
        <div className="glass rounded-xl overflow-hidden divide-y divide-white/[0.04]">
          {runs === null && <div className="p-4"><Loader2 className="w-4 h-4 text-teal-400 animate-spin" /></div>}
          {runs?.length === 0 && <p className="p-4 text-xs text-gray-600">Noch kein Lauf protokolliert (wird ab dem nächsten Cron-Lauf aufgezeichnet).</p>}
          {runs?.map(r => (
            <div key={r.id} className="p-3 space-y-1">
              <button onClick={() => setOpenRun(cur => (cur === r.id ? null : r.id))} aria-expanded={openRun === r.id} className="w-full flex items-center justify-between gap-2 text-left">
                <span className="text-xs text-gray-200">{formatBerlinDateTime(r.ranAt, { dateStyle: "short", timeStyle: "short" })} · {(r.durationMs / 1000).toFixed(1)} s</span>
                <Badge tone={r.hadError ? "danger" : "success"}>{r.hadError ? "Fehler" : "OK"}</Badge>
              </button>
              {openRun === r.id && <pre className="text-[10px] text-gray-400 whitespace-pre-wrap break-all bg-black/30 rounded p-2">{r.result}</pre>}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className={LABEL}>Auszahlungen je Woche</h2>
        {weeks === null && <Loader2 className="w-4 h-4 text-teal-400 animate-spin" />}
        {weeks?.length === 0 && <p className="text-xs text-gray-600">Noch keine Auszahlungen.</p>}
        {weeks?.map(w => (
          <div key={w.weekStart} className="glass rounded-xl p-3 space-y-2">
            <p className="text-xs text-white font-semibold">Woche ab {formatBerlinDate(w.weekStart)} <span className="text-gray-500 font-normal">· {w.totalCoins} Münzen gesamt</span></p>
            <div className="space-y-1.5">
              {w.jobs.map(j => (
                <div key={j.jobKey} className="text-xs flex flex-wrap items-center justify-between gap-2">
                  <span className="text-gray-200">{j.label} <span className="text-gray-500">· {j.paid} {j.paid === 1 ? "Mitglied" : "Mitglieder"}, {j.coins} Münzen{j.zero > 0 ? `, ${j.zero} ohne Gehalt` : ""}</span></span>
                  <span className="flex flex-wrap gap-1">
                    {j.tiers.map(t => <span key={t.label} className="text-[10px] text-gray-400 bg-white/[0.05] rounded-full px-2 py-0.5">{t.label}: {t.count}</span>)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
