"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trophy, Clapperboard, ExternalLink, Loader2, Square } from "lucide-react";
import { useConfirm } from "@/components/admin/ConfirmDialog";

type Nomination = {
  id: string;
  clipUrl: string;
  clipTitle: string | null;
  submittedBy: { id: string; name: string | null; username: string | null } | null;
  twitchCreatorLogin: string | null;
  partnerTwitchLogin: string | null;
  _count: { votes: number };
};

type Contest = {
  id: string;
  year: number;
  status: string;
  rewardCoins: number;
  participationCoins: number;
  winnerNominationIds: string[];
  votingEndsAt: Date;
  nominations: Nomination[];
  _count: { votes: number };
};

export default function YearlyContestManager({ contests }: { contests: Contest[] }) {
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

  async function saveRewards(contestId: string) {
    const rewardCoins = parseInt(rewardInputs[contestId] ?? "1000");
    const participationCoins = parseInt(participationInputs[contestId] ?? "10");
    if (isNaN(rewardCoins) || rewardCoins < 0 || isNaN(participationCoins) || participationCoins < 0) {
      toast.error("Ungültiger Wert");
      return;
    }
    setSaving(contestId);
    const res = await fetch("/api/admin/clip-of-year", {
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
    const res = await fetch(`/api/admin/clip-of-year/${contestId}/finish`, { method: "POST" });
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
        <p>Noch keine Clip-des-Jahres-Wahlen vorhanden.</p>
        <p className="text-sm mt-1">Die erste Wahl startet automatisch Mitte Dezember, sobald die November-Abstimmung zum Clip des Monats beendet ist.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        Bestehende Clip-des-Jahres-Wahlen. Hier kannst du die Münzen-Belohnung anpassen.
      </p>

      {items.map((contest) => {
        const winners = contest.nominations.filter((n) => contest.winnerNominationIds.includes(n.id));
        const sorted = [...contest.nominations].sort((a, b) => b._count.votes - a._count.votes);

        return (
          <div key={contest.id} className="glass rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <h2 className="font-bold text-white">Clip des Jahres {contest.year}</h2>
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
                    <div key={winner.id} className={`rounded-xl p-3 flex items-start gap-3 ${
                      noAccountWinner ? "bg-amber-500/10 border border-amber-500/20" : "bg-emerald-500/10 border border-emerald-500/20"
                    }`}>
                      <Trophy className={`w-4 h-4 shrink-0 mt-0.5 ${noAccountWinner ? "text-amber-400" : "text-emerald-400"}`} />
                      <div className="text-sm">
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
                      <a href={winner.clipUrl} target="_blank" rel="noopener noreferrer" className="ml-auto text-gray-600 hover:text-gray-400">
                        <ExternalLink className="w-4 h-4" />
                      </a>
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
