import RankedAvatar from "@/components/RankedAvatar";
import StyledUserName, { StyledUserTitle } from "@/components/cosmetics/StyledUserName";
import { CheckCircle2, Eye, Vote } from "@/components/icons";
import { statusBadge } from "@/lib/event-comments-shared";
import type { CommentStatus } from "@/lib/event-comments-shared";
import ParticipantSearch from "./ParticipantSearch";

type Person = { id: string; name: string | null; username: string | null; image: string | null };
const nameOf = (u: { name: string | null; username: string | null }) => u.username ?? u.name ?? "Unbekannt";

/**
 * Teilnehmerliste der Eventseite: Mitspieler, dann Zuschauer, dann externe Wähler. Mit Status aus den
 * Absprachen ("kommt später" …), "Abgestimmt", gewonnenen Umfragen und Siegen. Ausgelagert aus page.tsx.
 */
export default function EventParticipantList({
  registrations, externalVoters, userId, winsByUser, wonLabelsByUser, excludedUserIds, statuses, showStatus, votedUserIds, readyIds = null,
}: {
  /** Vor der Auslosung mit Bereit-Meldung: wer "Bin bereit" gedrückt hat (null = nicht anzeigen) */
  readyIds?: Set<string> | null;
  /** schon sortiert: Mitspieler zuerst, dann Zuschauer */
  registrations: { user: Person; role: string }[];
  externalVoters: Person[];
  userId: string;
  winsByUser: Record<string, number>;
  wonLabelsByUser: Record<string, string[]>;
  excludedUserIds: Set<string>;
  statuses: Map<string, { status: CommentStatus; lateMin: number | null }>;
  /** Status-Hinweise nur bis zum Ende der Spielphase */
  showStatus: boolean;
  votedUserIds: Set<string>;
}) {
  const VOTED = (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-success bg-success-soft px-1.5 py-0.5 rounded-full shrink-0">
      <CheckCircle2 className="size-3" /> Abgestimmt
    </span>
  );
  const playerCount = registrations.filter(r => r.role !== "spectator").length;
  const readyCount = readyIds ? registrations.filter(r => r.role !== "spectator" && readyIds.has(r.user.id)).length : 0;
  const list = (
    <div className="rounded-card border border-line bg-surface shadow-card divide-y divide-line overflow-hidden">
      {readyIds && playerCount > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-surface-2 text-xs font-semibold text-muted">
          <CheckCircle2 className="size-3.5 text-success" />
          <span><span className="font-bold text-fg tabular-nums">{readyCount} von {playerCount}</span> bereit</span>
          <span className="ml-auto h-1.5 w-20 overflow-hidden rounded-full bg-surface-3" aria-hidden>
            <span className="block h-full rounded-full bg-success" style={{ width: `${Math.round((readyCount / playerCount) * 100)}%` }} />
          </span>
        </div>
      )}
      {registrations.map(({ user, role }, i) => {
        const isMe = user.id === userId;
        const wins = winsByUser[user.id] ?? 0;
        const wonLabels = wonLabelsByUser[user.id] ?? [];
        const isSpectatorRow = role === "spectator";
        const showDivider = isSpectatorRow && (i === 0 || registrations[i - 1].role !== "spectator");
        const st = showStatus ? statuses.get(user.id) : undefined;
        const badge = st ? statusBadge(st.status, st.lateMin) : null;
        return (
          <div key={user.id} data-person={nameOf(user).toLowerCase()}>
            {showDivider && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-2">
                <Eye className="size-3.5 text-subtle" />
                <span className="text-xs font-bold uppercase tracking-wide text-subtle">Zuschauer</span>
              </div>
            )}
            <div className={`flex items-center gap-2.5 px-3 py-2.5 ${isMe ? "bg-primary-soft/60" : ""}`}>
              <span className="w-4 shrink-0 text-center text-xs font-semibold text-subtle tabular-nums">{i + 1}</span>
              <RankedAvatar userId={user.id} src={user.image} alt={nameOf(user)} size={28} className="w-7 h-7" />
              <div className="flex-1 min-w-0">
                <p className={`flex items-center gap-1.5 truncate text-sm font-semibold ${isMe ? "text-primary-fg" : "text-fg"}`}>
                  <span className="truncate"><StyledUserName userId={user.id} name={nameOf(user)} />{isMe && " (du)"}</span>
                  {isSpectatorRow && <Eye className="size-3.5 shrink-0 text-subtle" />}
                  {excludedUserIds.has(user.id) && (
                    <span className="inline-flex items-center rounded-full bg-surface-3 px-1.5 py-0.5 text-xs font-semibold text-muted shrink-0">Ungewertet</span>
                  )}
                  {badge && (
                    <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-semibold shrink-0 ${badge.className}`}>{badge.label}</span>
                  )}
                  {votedUserIds.has(user.id) && VOTED}
                  {readyIds && !isSpectatorRow && (readyIds.has(user.id)
                    ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-success bg-success-soft px-1.5 py-0.5 rounded-full shrink-0"><CheckCircle2 className="size-3" /> bereit</span>
                    : <span className="inline-flex items-center text-xs font-semibold text-subtle bg-surface-3 px-1.5 py-0.5 rounded-full shrink-0">noch nicht bereit</span>)}
                </p>
                <StyledUserTitle userId={user.id} className="block truncate leading-tight" />
                {wonLabels.length > 0 && (
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {wonLabels.map(label => (
                      <span key={label} className="flex items-center gap-0.5 text-xs font-semibold text-violet-300">
                        <Vote className="size-3" /> {label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {wins > 0 && <span className="shrink-0 text-xs font-bold text-success tabular-nums">{wins}W</span>}
            </div>
          </div>
        );
      })}
      {externalVoters.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-2">
            <Vote className="size-3.5 text-primary-fg" />
            <span className="text-xs font-bold uppercase tracking-wide text-subtle">Externe Wähler</span>
          </div>
          {externalVoters.map((user, i) => {
            const isMe = user.id === userId;
            return (
              <div key={user.id} data-person={nameOf(user).toLowerCase()} className={`flex items-center gap-2.5 px-3 py-2.5 ${isMe ? "bg-primary-soft/60" : ""}`}>
                <span className="w-4 shrink-0 text-center text-xs font-semibold text-subtle tabular-nums">{i + 1}</span>
                <RankedAvatar userId={user.id} src={user.image} alt={nameOf(user)} size={28} className="w-7 h-7" />
                <p className={`flex min-w-0 flex-1 items-center gap-1.5 truncate text-sm font-semibold ${isMe ? "text-primary-fg" : "text-fg"}`}>
                  <span className="truncate">{nameOf(user)}{isMe && " (du)"}</span>
                  {VOTED}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
  return registrations.length + externalVoters.length >= 20 ? <ParticipantSearch>{list}</ParticipantSearch> : list;
}
