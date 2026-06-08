"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, ChevronDown, ChevronUp, CalendarDays, Euro, Repeat } from "lucide-react";
import GameNameInput from "@/components/GameNameInput";


const inputCls = "w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none";
const inputStyle = { background: "#0b1a17", border: "1px solid rgba(20,184,166,0.18)" };

type Series = { id: string; name: string; _count: { events: number } };

export default function EventCreateForm() {
  const router = useRouter();
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);

  const [title, setTitle]             = useState("");
  const [startAt, setStartAt]         = useState("");
  const [game, setGame]               = useState("");
  const [maxPlayers, setMaxPlayers]   = useState("");
  const [pointReward, setPointReward] = useState("50");
  const [description, setDescription] = useState("");

  // Series
  const [seriesMode, setSeriesMode]       = useState<"none" | "existing" | "new">("none");
  const [seriesList, setSeriesList]       = useState<Series[]>([]);
  const [selectedSeries, setSelectedSeries] = useState("");
  const [newSeriesName, setNewSeriesName] = useState("");
  const [newSeriesDesc, setNewSeriesDesc] = useState("");

  useEffect(() => {
    if (open && seriesList.length === 0) {
      fetch("/api/events/series").then(r => r.json()).then(setSeriesList).catch(() => {});
    }
  }, [open, seriesList.length]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !startAt) return;
    setLoading(true);

    // Eventuell neue Reihe anlegen
    let seriesId: string | null = null;
    if (seriesMode === "existing" && selectedSeries) {
      seriesId = selectedSeries;
    } else if (seriesMode === "new" && newSeriesName.trim()) {
      const sRes = await fetch("/api/events/series", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSeriesName.trim(), description: newSeriesDesc.trim() || null }),
      });
      if (sRes.ok) {
        const s = await sRes.json();
        seriesId = s.id;
      } else {
        toast.error("Fehler beim Erstellen der Eventreihe");
        setLoading(false);
        return;
      }
    }

    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        startAt: new Date(startAt).toISOString(),
        game: game || null,
        maxPlayers: maxPlayers ? Number(maxPlayers) : null,
        pointReward: Number(pointReward) || 50,
        description: description || null,
        type: "community",
        seriesId,
      }),
    });
    setLoading(false);
    if (!res.ok) { toast.error("Fehler beim Erstellen"); return; }
    toast.success(seriesId ? "Event erstellt & zur Reihe hinzugefügt" : "Event erstellt und zu Discord gepusht");
    setTitle(""); setStartAt(""); setGame(""); setMaxPlayers(""); setPointReward("50"); setDescription("");
    setSeriesMode("none"); setSelectedSeries(""); setNewSeriesName(""); setNewSeriesDesc("");
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(20,184,166,0.18)", background: "rgba(20,184,166,0.04)" }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-teal-300 hover:bg-teal-500/5 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Neues Event erstellen
        </span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: "rgba(20,184,166,0.12)" }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">

            <div className="sm:col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Titel *</label>
              <input type="text" required value={title} onChange={e => setTitle(e.target.value)}
                placeholder="z.B. OMA Movie Night" className={inputCls} style={inputStyle} />
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Datum & Uhrzeit *</label>
              <input type="datetime-local" required value={startAt} onChange={e => setStartAt(e.target.value)}
                className={inputCls} style={inputStyle} />
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">Spiel</label>
              <GameNameInput
                value={game}
                onChange={setGame}
                placeholder="z.B. Rocket League, R6 Siege …"
                className={inputCls}
                style={inputStyle}
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">Max. Spieler</label>
              <input type="number" min="2" value={maxPlayers} onChange={e => setMaxPlayers(e.target.value)}
                placeholder="unbegrenzt" className={inputCls} style={inputStyle} />
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Euro className="w-3 h-3" /> Punkte-Belohnung</label>
              <input type="number" min="0" value={pointReward} onChange={e => setPointReward(e.target.value)}
                className={inputCls} style={inputStyle} />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Beschreibung (optional)</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                rows={2} placeholder="Wird auch in Discord angezeigt"
                className={`${inputCls} resize-none`} style={inputStyle} />
            </div>

            {/* ── Eventreihe ─────────────────────────────────────── */}
            <div className="sm:col-span-2 rounded-xl p-3 space-y-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(20,184,166,0.10)" }}>
              <label className="text-xs text-gray-400 flex items-center gap-1.5 font-semibold uppercase tracking-wider">
                <Repeat className="w-3.5 h-3.5 text-teal-400" /> Eventreihe
              </label>

              <div className="flex gap-2 flex-wrap">
                {(["none", "existing", "new"] as const).map(m => (
                  <button key={m} type="button" onClick={() => setSeriesMode(m)}
                    className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                    style={seriesMode === m
                      ? { background: "rgba(20,184,166,0.18)", border: "1px solid rgba(20,184,166,0.35)", color: "#2dd4bf" }
                      : { background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "#6b7280" }}>
                    {m === "none" ? "Kein (Einzelevent)" : m === "existing" ? "Bestehende Reihe" : "Neue Reihe erstellen"}
                  </button>
                ))}
              </div>

              {seriesMode === "existing" && (
                <select value={selectedSeries} onChange={e => setSelectedSeries(e.target.value)}
                  className={inputCls} style={inputStyle}>
                  <option value="">– Reihe auswählen –</option>
                  {seriesList.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s._count.events} Events)</option>
                  ))}
                </select>
              )}

              {seriesMode === "new" && (
                <div className="space-y-2">
                  <input type="text" value={newSeriesName} onChange={e => setNewSeriesName(e.target.value)}
                    placeholder="Name der Reihe, z.B. OMA Movie Night" className={inputCls} style={inputStyle} />
                  <input type="text" value={newSeriesDesc} onChange={e => setNewSeriesDesc(e.target.value)}
                    placeholder="Kurze Beschreibung (optional)" className={inputCls} style={inputStyle} />
                </div>
              )}
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-all"
            style={{ background: "linear-gradient(135deg, #0d9488, #14b8a6)", opacity: loading ? 0.6 : 1 }}>
            {loading ? "Wird erstellt..." : "Event erstellen"}
          </button>
        </form>
      )}
    </div>
  );
}
