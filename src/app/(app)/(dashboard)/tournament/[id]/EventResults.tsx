import CoinIcon from "@/components/CoinIcon";
import RankPointsIcon from "@/components/RankPointsIcon";
import RankedAvatar from "@/components/RankedAvatar";
import WinIcon from "@/components/WinIcon";
import StyledUserName from "@/components/cosmetics/StyledUserName";
import { Glyph } from "@/components/ui/Glyph";
import { Podium, type PodiumEntry } from "@/components/ui/Podium";
import { Eye, Vote } from "@/components/icons";

type Person = { id: string; name: string | null; username: string | null; image: string | null };
const nameOf = (u: { name: string | null; username: string | null }) => u.username ?? u.name ?? "Unbekannt";

export type ResultPollCard = {
  id: string;
  label: string;
  winners: { id: string | null; name: string; image: string | null }[];
  bonus: { coins: number; rankPoints: number } | null;
};

/**
 * Ergebnis-Abschnitt der Eventseite: Treppchen (gemeinsame Podium-Komponente) bzw. Turniersieger,
 * bei Community-Events "Mit dabei waren", dazu die Sieger der Umfragen. Ausgelagert aus page.tsx.
 */
export default function EventResults({
  userId, provisional, community, podium, winner, pollCards,
}: {
  userId: string;
  /** Spielphase vorbei, Event noch nicht abgeschlossen */
  provisional: boolean;
  /** Community-Event (ohne Platzierung) abgeschlossen */
  community: { people: { user: Person; spectator: boolean }[]; spectatorCount: number; myReward: { coins: number; rankPoints: number } | null } | null;
  podium: PodiumEntry[];
  /** Nur wenn es kein Treppchen gibt (z. B. K.O.-Finale entschieden, Endplatzierung fehlt) */
  winner: { name: string | null; username: string | null } | null;
  pollCards: ResultPollCard[];
}) {
  return (
    <section aria-label="Ergebnis" className="rounded-card border border-coin/30 bg-surface shadow-card p-4 sm:p-5 mb-5 space-y-4">
      {community ? (
        <>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="flex items-center gap-2 text-base font-extrabold text-fg">
              <Glyph name="handshake" className="size-5 text-primary-fg" /> Mit dabei waren
              <span className="text-xs font-semibold text-subtle">
                {community.people.length - community.spectatorCount}{community.spectatorCount > 0 && ` + ${community.spectatorCount} Zuschauer`}
              </span>
            </h2>
            {community.myReward && (
              <span className="flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary-fg tabular-nums">
                Danke fürs Mitmachen
                {community.myReward.coins > 0 && <span className="flex items-center gap-0.5">· +{community.myReward.coins} <CoinIcon size={12} /></span>}
                {community.myReward.rankPoints > 0 && <span className="flex items-center gap-0.5">· +{community.myReward.rankPoints} <RankPointsIcon size={12} /></span>}
              </span>
            )}
          </div>
          <p className="text-xs text-subtle">Freies Spiel: kein Sieger, alle Teilnehmer haben die Teilnahme-Belohnung bekommen.</p>
          {community.people.length > 0 && (
            <div className="flex flex-wrap gap-x-3 gap-y-2">
              {community.people.map(({ user: u, spectator }) => {
                const isMe = u.id === userId;
                return (
                  <span key={u.id} className="flex items-center gap-1.5 min-w-0">
                    <RankedAvatar userId={u.id} src={u.image} alt={nameOf(u)} size={24} className="w-6 h-6" />
                    <span className={`truncate text-xs font-semibold ${isMe ? "text-primary-fg" : "text-fg"}`}>
                      <StyledUserName userId={u.id} name={nameOf(u)} />{isMe && <span className="text-subtle ml-1">(du)</span>}
                    </span>
                    {spectator && (
                      <span title="War als Zuschauer dabei" className="flex shrink-0 items-center gap-0.5 rounded-full bg-surface-3 px-1.5 py-px text-xs font-semibold text-muted">
                        <Eye className="size-3" /> Zuschauer
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <h2 className="flex items-center gap-2 text-base font-extrabold text-fg">
          <WinIcon size={20} /> {provisional ? "Ergebnis (vorläufig)" : "Ergebnis"}
        </h2>
      )}

      {podium.length > 0 ? (
        <Podium entries={podium} size="md" className="pt-2" />
      ) : winner ? (
        <div className="flex items-center gap-3 rounded-control border border-coin/30 bg-coin-soft p-3">
          <WinIcon size={22} />
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-coin">Turniersieger</p>
            <p className="font-extrabold text-fg">{nameOf(winner)}</p>
          </div>
        </div>
      ) : null}

      {community && pollCards.length > 0 && (
        <p className="text-xs font-bold uppercase tracking-wide text-subtle">Highlights aus den Umfragen</p>
      )}
      {pollCards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {pollCards.map(poll => (
            <div key={poll.id} className="rounded-control bg-surface-2 border border-line px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-xs font-bold text-violet-300 mb-1.5"><Vote className="size-3.5" /> {poll.label}</p>
              <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                {poll.winners.map((w, i) => {
                  const isMe = w.id === userId;
                  return (
                    <span key={w.id ?? i} className="flex items-center gap-1.5">
                      <RankedAvatar userId={w.id ?? undefined} src={w.image} alt={w.name} size={22} className="w-[22px] h-[22px]" />
                      <span className={`text-sm font-semibold ${isMe ? "text-primary-fg" : "text-fg"}`}>
                        <StyledUserName userId={w.id ?? undefined} name={w.name} />{isMe && <span className="text-xs text-subtle ml-1">(du)</span>}
                      </span>
                    </span>
                  );
                })}
              </div>
              {poll.bonus && (poll.bonus.coins > 0 || poll.bonus.rankPoints > 0) && (
                <p className="flex items-center gap-2 mt-1 text-xs font-semibold text-coin">
                  {poll.bonus.coins > 0 && <span className="flex items-center gap-0.5">+{poll.bonus.coins} <CoinIcon size={11} /></span>}
                  {poll.bonus.rankPoints > 0 && <span className="flex items-center gap-0.5">+{poll.bonus.rankPoints} <RankPointsIcon size={11} /></span>}
                </p>
              )}
              {poll.winners.length > 1 && <p className="text-xs text-subtle mt-1">Gleichstand, alle {poll.winners.length} erhalten dieselbe Belohnung.</p>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
