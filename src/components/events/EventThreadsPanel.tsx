"use client";
import Link from "next/link";
import { ArrowLeft, ChevronRight, MessageCircle } from "@/components/icons";
import EventComments, { StatusBar } from "@/components/events/EventComments";
import { formatBerlinDateTime, formatBerlinTime, isSameBerlinDay } from "@/lib/time";
import { statusBadge, type EventThreadDTO } from "@/lib/event-comments-shared";

/**
 * Schnellzugriff auf die Event-Absprachen im Panel unten rechts (ersetzt die frühere Community-Lobby):
 * Liste der eigenen Events mit letzter Nachricht und "neu"-Zähler, beim nächsten Event direkt die
 * Status-Knöpfe, ein Tipp öffnet den Verlauf im Panel.
 */
export default function EventThreadsPanel({
  userId, threads, loaded, selectedId, onSelect, onRefresh, onNavigate,
}: {
  userId: string;
  threads: EventThreadDTO[];
  loaded: boolean;
  selectedId: string | null;
  onSelect: (eventId: string | null) => void;
  onRefresh: () => void;
  /** Panel schließen (vor Navigation auf eine andere Seite) */
  onNavigate: () => void;
}) {
  const selected = selectedId ? threads.find(t => t.eventId === selectedId) : null;

  if (selectedId) {
    return (
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="shrink-0 flex items-center gap-2 px-2 py-2 border-b border-white/[0.06]">
          <button type="button" onClick={() => { onSelect(null); onRefresh(); }} aria-label="Zurück zur Übersicht"
            className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.06]">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{selected?.title ?? "Absprachen"}</p>
            {selected && <p className="text-[11px] text-gray-500 truncate">{whenLabel(selected)}</p>}
          </div>
          <Link href={`/tournament/${selectedId}`} onClick={onNavigate}
            className="shrink-0 flex items-center gap-0.5 text-[11px] text-teal-300 hover:text-teal-200 px-2 py-1 rounded-lg hover:bg-teal-500/10">
            Zum Event <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <EventComments key={selectedId} variant="panel" eventId={selectedId} userId={userId}
          isPlayer={selected?.isPlayer ?? false} onRead={onRefresh} />
      </div>
    );
  }

  if (!loaded) return <div className="flex-1" />;

  if (threads.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
        <MessageCircle style={{ width: 22, height: 22, color: "#374151" }} />
        <p className="text-xs text-gray-500">
          Noch keine Absprachen. Sobald du bei einem Event dabei bist, findest du hier alles dazu —
          wer später kommt, Lobby-Codes, kurze Fragen.
        </p>
        <Link href="/events" onClick={onNavigate} className="text-xs text-teal-300 hover:text-teal-200 mt-1">Zu den Events →</Link>
      </div>
    );
  }

  // Nächstes eigenes Event: anstehend/laufend → Status-Knöpfe, Abstimmung → direkt zur Abstimmung
  const next = threads
    .filter(t => t.registered && t.phase !== "finished")
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())[0];

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
      {next && (
        <div className="px-4 py-3 border-b border-white/[0.06] bg-teal-500/[0.04]">
          <p className="text-[10px] uppercase tracking-wider text-teal-300/80 font-semibold mb-0.5">Dein nächstes Event</p>
          <p className="text-sm font-semibold text-white truncate">{next.title}</p>
          <p className="text-[11px] text-gray-500 mb-2">
            {whenLabel(next)}
            {next.myStatus && next.phase !== "voting" && <span className={`ml-2 px-1.5 py-px rounded-full ${statusBadge(next.myStatus.status, next.myStatus.lateMin).className}`}>
              {statusBadge(next.myStatus.status, next.myStatus.lateMin).label}
            </span>}
          </p>
          {next.phase === "voting" ? (
            <Link href={`/tournament/${next.eventId}#abstimmung`} onClick={onNavigate}
              className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-violet-500/15 border border-violet-400/30 text-violet-200 hover:bg-violet-500/25">
              🗳️ Jetzt abstimmen <ChevronRight className="w-3 h-3" />
            </Link>
          ) : (
            <StatusBar compact eventId={next.eventId} myStatus={next.myStatus} isPlayer={next.isPlayer}
              onPosted={async () => onRefresh()} />
          )}
        </div>
      )}
      <ul>
        {threads.map(t => (
          <li key={t.eventId}>
            <button type="button" onClick={() => onSelect(t.eventId)}
              className={`w-full text-left flex gap-3 items-start px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors ${t.unread > 0 ? "bg-teal-500/[0.04]" : ""}`}>
              <div className="flex-1 min-w-0">
                <p className="flex items-center gap-2 min-w-0">
                  {t.phase === "live" && <span className="shrink-0 text-[9px] font-bold px-1.5 py-px rounded-full bg-rose-500 text-white">LIVE</span>}
                  {t.phase === "voting" && <span className="shrink-0 text-[9px] font-bold px-1.5 py-px rounded-full bg-violet-500 text-white">ABSTIMMUNG</span>}
                  <span className={`text-sm truncate ${t.unread > 0 ? "font-semibold text-white" : "text-gray-200"}`}>{t.title}</span>
                </p>
                <p className="text-[11px] text-gray-500 truncate">{whenLabel(t)}</p>
                {t.pinned && <p className="text-[11px] text-amber-300/80 truncate mt-0.5">📌 {t.pinned}</p>}
                <p className={`text-xs truncate mt-0.5 ${t.unread > 0 ? "text-gray-300" : "text-gray-500"}`}>
                  {t.last ? <><span className="text-gray-400">{t.last.author}:</span> {t.last.text}</> : <span className="italic">Noch keine Nachrichten</span>}
                </p>
              </div>
              <div className="shrink-0 flex flex-col items-end gap-1">
                {t.last && <span className="text-[10px] text-gray-600">{shortTime(t.last.createdAt)}</span>}
                {t.unread > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-teal-500 text-teal-950 text-[10px] font-bold flex items-center justify-center">
                    {t.unread > 99 ? "99+" : t.unread}
                  </span>
                )}
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function whenLabel(t: EventThreadDTO): string {
  if (t.phase === "live") return "Läuft gerade";
  if (t.phase === "voting") return "Abstimmung läuft";
  const d = new Date(t.startAt);
  const prefix = t.seriesName ? `${t.seriesName} · ` : "";
  if (t.phase === "finished") return `${prefix}beendet`;
  return `${prefix}${formatBerlinDateTime(d, { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} Uhr`;
}

function shortTime(iso: string): string {
  const d = new Date(iso);
  if (isSameBerlinDay(d, new Date())) return formatBerlinTime(d, { hour: "2-digit", minute: "2-digit" });
  return formatBerlinDateTime(d, { day: "2-digit", month: "2-digit" });
}
