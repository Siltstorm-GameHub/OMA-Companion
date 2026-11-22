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
        <div className="shrink-0 flex items-center gap-2 px-2 py-2 border-b border-line">
          <button type="button" onClick={() => { onSelect(null); onRefresh(); }} aria-label="Zurück zur Übersicht"
            className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-line">
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

  // Nächstes eigenes Event: steht als hervorgehobener erster Eintrag oben und fehlt dafür in den Gruppen
  const next = threads
    .filter(t => t.registered && t.phase !== "finished")
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())[0];

  // Gruppen in Server-Reihenfolge (innerhalb: ungelesen zuerst)
  const rest = threads.filter(t => t !== next);
  const active = rest.filter(t => t.phase === "live" || t.phase === "voting");
  const upcoming = rest.filter(t => t.phase === "upcoming");
  const finished = rest.filter(t => t.phase === "finished");
  const finishedUnread = finished.some(t => t.unread > 0);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
      {next && <NextEventCard t={next} onSelect={onSelect} onRefresh={onRefresh} onNavigate={onNavigate} />}
      <ThreadGroup label="Läuft gerade" threads={active} onSelect={onSelect} />
      <ThreadGroup label="Anstehend" threads={upcoming} onSelect={onSelect} />
      {finished.length > 0 && (
        // Beendete Events: nur noch kurz beschreibbar → eingeklappt, außer dort ist etwas Neues
        <details open={finishedUnread || undefined} className="group/fin">
          <summary className="list-none cursor-pointer select-none flex items-center gap-1.5 px-4 pt-3 pb-1.5 text-[10px] uppercase tracking-wider font-semibold text-gray-500 hover:text-gray-300 [&::-webkit-details-marker]:hidden">
            <ChevronRight className="w-3 h-3 transition-transform group-open/fin:rotate-90" />
            Beendet ({finished.length})
          </summary>
          <ThreadList threads={finished} onSelect={onSelect} />
        </details>
      )}
    </div>
  );
}

function NextEventCard({ t, onSelect, onRefresh, onNavigate }: {
  t: EventThreadDTO;
  onSelect: (eventId: string) => void;
  onRefresh: () => void;
  onNavigate: () => void;
}) {
  const badge = t.myStatus && t.phase !== "voting" ? statusBadge(t.myStatus.status, t.myStatus.lateMin) : null;
  return (
    <div className="m-2 rounded-xl border border-teal-400/20 bg-teal-500/[0.06] overflow-hidden">
      <button type="button" onClick={() => onSelect(t.eventId)}
        className="w-full text-left px-3 pt-2.5 pb-2 hover:bg-surface-2 transition-colors">
        <div className="flex items-center gap-2">
          <p className="flex-1 min-w-0 text-[10px] uppercase tracking-wider text-teal-300/80 font-semibold">Dein nächstes Event</p>
          <UnreadCount n={t.unread} />
        </div>
        <p className="flex items-center gap-2 min-w-0 mt-0.5">
          <PhaseBadge t={t} />
          <span className="text-sm font-semibold text-white truncate">{t.title}</span>
          {t.pinned && <span className="shrink-0 text-[11px]" title={`Angepinnt: ${t.pinned}`}>📌</span>}
        </p>
        <p className="text-[11px] text-gray-400">
          {whenLabel(t)}
          {badge && <span className={`ml-2 px-1.5 py-px rounded-full ${badge.className}`}>{badge.label}</span>}
        </p>
        <LastMessage t={t} />
      </button>
      <div className="px-3 pb-2.5">
        {t.phase === "voting" ? (
          <Link href={`/tournament/${t.eventId}#abstimmung`} onClick={onNavigate}
            className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-violet-500/15 border border-violet-400/30 text-violet-200 hover:bg-violet-500/25">
            🗳️ Jetzt abstimmen <ChevronRight className="w-3 h-3" />
          </Link>
        ) : (
          <StatusBar compact eventId={t.eventId} myStatus={t.myStatus} isPlayer={t.isPlayer} readyOpensAt={t.readyOpensAt}
            onPosted={async () => onRefresh()} />
        )}
      </div>
    </div>
  );
}

function ThreadGroup({ label, threads, onSelect }: { label: string; threads: EventThreadDTO[]; onSelect: (eventId: string) => void }) {
  if (threads.length === 0) return null;
  return (
    <section>
      <h3 className="px-4 pt-3 pb-1.5 text-[10px] uppercase tracking-wider font-semibold text-gray-500">{label}</h3>
      <ThreadList threads={threads} onSelect={onSelect} />
    </section>
  );
}

/** Kompakter Eintrag: Zeile 1 Titel (+ Zeitpunkt, 📌) und Uhrzeit, Zeile 2 letzte Nachricht und Zähler. */
function ThreadList({ threads, onSelect }: { threads: EventThreadDTO[]; onSelect: (eventId: string) => void }) {
  return (
    <ul>
      {threads.map(t => {
        const unread = t.unread > 0;
        return (
          <li key={t.eventId}>
            <button type="button" onClick={() => onSelect(t.eventId)}
              className={`relative w-full text-left px-4 py-2 border-b border-line hover:bg-surface-2 transition-colors ${unread ? "bg-teal-500/[0.05]" : ""}`}>
              {unread && <span aria-hidden className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-teal-400" />}
              <span className="flex items-center gap-2 min-w-0">
                <PhaseBadge t={t} />
                <span className={`text-sm truncate ${unread ? "font-semibold text-white" : "text-gray-300"}`}>{t.title}</span>
                {t.phase === "upcoming" && <span className="shrink-0 text-[10px] text-gray-500">{shortWhen(t.startAt)}</span>}
                {t.pinned && <span className="shrink-0 text-[11px]" title={`Angepinnt: ${t.pinned}`}>📌</span>}
                <span className="flex-1" />
                {t.last && <span className={`shrink-0 text-[10px] ${unread ? "text-teal-300" : "text-gray-600"}`}>{shortTime(t.last.createdAt)}</span>}
              </span>
              <span className="flex items-center gap-2 min-w-0">
                <LastMessage t={t} />
                <UnreadCount n={t.unread} />
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function PhaseBadge({ t }: { t: EventThreadDTO }) {
  if (t.phase === "live") return <span className="shrink-0 text-[9px] font-bold px-1.5 py-px rounded-full bg-rose-500 text-white">LIVE</span>;
  if (t.phase === "voting") return <span className="shrink-0 text-[9px] font-bold px-1.5 py-px rounded-full bg-violet-500 text-white">ABSTIMMUNG</span>;
  return null;
}

function LastMessage({ t }: { t: EventThreadDTO }) {
  return (
    <span className={`block flex-1 min-w-0 text-xs truncate ${t.unread > 0 ? "text-gray-300" : "text-gray-500"}`}>
      {t.last ? <><span className="text-gray-400">{t.last.author}:</span> {t.last.text}</> : <span className="italic">Noch keine Nachrichten</span>}
    </span>
  );
}

function UnreadCount({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-teal-500 text-teal-950 text-[10px] font-bold flex items-center justify-center">
      {n > 99 ? "99+" : n}
    </span>
  );
}

/** Kurzer Startzeitpunkt für die Liste: heute → "20:00", diese Woche → "Sa 20:00", später → "Sa 21.11.". */
function shortWhen(iso: string): string {
  const d = new Date(iso);
  const time = formatBerlinTime(d, { hour: "2-digit", minute: "2-digit" });
  if (isSameBerlinDay(d, new Date())) return time;
  if (d.getTime() - Date.now() < 6 * 24 * 60 * 60_000) return `${formatBerlinDateTime(d, { weekday: "short" })} ${time}`;
  return formatBerlinDateTime(d, { weekday: "short", day: "2-digit", month: "2-digit" });
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
