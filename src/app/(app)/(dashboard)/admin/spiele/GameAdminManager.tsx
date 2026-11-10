"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import GameCover from "@/components/GameCover";
import GameFieldsForm from "@/components/games/GameFieldsForm";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useConfirm } from "@/components/admin/ConfirmDialog";
import { Check, Download, ExternalLink, Eye, EyeOff, GitBranch, Pencil, RefreshCw, Search, Trash2 } from "@/components/icons";
import type { GameFields } from "@/lib/games/draft";
import { MAX_GAME_NAME_LENGTH } from "@/lib/games/options";

export interface AdminGame {
  id: string;
  slug: string;
  name: string;
  status: "APPROVED" | "PENDING" | "HIDDEN";
  steamAppId: number | null;
  coverUrl: string | null;
  fields: GameFields;
  ratingCount: number;
  wantCount: number;
  enriched: boolean;
  addedBy: string | null;
  createdAt: string;
}

type View = "PENDING" | "APPROVED" | "HIDDEN" | "ALL";
const VIEW_LABELS: Record<View, string> = { PENDING: "Wartet", APPROVED: "Freigeschaltet", HIDDEN: "Ausgeblendet", ALL: "Alle" };
const STATUS_BADGE: Record<AdminGame["status"], { tone: "success" | "warning" | "neutral"; label: string }> = {
  APPROVED: { tone: "success", label: "Freigeschaltet" },
  PENDING:  { tone: "warning", label: "Wartet" },
  HIDDEN:   { tone: "neutral", label: "Ausgeblendet" },
};

async function call(url: string, init?: RequestInit) {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Fehlgeschlagen");
  return data;
}

function Editor({ game, onDone }: { game: AdminGame; onDone: () => void }) {
  const router = useRouter();
  const [name, setName] = useState(game.name);
  const [steamAppId, setSteamAppId] = useState(game.steamAppId?.toString() ?? "");
  const [fields, setFields] = useState<GameFields>(game.fields);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await call(`/api/admin/games/${game.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name, steamAppId: steamAppId.trim() === "" ? null : steamAppId.trim(), fields }),
      });
      toast.success("Gespeichert");
      onDone();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  }

  const input = "bg-white/[0.04] border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-teal-500/40";
  return (
    <div className="border-t border-white/[0.06] p-4 space-y-5 bg-black/20">
      <div className="grid sm:grid-cols-[1fr_10rem] gap-3">
        <label className="space-y-1">
          <span className="text-xs font-semibold text-gray-300">Name</span>
          <input value={name} onChange={e => setName(e.target.value.slice(0, MAX_GAME_NAME_LENGTH))} className={`${input} w-full`} />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-semibold text-gray-300">Steam-App-ID</span>
          <input value={steamAppId} onChange={e => setSteamAppId(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="z.B. 252950" className={`${input} w-full`} />
        </label>
      </div>
      <p className="text-[11px] text-gray-500 -mt-3">Geänderte Steam-ID → Cover und Steam-Angaben werden neu geladen. Was du hier änderst, überschreibt Steam später nicht mehr.</p>
      <GameFieldsForm value={fields} onChange={setFields} showDescription />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>Abbrechen</Button>
        <Button onClick={save} loading={saving} icon={<Check className="w-4 h-4" />}>Speichern</Button>
      </div>
    </div>
  );
}

export default function GameAdminManager({ games, initialEditId }: { games: AdminGame[]; initialEditId: string | null }) {
  const router = useRouter();
  const { confirm, ConfirmDialogElement } = useConfirm();
  const pendingCount = games.filter(g => g.status === "PENDING").length;
  const [view, setView] = useState<View>(initialEditId ? "ALL" : pendingCount > 0 ? "PENDING" : "ALL");
  const [q, setQ] = useState("");
  const [editId, setEditId] = useState<string | null>(initialEditId);
  const [mergeFor, setMergeFor] = useState<string | null>(null);
  const [mergeTarget, setMergeTarget] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [enrichProgress, setEnrichProgress] = useState<string | null>(null);

  const notEnriched = games.filter(g => !g.enriched && g.status !== "HIDDEN").length;
  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return games.filter(g => (view === "ALL" || g.status === view) && (!needle || g.name.toLowerCase().includes(needle)));
  }, [games, view, q]);

  async function act(id: string, fn: () => Promise<void>) {
    setBusy(id);
    try { await fn(); router.refresh(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Fehlgeschlagen"); }
    finally { setBusy(null); }
  }

  const setStatus = (g: AdminGame, status: AdminGame["status"]) => act(g.id, async () => {
    await call(`/api/admin/games/${g.id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    toast.success(status === "APPROVED" ? `${g.name} freigeschaltet` : status === "HIDDEN" ? `${g.name} ausgeblendet` : "Gespeichert");
  });

  const refresh = (g: AdminGame) => act(g.id, async () => {
    const { outcome } = await call(`/api/admin/games/${g.id}/refresh`, { method: "POST" });
    if (outcome === "enriched") toast.success("Steam-Daten aktualisiert");
    else if (outcome === "not_found") toast.info("Bei Steam nichts Passendes gefunden — Steam-ID ggf. von Hand eintragen.");
    else toast.error("Steam nicht erreichbar");
  });

  async function remove(g: AdminGame) {
    if (!(await confirm({ title: "Spiel löschen", description: `${g.name} mit allen Bewertungen löschen?`, variant: "danger" }))) return;
    await act(g.id, async () => { await call(`/api/admin/games/${g.id}`, { method: "DELETE" }); toast.success("Gelöscht"); });
  }

  async function merge(g: AdminGame) {
    const target = games.find(x => x.id === mergeTarget);
    if (!target) return;
    if (!(await confirm({
      title: "Zusammenführen",
      description: `„${g.name}“ in „${target.name}“ aufgehen lassen? Bewertungen wandern mit, „${g.name}“ wird gelöscht.`,
      variant: "danger",
    }))) return;
    await act(g.id, async () => {
      await call(`/api/admin/games/${g.id}/merge`, { method: "POST", body: JSON.stringify({ targetId: target.id }) });
      toast.success("Zusammengeführt");
      setMergeFor(null);
      setMergeTarget("");
    });
  }

  async function importCommunity() {
    setBusy("import");
    try {
      const { created } = await call("/api/admin/games/import", { method: "POST" });
      toast.success(created > 0 ? `${created} Spiele übernommen — jetzt Steam-Daten nachladen` : "Keine neuen Spiele gefunden");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import fehlgeschlagen");
    } finally {
      setBusy(null);
    }
  }

  async function enrichAll() {
    setBusy("enrich");
    let done = 0;
    try {
      // In Durchgängen à 8 Spielen, bis nichts mehr offen ist (oder nur noch Steam-Fehler übrig sind)
      for (;;) {
        const r = await call("/api/admin/games/enrich", { method: "POST" }) as { processed: number; enriched: number; error: number; remaining: number };
        done += r.enriched;
        setEnrichProgress(`${done} ergänzt · ${r.remaining} offen`);
        if (r.remaining === 0 || r.processed === 0 || r.error === r.processed) {
          if (r.error > 0 && r.error === r.processed) toast.error("Steam antwortet gerade nicht — später nochmal versuchen.");
          break;
        }
      }
      toast.success(`Steam-Abgleich fertig: ${done} Spiele ergänzt`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Abgleich fehlgeschlagen");
    } finally {
      setBusy(null);
      setEnrichProgress(null);
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      {ConfirmDialogElement}

      {/* Werkzeuge */}
      <div className="surface rounded-2xl p-4 flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={importCommunity} loading={busy === "import"} icon={<Download className="w-4 h-4" />}>
          Aus Events & Profilen übernehmen
        </Button>
        <Button variant="outline" onClick={enrichAll} loading={busy === "enrich"} disabled={notEnriched === 0} icon={<RefreshCw className="w-4 h-4" />}>
          Steam-Daten nachladen{notEnriched > 0 ? ` (${notEnriched} offen)` : ""}
        </Button>
        {enrichProgress && <span className="text-xs text-gray-400">{enrichProgress}</span>}
        <p className="basis-full text-[11px] text-gray-500">
          Übernehmen sammelt alle Spiele, die schon in Events, Liga-Spieltagen, Gameservern, Lieblingsspielen und Spiele-Ideen stehen.
          Danach ergänzt der Steam-Abgleich Cover, Beschreibung und Angaben (nur bei eindeutigem Namens-Treffer).
        </p>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap items-center gap-2">
        {(Object.keys(VIEW_LABELS) as View[]).map(v => (
          <button key={v} type="button" onClick={() => setView(v)} aria-pressed={view === v}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${view === v ? "bg-purple-600/20 border-purple-400/40 text-purple-200" : "border-white/[0.08] text-gray-400 hover:text-white"}`}>
            {VIEW_LABELS[v]}{v === "PENDING" && pendingCount > 0 ? ` (${pendingCount})` : ""}
          </button>
        ))}
        <div className="relative ml-auto">
          <Search className="w-3.5 h-3.5 text-gray-600 absolute left-2 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Suchen …" aria-label="Spiel suchen"
            className="w-48 bg-white/[0.04] border border-white/10 rounded-lg pl-7 pr-2 py-1.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-500/40" />
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-gray-500 py-8 text-center">{view === "PENDING" ? "Keine offenen Vorschläge." : "Keine Spiele."}</p>
      ) : (
        <div className="space-y-2">
          {visible.map(g => (
            <div key={g.id} className="surface rounded-2xl overflow-hidden">
              <div className="p-3 flex items-center gap-3 flex-wrap sm:flex-nowrap">
                <GameCover game={g.name} coverUrl={g.coverUrl} className="w-20 h-10" rounded="rounded-md" fallbackVariant="plain" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/spiele/${g.slug}`} className="font-semibold text-sm text-white hover:text-teal-300 truncate">{g.name}</Link>
                    <Badge tone={STATUS_BADGE[g.status].tone}>{STATUS_BADGE[g.status].label}</Badge>
                    {!g.enriched && g.status !== "HIDDEN" && <Badge tone="info">Steam offen</Badge>}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                    {g.steamAppId ? (
                      <a href={`https://store.steampowered.com/app/${g.steamAppId}/`} target="_blank" rel="noopener noreferrer" className="hover:text-gray-300 inline-flex items-center gap-0.5">
                        Steam {g.steamAppId} <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    ) : "ohne Steam"}
                    {" · "}{g.ratingCount} Bewertungen · {g.wantCount}× Würde ich zocken
                    {g.addedBy && ` · von ${g.addedBy}`}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  {g.status !== "APPROVED" && (
                    <Button size="sm" onClick={() => setStatus(g, "APPROVED")} loading={busy === g.id} icon={<Eye className="w-3.5 h-3.5" />}>Freischalten</Button>
                  )}
                  {g.status !== "HIDDEN" && (
                    <Button size="sm" variant="ghost" onClick={() => setStatus(g, "HIDDEN")} disabled={busy === g.id} icon={<EyeOff className="w-3.5 h-3.5" />}>Ausblenden</Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setEditId(editId === g.id ? null : g.id)} icon={<Pencil className="w-3.5 h-3.5" />}>Bearbeiten</Button>
                  <Button size="sm" variant="ghost" onClick={() => refresh(g)} disabled={busy === g.id} icon={<RefreshCw className="w-3.5 h-3.5" />} title="Steam-Daten neu laden">Steam</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setMergeFor(mergeFor === g.id ? null : g.id); setMergeTarget(""); }} icon={<GitBranch className="w-3.5 h-3.5" />} title="Dublette zusammenführen">Zusammenführen</Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(g)} disabled={busy === g.id} icon={<Trash2 className="w-3.5 h-3.5 text-red-400" />} aria-label="Löschen" />
                </div>
              </div>

              {mergeFor === g.id && (
                <div className="border-t border-white/[0.06] p-3 flex flex-wrap items-center gap-2 bg-black/20 text-xs text-gray-300">
                  <span>„{g.name}“ aufgehen lassen in:</span>
                  <select value={mergeTarget} onChange={e => setMergeTarget(e.target.value)} className="input-glass rounded-lg px-2 py-1.5 text-xs text-white max-w-xs">
                    <option value="">Spiel wählen …</option>
                    {games.filter(x => x.id !== g.id).sort((a, b) => a.name.localeCompare(b.name, "de")).map(x => (
                      <option key={x.id} value={x.id}>{x.name}</option>
                    ))}
                  </select>
                  <Button size="sm" variant="danger" onClick={() => merge(g)} disabled={!mergeTarget} loading={busy === g.id}>Zusammenführen</Button>
                </div>
              )}

              {editId === g.id && <Editor game={g} onDone={() => setEditId(null)} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
