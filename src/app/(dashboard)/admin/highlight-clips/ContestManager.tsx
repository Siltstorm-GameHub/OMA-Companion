"use client";
import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trophy, Clapperboard, ExternalLink, Loader2, Square, Link2, Plus, Pencil, Check, X } from "lucide-react";
import { useConfirm } from "@/components/admin/ConfirmDialog";

const MONTH_NAMES = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

type Nomination = {
  id: string;
  clipUrl: string;
  clipTitle: string | null;
  thumbnailUrl: string | null;
  submittedBy: { id: string; name: string | null; username: string | null } | null;
  twitchCreatorLogin: string | null;
  partnerTwitchLogin: string | null;
  _count: { votes: number };
};

type UserSearchResult = { id: string; name: string | null; username: string | null; image: string | null; twitchLogin: string | null };

type Contest = {
  id: string;
  month: number;
  year: number;
  status: string;
  rewardCoins: number;
  participationCoins: number;
  winnerNominationIds: string[];
  votingEndsAt: Date;
  nominations: Nomination[];
  _count: { votes: number };
};

export default function ContestManager({ contests }: { contests: Contest[] }) {
  const router = useRouter();
  const [items, setItems] = useState(contests);
  const [saving, setSaving] = useState<string | null>(null);
  const [finishing, setFinishing] = useState<string | null>(null);
  const [rewardInputs, setRewardInputs] = useState<Record<string, string>>(
    Object.fromEntries(contests.map((c) => [c.id, String(c.rewardCoins)]))
  );
  const [participationInputs, setParticipationInputs] = useState<Record<string, string>>(
    Object.fromEntries(contests.map((c) => [c.id, String(c.participationCoins)]))
  );
  const { confirm, ConfirmDialogElement } = useConfirm();

  // Nachträgliches Bearbeiten von Monat/Jahr (z.B. falsch erkannter Zeitraum bei Erstellung)
  const [editingPeriodId, setEditingPeriodId] = useState<string | null>(null);
  const [periodMonthInput, setPeriodMonthInput] = useState("");
  const [periodYearInput, setPeriodYearInput] = useState("");
  const [periodSaving, setPeriodSaving] = useState<string | null>(null);

  function startEditingPeriod(contest: Contest) {
    setEditingPeriodId(contest.id);
    setPeriodMonthInput(String(contest.month));
    setPeriodYearInput(String(contest.year));
  }

  function cancelEditingPeriod() {
    setEditingPeriodId(null);
  }

  async function savePeriod(contestId: string) {
    const month = parseInt(periodMonthInput);
    const year = parseInt(periodYearInput);
    if (isNaN(month) || month < 1 || month > 12 || isNaN(year) || year < 2000 || year > 2100) {
      toast.error("Ungültiger Monat/Jahr");
      return;
    }
    setPeriodSaving(contestId);
    const res = await fetch("/api/admin/clip-contest", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contestId, month, year }),
    });
    setPeriodSaving(null);
    if (res.ok) {
      setItems((prev) => prev.map((c) => (c.id === contestId ? { ...c, month, year } : c)));
      setEditingPeriodId(null);
      toast.success("Zeitraum aktualisiert");
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Fehler beim Speichern");
    }
  }

  // Manuelles Verknüpfen eines Gewinners ohne erkanntes Community-Konto
  const [linkingNominationId, setLinkingNominationId] = useState<string | null>(null);
  const [userSearchInput, setUserSearchInput] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<UserSearchResult[]>([]);
  const [userSearching, setUserSearching] = useState(false);
  const [linkSaving, setLinkSaving] = useState(false);

  function toggleLinking(nominationId: string) {
    setLinkingNominationId((prev) => (prev === nominationId ? null : nominationId));
    setUserSearchInput("");
    setUserSearchResults([]);
  }

  async function searchUsers(q: string) {
    if (!q.trim()) { setUserSearchResults([]); return; }
    setUserSearching(true);
    try {
      const res = await fetch(`/api/admin/users/search?q=${encodeURIComponent(q.trim())}`);
      if (!res.ok) return;
      const data = await res.json();
      setUserSearchResults(data.users ?? data ?? []);
    } catch {
      toast.error("Fehler bei der Nutzersuche");
    } finally {
      setUserSearching(false);
    }
  }

  async function linkWinner(contestId: string, nominationId: string, user: UserSearchResult) {
    setLinkSaving(true);
    try {
      const res = await fetch(`/api/admin/clip-contest/${contestId}/link-winner`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nominationId, userId: user.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Fehler beim Verknüpfen");
        return;
      }
      setItems((prev) =>
        prev.map((c) =>
          c.id !== contestId
            ? c
            : {
                ...c,
                nominations: c.nominations.map((n) =>
                  n.id === nominationId ? { ...n, submittedBy: { id: user.id, name: user.name, username: user.username } } : n
                ),
              }
        )
      );
      setLinkingNominationId(null);
      setUserSearchInput("");
      setUserSearchResults([]);
      toast.success(data.awarded ? "Konto verknüpft und Münzen vergeben" : "Konto verknüpft");
    } finally {
      setLinkSaving(false);
    }
  }

  async function saveRewards(contestId: string) {
    const rewardCoins = parseInt(rewardInputs[contestId] ?? "500");
    const participationCoins = parseInt(participationInputs[contestId] ?? "10");
    if (isNaN(rewardCoins) || rewardCoins < 0 || isNaN(participationCoins) || participationCoins < 0) {
      toast.error("Ungültiger Wert");
      return;
    }
    setSaving(contestId);
    const res = await fetch("/api/admin/clip-contest", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contestId, rewardCoins, participationCoins }),
    });
    setSaving(null);
    if (res.ok) {
      setItems((prev) => prev.map((c) => c.id === contestId ? { ...c, rewardCoins, participationCoins } : c));
      toast.success("Belohnungen gespeichert");
    } else {
      toast.error("Fehler beim Speichern");
    }
  }

  async function finishNow(contestId: string) {
    if (!(await confirm({ title: "Abstimmung beenden", description: "Abstimmung jetzt beenden und Gewinner auswerten? Münzen werden sofort vergeben.", variant: "danger" }))) return;
    setFinishing(contestId);
    const res = await fetch(`/api/admin/clip-contest/${contestId}/finish`, { method: "POST" });
    const data = await res.json();
    setFinishing(null);
    if (res.ok) {
      toast.success(data.message ?? "Abstimmung beendet");
      router.refresh();
    } else {
      toast.error(data.error ?? "Fehler beim Beenden");
    }
  }

  if (items.length === 0) {
    return (
      <div className="glass rounded-2xl p-8 text-center text-gray-500">
        <Clapperboard className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p>Noch keine Contests vorhanden.</p>
        <p className="text-sm mt-1">Starte oben manuell eine Abstimmung, oder warte auf den automatischen Contest am 1. des Monats.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        Bestehende Contests. Hier kannst du die Münzen-Belohnung anpassen.
      </p>

      {items.map((contest) => {
        const winners = contest.nominations.filter((n) => contest.winnerNominationIds.includes(n.id));
        const sorted = [...contest.nominations].sort((a, b) => b._count.votes - a._count.votes);

        return (
          <div key={contest.id} className="glass rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                {editingPeriodId === contest.id ? (
                  <div className="flex items-center gap-1.5">
                    <select
                      value={periodMonthInput}
                      onChange={(e) => setPeriodMonthInput(e.target.value)}
                      className="rounded-lg px-2 py-1 text-sm text-white bg-white/[0.05] border border-white/[0.1] outline-none focus:border-purple-500/40"
                    >
                      {MONTH_NAMES.map((name, i) => (
                        <option key={name} value={i + 1} className="bg-gray-900">{name}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={periodYearInput}
                      onChange={(e) => setPeriodYearInput(e.target.value)}
                      className="w-20 rounded-lg px-2 py-1 text-sm text-white bg-white/[0.05] border border-white/[0.1] outline-none focus:border-purple-500/40"
                    />
                    <button
                      onClick={() => savePeriod(contest.id)}
                      disabled={periodSaving === contest.id}
                      className="p-1.5 rounded-lg text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 disabled:opacity-50 transition-colors"
                      title="Speichern"
                    >
                      {periodSaving === contest.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={cancelEditingPeriod}
                      disabled={periodSaving === contest.id}
                      className="p-1.5 rounded-lg text-gray-400 bg-white/[0.05] border border-white/[0.1] hover:bg-white/[0.1] transition-colors"
                      title="Abbrechen"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <h2 className="font-bold text-white">
                      {MONTH_NAMES[contest.month - 1]} {contest.year}
                    </h2>
                    <button
                      onClick={() => startEditingPeriod(contest)}
                      className="p-1 rounded-lg text-gray-500 hover:text-white hover:bg-white/[0.08] transition-colors"
                      title="Monat/Jahr korrigieren"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  contest.status === "voting"
                    ? "bg-blue-500/15 text-blue-300 border border-blue-500/20"
                    : "bg-gray-500/15 text-gray-400 border border-white/[0.06]"
                }`}>
                  {contest.status === "voting" ? "Abstimmung läuft" : "Abgeschlossen"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>{contest._count.votes} Stimmen</span>
                <span>·</span>
                <span>{contest.nominations.length} Clips</span>
                {contest.status === "voting" && (
                  <>
                    <span>·</span>
                    <span>endet {new Date(contest.votingEndsAt).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                    <button
                      onClick={() => finishNow(contest.id)}
                      disabled={finishing === contest.id}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-red-500/10 border border-red-500/20 text-red-300 hover:bg-red-500/20 disabled:opacity-50 transition-colors"
                    >
                      {finishing === contest.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Square className="w-3 h-3" />}
                      Jetzt beenden
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Reward-Kachel: Teilnahme + Sieger */}
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500">Münzen fürs Abstimmen</label>
                <input
                  type="number"
                  min={0}
                  value={participationInputs[contest.id] ?? contest.participationCoins}
                  onChange={(e) => setParticipationInputs((p) => ({ ...p, [contest.id]: e.target.value }))}
                  className="w-20 rounded-lg px-2 py-1 text-sm text-white bg-white/[0.05] border border-white/[0.1] outline-none focus:border-purple-500/40"
                />
              </div>
              <div className="w-px h-6 bg-white/[0.08]" />
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500">Münzen für Sieger</label>
                <input
                  type="number"
                  min={0}
                  value={rewardInputs[contest.id] ?? contest.rewardCoins}
                  onChange={(e) => setRewardInputs((p) => ({ ...p, [contest.id]: e.target.value }))}
                  className="w-24 rounded-lg px-2 py-1 text-sm text-white bg-white/[0.05] border border-white/[0.1] outline-none focus:border-purple-500/40"
                />
              </div>
              <button
                onClick={() => saveRewards(contest.id)}
                disabled={saving === contest.id}
                className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium bg-purple-500/15 border border-purple-500/20 text-purple-300 hover:bg-purple-500/25 disabled:opacity-50 transition-colors ml-auto"
              >
                {saving === contest.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                Speichern
              </button>
            </div>

            {/* Winner info */}
            {winners.length > 0 && (
              <div className="space-y-2">
                {winners.length > 1 && (
                  <p className="text-xs text-amber-300 font-medium">Gleichstand · {winners.length} Gewinner</p>
                )}
                {winners.map((winner) => {
                  const noAccountWinner = !winner.submittedBy && winner.twitchCreatorLogin;
                  return (
                    <div key={winner.id} className={`rounded-xl p-3 ${
                      noAccountWinner ? "bg-amber-500/10 border border-amber-500/20" : "bg-emerald-500/10 border border-emerald-500/20"
                    }`}>
                      <div className="flex items-start gap-3">
                        <Trophy className={`w-4 h-4 shrink-0 mt-0.5 ${noAccountWinner ? "text-amber-400" : "text-emerald-400"}`} />
                        <div className="text-sm flex-1 min-w-0">
                          <p className="font-medium text-white">
                            Gewinner: {winner.clipTitle ?? "Unbekannter Clip"}
                          </p>
                          <p className="text-gray-400 text-xs mt-0.5">
                            {winner.submittedBy?.name ?? winner.submittedBy?.username ?? winner.twitchCreatorLogin ?? "Unbekannt"}
                            {winner.partnerTwitchLogin && <> · von {winner.partnerTwitchLogin}</>}
                            {" · "}{winner._count.votes} Stimmen
                          </p>
                          {noAccountWinner && (
                            <p className="text-amber-300 text-xs mt-1">
                              Twitch-User „{winner.twitchCreatorLogin}" hat kein Community-Konto — keine Münzen vergeben.
                            </p>
                          )}
                        </div>
                        {noAccountWinner && (
                          <button
                            onClick={() => toggleLinking(winner.id)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-500/10 border border-amber-500/20 text-amber-300 hover:bg-amber-500/20 transition-colors shrink-0"
                          >
                            <Link2 className="w-3.5 h-3.5" /> Konto verknüpfen
                          </button>
                        )}
                        <a href={winner.clipUrl} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-400 shrink-0">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>

                      {linkingNominationId === winner.id && (
                        <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-2">
                          <p className="text-xs text-gray-400 font-medium">
                            Community-Mitglied für „{winner.twitchCreatorLogin}" suchen
                          </p>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Nutzername suchen…"
                              value={userSearchInput}
                              onChange={(e) => { setUserSearchInput(e.target.value); searchUsers(e.target.value); }}
                              className="flex-1 rounded-lg px-2 py-1.5 text-sm text-white bg-white/[0.05] border border-white/[0.1] outline-none focus:border-purple-500/40"
                            />
                            {userSearching && <Loader2 className="w-4 h-4 animate-spin text-gray-400 self-center" />}
                          </div>
                          {userSearchResults.length > 0 && (
                            <div className="space-y-1">
                              {userSearchResults.slice(0, 5).map((u) => (
                                <button
                                  key={u.id}
                                  onClick={() => linkWinner(contest.id, winner.id, u)}
                                  disabled={linkSaving}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/[0.06] transition-colors text-left disabled:opacity-50"
                                >
                                  {u.image
                                    ? <Image src={u.image} alt="" width={28} height={28} className="rounded-full shrink-0" />
                                    : <div className="w-7 h-7 rounded-full bg-gray-700 shrink-0" />
                                  }
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-white truncate">{u.username ?? u.name}</p>
                                    {u.twitchLogin && <p className="text-xs text-violet-400">twitch.tv/{u.twitchLogin}</p>}
                                  </div>
                                  <Plus className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Nominations list */}
            <div className="space-y-1">
              {sorted.map((nom, i) => {
                const name = nom.submittedBy?.name ?? nom.submittedBy?.username ?? nom.twitchCreatorLogin ?? "Unbekannt";
                const isWinner = contest.winnerNominationIds.includes(nom.id);
                return (
                  <div key={nom.id} className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${isWinner ? "bg-amber-500/5" : "bg-white/[0.02]"}`}>
                    <span className="text-gray-600 w-4 text-right">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white truncate">{nom.clipTitle ?? nom.clipUrl}</p>
                      <p className="text-xs text-gray-500">{name}{nom.partnerTwitchLogin && <> · {nom.partnerTwitchLogin}</>}</p>
                    </div>
                    <span className="text-gray-400 shrink-0">{nom._count.votes} ×</span>
                    <a href={nom.clipUrl} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-400">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    {isWinner && <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      {ConfirmDialogElement}
    </div>
  );
}
