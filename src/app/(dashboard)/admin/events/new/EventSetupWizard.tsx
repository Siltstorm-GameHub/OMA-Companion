"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Check, Plus, Trash2 } from "lucide-react";
import { EventCategory, EventGenre } from "@prisma/client";
import GameNameInput from "@/components/GameNameInput";
import StatFieldEditor from "@/components/StatFieldEditor";

// ─── Types ────────────────────────────────────────────────────────────────────

type SeriesOption = {
  id: string;
  name: string;
  category: EventCategory | null;
  genre: EventGenre | null;
  placementRewardsJson: string | null;
  _count: { events: number };
};

type PollConfig = {
  label: string;
  question: string;
  coins: number;
  rankPoints: number;
  type: "player" | "spectator";
};

type PlacementReward = { place: number; coins: number; rankPoints: number };

// ─── Constants ────────────────────────────────────────────────────────────────

const STEP_LABELS = ["Typ & Kategorie", "Grunddaten", "Turnier", "Belohnungen", "Zusammenfassung"];

const CATEGORIES: { value: EventCategory; label: string; emoji: string; color: string; border: string; bg: string }[] = [
  { value: "competitive",     label: "Kompetitiv", emoji: "🏆", color: "text-red-400",    border: "border-red-500/40",    bg: "bg-red-500/10" },
  { value: "fun",             label: "Fun",        emoji: "🎉", color: "text-amber-400",  border: "border-amber-400/40",  bg: "bg-amber-500/10" },
  { value: "casual",          label: "Casual",     emoji: "🛋️", color: "text-emerald-400",border: "border-emerald-500/40",bg: "bg-emerald-500/10" },
  { value: "training",        label: "Training",   emoji: "🎓", color: "text-indigo-400", border: "border-indigo-500/40", bg: "bg-indigo-500/10" },
  { value: "community_event", label: "Community",  emoji: "🤝", color: "text-violet-400", border: "border-violet-500/40", bg: "bg-violet-500/10" },
  { value: "special",         label: "Special",    emoji: "⭐", color: "text-yellow-400", border: "border-yellow-400/40", bg: "bg-yellow-500/10" },
];

const GENRES: { value: EventGenre; label: string; icon: string }[] = [
  { value: "arcade",    label: "Arcade",     icon: "/Arcade Icon.png" },
  { value: "beat_em_up",label: "Beat-em-Up", icon: "/Beat-em-Up Icon.png" },
  { value: "sport",     label: "Sport",      icon: "/Sport Icon.png" },
  { value: "racing",    label: "Racing",     icon: "/Racing Icon.png" },
  { value: "shooter",   label: "Shooter",    icon: "/Shooter Icon.png" },
  { value: "community", label: "Community",  icon: "/Community Icon.png" },
];

const FORMATS: { value: string; label: string; desc: string; hasStat: boolean }[] = [
  { value: "single_elimination", label: "Single Elimination", desc: "Jede Niederlage scheidet aus", hasStat: false },
  { value: "double_elimination", label: "Double Elimination", desc: "Zweite Chance nach erster Niederlage", hasStat: false },
  { value: "round_robin",        label: "Round Robin",        desc: "Jeder spielt gegen jeden", hasStat: false },
  { value: "liga",               label: "Liga",               desc: "Mehrere Spieltage, Punkte akkumulieren", hasStat: false },
  { value: "ffa",                label: "Free for All",       desc: "Alle gegen alle, Statistiken entscheiden", hasStat: true },
  { value: "coop_stats",         label: "Kooperativ",         desc: "Team gegen Ziel, gemeinsame Stats", hasStat: true },
  { value: "avg_stats",          label: "Durchschnittswerte", desc: "Individuelle Stats werden gemittelt", hasStat: true },
];

const inputCls = "w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none";
const inputStyle = { background: "#0b1a17", border: "1px solid rgba(20,184,166,0.18)" };
const labelCls = "text-xs text-gray-500 mb-1 block";

// ─── Component ────────────────────────────────────────────────────────────────

export default function EventSetupWizard({ series }: { series: SeriesOption[] }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 1
  const [category, setCategory] = useState<EventCategory>("casual");
  const [eventType, setEventType] = useState<"community" | "tournament">("community");
  const [spectatorMode, setSpectatorMode] = useState(false);

  // Step 2
  const [title, setTitle] = useState("");
  const [startAt, setStartAt] = useState("");
  const [game, setGame] = useState("");
  const [genre, setGenre] = useState<EventGenre | null>(null);
  const [maxPlayers, setMaxPlayers] = useState("");
  const [description, setDescription] = useState("");
  const [discordChannelId, setDiscordChannelId] = useState("");
  const [seriesMode, setSeriesMode] = useState<"none" | "existing" | "new">("none");
  const [selectedSeriesId, setSelectedSeriesId] = useState("");
  const [newSeriesName, setNewSeriesName] = useState("");
  const [newSeriesDesc, setNewSeriesDesc] = useState("");

  // Step 3
  const [format, setFormat] = useState<string>("single_elimination");
  const [statFields, setStatFields] = useState<string[]>([]);
  const [ligaWinCoins, setLigaWinCoins] = useState(50);
  const [ligaDrawCoins, setLigaDrawCoins] = useState(20);

  // Step 4
  const [participationCoins, setParticipationCoins] = useState(10);
  const [participationRankPts, setParticipationRankPts] = useState(0);
  const [placements, setPlacements] = useState<PlacementReward[]>([
    { place: 1, coins: 500, rankPoints: 3 },
    { place: 2, coins: 250, rankPoints: 2 },
    { place: 3, coins: 100, rankPoints: 1 },
  ]);
  const [spectatorCoins, setSpectatorCoins] = useState(5);
  const [spectatorRankPts, setSpectatorRankPts] = useState(0);
  const [polls, setPolls] = useState<PollConfig[]>([]);

  const selectedSeries = series.find(s => s.id === selectedSeriesId);
  const formatObj = FORMATS.find(f => f.value === format);
  const hasStat = formatObj?.hasStat ?? false;
  const totalSteps = eventType === "tournament" ? 5 : 4; // skip step 3 if community

  function effectiveStep(display: number): number {
    // display step index maps to actual step (0=Typ, 1=Grunddaten, 2=Turnier[tournament only], 3=Belohnungen, 4=Summary)
    if (eventType !== "tournament" && display >= 2) return display + 1;
    return display;
  }

  const actualStep = effectiveStep(step);

  function canProceed(): boolean {
    if (actualStep === 0) return true;
    if (actualStep === 1) return title.trim().length > 0 && startAt.length > 0;
    if (actualStep === 2) return eventType === "tournament"; // always passable if shown
    return true;
  }

  function addPoll() {
    if (polls.length >= 3) return;
    setPolls(p => [...p, { label: "", question: "", coins: 50, rankPoints: 0, type: "player" }]);
  }

  function updatePoll(i: number, patch: Partial<PollConfig>) {
    setPolls(p => p.map((poll, idx) => idx === i ? { ...poll, ...patch } : poll));
  }

  function removePoll(i: number) {
    setPolls(p => p.filter((_, idx) => idx !== i));
  }

  async function handleSubmit() {
    if (!title || !startAt) return;
    setLoading(true);

    let seriesId: string | null = null;
    if (seriesMode === "existing" && selectedSeriesId) {
      seriesId = selectedSeriesId;
    } else if (seriesMode === "new" && newSeriesName.trim()) {
      const sRes = await fetch("/api/events/series", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSeriesName.trim(), description: newSeriesDesc.trim() || null, category }),
      });
      if (!sRes.ok) { toast.error("Fehler beim Erstellen der Eventreihe"); setLoading(false); return; }
      seriesId = (await sRes.json()).id;
    }

    const rewardsJson = {
      participationCoins,
      participationRankPts,
      placements,
    };

    const body: Record<string, unknown> = {
      title: title.trim(),
      startAt: new Date(startAt).toISOString(),
      game: game || null,
      genre: genre || null,
      category,
      maxPlayers: maxPlayers ? Number(maxPlayers) : null,
      description: description || null,
      type: eventType,
      seriesId,
      discordChannelId: discordChannelId || null,
      spectatorMode,
      spectatorRewardJson: spectatorMode ? { coins: spectatorCoins, rankPoints: spectatorRankPts } : null,
      placementRewardsJson: rewardsJson,
      pollsConfigJson: polls.length > 0 ? polls : null,
    };

    if (eventType === "tournament") {
      body.format = format;
      if (hasStat) body.statFields = JSON.stringify(statFields);
    }

    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setLoading(false);
    if (!res.ok) { toast.error("Fehler beim Erstellen"); return; }
    const event = await res.json();
    toast.success("Event erfolgreich erstellt!");
    router.push(`/admin/events/${event.id}`);
  }

  // ─── Render helpers ──────────────────────────────────────────────────────────

  function StepIndicator() {
    const labels = eventType === "tournament"
      ? STEP_LABELS
      : STEP_LABELS.filter((_, i) => i !== 2);
    return (
      <div className="flex items-center gap-2 mb-8">
        {labels.map((label, i) => {
          const active = i === step;
          const done = i < step;
          return (
            <div key={i} className="flex items-center gap-2">
              <div className={`flex items-center gap-2 ${active || done ? "" : "opacity-40"}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  done ? "bg-teal-500 text-white" : active ? "bg-teal-500/20 border-2 border-teal-500 text-teal-400" : "bg-white/5 border border-white/10 text-gray-500"
                }`}>
                  {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${active ? "text-teal-300" : done ? "text-gray-400" : "text-gray-600"}`}>{label}</span>
              </div>
              {i < labels.length - 1 && (
                <div className={`flex-1 h-px mx-1 ${i < step ? "bg-teal-500/50" : "bg-white/8"}`} style={{ width: 20 }} />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // ─── Steps ───────────────────────────────────────────────────────────────────

  function Step0() {
    const showSpectatorToggle = category === "competitive" || eventType === "tournament";
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-base font-semibold text-white mb-1">Kategorie</h2>
          <p className="text-xs text-gray-500 mb-4">Was erwartet die Community bei diesem Event?</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {CATEGORIES.map(cat => (
              <button key={cat.value} type="button" onClick={() => setCategory(cat.value)}
                className={`flex flex-col items-center gap-2 rounded-2xl p-4 border-2 transition-all ${
                  category === cat.value ? `${cat.border} ${cat.bg}` : "border-white/8 bg-white/3 hover:border-white/15"
                }`}>
                <span className="text-2xl">{cat.emoji}</span>
                <span className={`text-sm font-semibold ${category === cat.value ? cat.color : "text-gray-400"}`}>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-base font-semibold text-white mb-3">Event-Typ</h2>
          <div className="flex gap-3">
            {(["community", "tournament"] as const).map(t => (
              <button key={t} type="button" onClick={() => setEventType(t)}
                className={`flex-1 rounded-xl py-3 px-4 text-sm font-medium border-2 transition-all ${
                  eventType === t ? "border-teal-500/60 bg-teal-500/10 text-teal-300" : "border-white/8 bg-white/3 text-gray-400 hover:border-white/15"
                }`}>
                {t === "community" ? "🤝 Community-Event" : "⚔️ Turnier"}
              </button>
            ))}
          </div>
        </div>

        {showSpectatorToggle && (
          <div className="rounded-xl p-4 border" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div
                onClick={() => setSpectatorMode(v => !v)}
                className={`relative w-10 h-5 rounded-full transition-colors ${spectatorMode ? "bg-teal-500" : "bg-gray-700"}`}>
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${spectatorMode ? "translate-x-5" : ""}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-200">Zuschauer-Registrierung aktivieren</p>
                <p className="text-xs text-gray-500">Community-Mitglieder können sich als Zuschauer anmelden und Belohnungen erhalten</p>
              </div>
            </label>
          </div>
        )}
      </div>
    );
  }

  function Step1() {
    return (
      <div className="space-y-4">
        <div>
          <label className={labelCls}>Titel *</label>
          <input type="text" required value={title} onChange={e => setTitle(e.target.value)}
            placeholder="z.B. OMA Turnier Night" className={inputCls} style={inputStyle} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Datum & Uhrzeit *</label>
            <input type="datetime-local" required value={startAt} onChange={e => setStartAt(e.target.value)}
              className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className={labelCls}>Max. Spieler</label>
            <input type="number" min="2" value={maxPlayers} onChange={e => setMaxPlayers(e.target.value)}
              placeholder="unbegrenzt" className={inputCls} style={inputStyle} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Spiel</label>
          <GameNameInput value={game} onChange={setGame}
            placeholder="z.B. Rocket League, R6 Siege …" className={inputCls} style={inputStyle} />
        </div>

        {game && (
          <div>
            <label className={labelCls}>Genre</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {GENRES.map(g => (
                <button key={g.value} type="button" onClick={() => setGenre(genre === g.value ? null : g.value)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl p-2 border transition-all ${
                    genre === g.value ? "border-teal-500/60 bg-teal-500/10" : "border-white/8 bg-white/3 hover:border-white/15"
                  }`}>
                  <Image src={g.icon} alt={g.label} width={32} height={32} className="object-contain" />
                  <span className={`text-[10px] font-medium leading-tight text-center ${genre === g.value ? "text-teal-300" : "text-gray-500"}`}>{g.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className={labelCls}>Beschreibung (optional)</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            rows={2} placeholder="Wird in Discord angezeigt"
            className={`${inputCls} resize-none`} style={inputStyle} />
        </div>

        <div>
          <label className={labelCls}>Discord-Textkanal ID (optional)</label>
          <input type="text" value={discordChannelId} onChange={e => setDiscordChannelId(e.target.value)}
            placeholder="Leer = Standardkanal" className={inputCls} style={inputStyle} />
          <p className="text-[10px] text-gray-600 mt-1">Der Bot postet Ankündigungen und Ergebnisse in diesen Kanal.</p>
        </div>

        <div className="rounded-xl p-3 space-y-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(20,184,166,0.10)" }}>
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Eventreihe</p>
          <div className="flex gap-2 flex-wrap">
            {(["none", "existing", "new"] as const).map(m => (
              <button key={m} type="button" onClick={() => setSeriesMode(m)}
                className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                style={seriesMode === m
                  ? { background: "rgba(20,184,166,0.18)", border: "1px solid rgba(20,184,166,0.35)", color: "#2dd4bf" }
                  : { background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "#6b7280" }}>
                {m === "none" ? "Einzelevent" : m === "existing" ? "Bestehende Reihe" : "Neue Reihe"}
              </button>
            ))}
          </div>
          {seriesMode === "existing" && (
            <select value={selectedSeriesId} onChange={e => setSelectedSeriesId(e.target.value)}
              className={inputCls} style={inputStyle}>
              <option value="">– Reihe auswählen –</option>
              {series.map(s => <option key={s.id} value={s.id}>{s.name} ({s._count.events} Events)</option>)}
            </select>
          )}
          {seriesMode === "new" && (
            <div className="space-y-2">
              <input type="text" value={newSeriesName} onChange={e => setNewSeriesName(e.target.value)}
                placeholder="Name der Reihe" className={inputCls} style={inputStyle} />
              <input type="text" value={newSeriesDesc} onChange={e => setNewSeriesDesc(e.target.value)}
                placeholder="Kurze Beschreibung (optional)" className={inputCls} style={inputStyle} />
            </div>
          )}
        </div>
      </div>
    );
  }

  function Step2() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-base font-semibold text-white mb-1">Format</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FORMATS.map(f => (
              <button key={f.value} type="button" onClick={() => setFormat(f.value)}
                className={`flex flex-col items-start gap-1 rounded-xl p-3 border-2 transition-all text-left ${
                  format === f.value ? "border-amber-500/60 bg-amber-500/10" : "border-white/8 bg-white/3 hover:border-white/15"
                }`}>
                <span className={`text-sm font-semibold ${format === f.value ? "text-amber-300" : "text-gray-300"}`}>{f.label}</span>
                <span className="text-xs text-gray-500">{f.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {hasStat && (
          <div className="rounded-xl p-4 border border-amber-500/20 bg-amber-500/5">
            <p className="text-sm font-medium text-amber-300 mb-3">Stat-Felder</p>
            <StatFieldEditor fields={statFields} onChange={setStatFields} />
          </div>
        )}

        {format === "liga" && (
          <div className="rounded-xl p-4 border border-amber-500/20 bg-amber-500/5">
            <p className="text-sm font-medium text-amber-300 mb-3">Liga-Belohnungen</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Münzen pro Sieg</label>
                <input type="number" min="0" value={ligaWinCoins} onChange={e => setLigaWinCoins(Number(e.target.value))}
                  className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className={labelCls}>Münzen pro Unentschieden</label>
                <input type="number" min="0" value={ligaDrawCoins} onChange={e => setLigaDrawCoins(Number(e.target.value))}
                  className={inputCls} style={inputStyle} />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function Step3() {
    return (
      <div className="space-y-6">
        <div className="rounded-xl p-4 border border-white/8 bg-white/2">
          <div className="flex items-center gap-2 mb-3">
            <Image src="/Muenze Icon.png" alt="Münzen" width={20} height={20} />
            <p className="text-sm font-medium text-gray-200">Teilnahme-Belohnung</p>
          </div>
          <p className="text-[11px] text-gray-500 mb-3">Wird erst nach Event-Abschluss vergeben</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Münzen</label>
              <input type="number" min="0" value={participationCoins} onChange={e => setParticipationCoins(Number(e.target.value))}
                className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className={labelCls}>Rang-Punkte</label>
              <input type="number" min="0" value={participationRankPts} onChange={e => setParticipationRankPts(Number(e.target.value))}
                className={inputCls} style={inputStyle} />
            </div>
          </div>
        </div>

        <div className="rounded-xl p-4 border border-white/8 bg-white/2">
          <p className="text-sm font-medium text-gray-200 mb-3">Platzierungs-Belohnungen</p>
          <div className="space-y-2">
            {placements.map((p, i) => (
              <div key={p.place} className="flex items-center gap-3">
                <span className="text-sm w-5 shrink-0">{["🥇","🥈","🥉"][i]}</span>
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls}>Münzen</label>
                    <input type="number" min="0" value={p.coins}
                      onChange={e => setPlacements(prev => prev.map((pp, ii) => ii === i ? { ...pp, coins: Number(e.target.value) } : pp))}
                      className={inputCls} style={inputStyle} />
                  </div>
                  <div>
                    <label className={labelCls}>Rang-Punkte</label>
                    <input type="number" min="0" value={p.rankPoints}
                      onChange={e => setPlacements(prev => prev.map((pp, ii) => ii === i ? { ...pp, rankPoints: Number(e.target.value) } : pp))}
                      className={inputCls} style={inputStyle} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {spectatorMode && (
          <div className="rounded-xl p-4 border border-teal-500/20 bg-teal-500/5">
            <p className="text-sm font-medium text-teal-300 mb-3">👁️ Zuschauer-Basis-Belohnung</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Münzen</label>
                <input type="number" min="0" value={spectatorCoins} onChange={e => setSpectatorCoins(Number(e.target.value))}
                  className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className={labelCls}>Rang-Punkte</label>
                <input type="number" min="0" value={spectatorRankPts} onChange={e => setSpectatorRankPts(Number(e.target.value))}
                  className={inputCls} style={inputStyle} />
              </div>
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-200">Umfragen</p>
            {polls.length < 3 && (
              <button type="button" onClick={addPoll}
                className="flex items-center gap-1 text-xs text-teal-400 hover:text-teal-300 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Hinzufügen
              </button>
            )}
          </div>
          {polls.length === 0 && <p className="text-xs text-gray-600">Keine Umfragen konfiguriert.</p>}
          <div className="space-y-3">
            {polls.map((poll, i) => (
              <div key={i} className="rounded-xl p-4 border border-violet-500/20 bg-violet-500/5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-violet-300">Umfrage {i + 1}</p>
                  <button type="button" onClick={() => removePoll(i)} className="text-gray-600 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls}>Label (z.B. MVP)</label>
                    <input type="text" value={poll.label} onChange={e => updatePoll(i, { label: e.target.value })}
                      placeholder="MVP" className={inputCls} style={inputStyle} />
                  </div>
                  <div>
                    <label className={labelCls}>Typ</label>
                    <select value={poll.type} onChange={e => updatePoll(i, { type: e.target.value as "player" | "spectator" })}
                      className={inputCls} style={inputStyle}>
                      <option value="player">Spieler-Poll</option>
                      <option value="spectator">Zuschauer-Poll</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Frage</label>
                  <input type="text" value={poll.question} onChange={e => updatePoll(i, { question: e.target.value })}
                    placeholder="Wer war der MVP?" className={inputCls} style={inputStyle} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls}>Münzen (Sieger)</label>
                    <input type="number" min="0" value={poll.coins} onChange={e => updatePoll(i, { coins: Number(e.target.value) })}
                      className={inputCls} style={inputStyle} />
                  </div>
                  <div>
                    <label className={labelCls}>Rang-Punkte</label>
                    <input type="number" min="0" value={poll.rankPoints} onChange={e => updatePoll(i, { rankPoints: Number(e.target.value) })}
                      className={inputCls} style={inputStyle} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function Step4() {
    const catCfg = CATEGORIES.find(c => c.value === category);
    const genreCfg = genre ? GENRES.find(g => g.value === genre) : null;
    return (
      <div className="space-y-4">
        <div className={`rounded-2xl p-5 border-2 ${catCfg?.border ?? ""} ${catCfg?.bg ?? ""}`}>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">{catCfg?.emoji}</span>
            <div>
              <p className={`text-lg font-bold ${catCfg?.color}`}>{title}</p>
              <p className="text-xs text-gray-500">{catCfg?.label} · {eventType === "tournament" ? "Turnier" : "Community-Event"}</p>
            </div>
          </div>
          <div className="space-y-1 text-sm text-gray-300">
            {startAt && <p>📅 {new Date(startAt).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" })}</p>}
            {game && <p>🎮 {game} {genreCfg ? `· ${genreCfg.label}` : ""}</p>}
            {maxPlayers && <p>👥 Max. {maxPlayers} Spieler</p>}
            {spectatorMode && <p>👁️ Zuschauer-Modus aktiv</p>}
            {eventType === "tournament" && <p>⚔️ Format: {FORMATS.find(f => f.value === format)?.label}</p>}
            {seriesMode === "existing" && selectedSeries && <p>🔁 Reihe: {selectedSeries.name}</p>}
            {seriesMode === "new" && newSeriesName && <p>🔁 Neue Reihe: {newSeriesName}</p>}
            {discordChannelId && <p>📢 Kanal: {discordChannelId}</p>}
          </div>
        </div>

        <div className="rounded-xl p-4 border border-white/8 bg-white/2 text-sm space-y-1.5 text-gray-400">
          <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider mb-2">Belohnungen</p>
          <p>✅ Teilnahme: {participationCoins} Münzen{participationRankPts > 0 ? ` + ${participationRankPts} RP` : ""}</p>
          {placements.map(p => (
            <p key={p.place}>🏅 {p.place}. Platz: {p.coins} Münzen{p.rankPoints > 0 ? ` + ${p.rankPoints} RP` : ""}</p>
          ))}
          {spectatorMode && <p>👁️ Zuschauer: {spectatorCoins} Münzen{spectatorRankPts > 0 ? ` + ${spectatorRankPts} RP` : ""}</p>}
          {polls.map((poll, i) => (
            <p key={i}>📊 {poll.label || `Poll ${i + 1}`}: {poll.coins} Münzen ({poll.type === "spectator" ? "Zuschauer" : "Spieler"})</p>
          ))}
        </div>
      </div>
    );
  }

  const steps = eventType === "tournament"
    ? [Step0, Step1, Step2, Step3, Step4]
    : [Step0, Step1, Step3, Step4];

  const CurrentStep = steps[step];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Neues Event erstellen</h1>
        <p className="text-sm text-gray-500">Schritt {step + 1} von {totalSteps}</p>
      </div>

      <StepIndicator />

      <div className="rounded-2xl p-6 mb-6" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <CurrentStep />
      </div>

      <div className="flex gap-3">
        {step > 0 && (
          <button type="button" onClick={() => setStep(s => s - 1)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm text-gray-400 border border-white/10 hover:border-white/20 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Zurück
          </button>
        )}
        <button
          type="button"
          disabled={!canProceed() || loading}
          onClick={() => {
            if (step < steps.length - 1) setStep(s => s + 1);
            else handleSubmit();
          }}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #0d9488, #14b8a6)" }}>
          {loading ? "Wird erstellt…" : step < steps.length - 1 ? (<>Weiter <ChevronRight className="w-4 h-4" /></>) : (<><Check className="w-4 h-4" /> Event erstellen</>)}
        </button>
      </div>
    </div>
  );
}
