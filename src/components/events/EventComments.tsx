"use client";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, Loader2, MessageCircle, Pencil, Send, Smile, Trash2, X } from "@/components/icons";
import RankedAvatar from "@/components/RankedAvatar";
import { usePolling } from "@/lib/usePolling";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { SECTION_JUMP_EVENT } from "@/components/SectionJumpLink";
import { mentionToken } from "@/lib/report-mentions";
import { formatBerlinDateTime, formatBerlinTime, isSameBerlinDay } from "@/lib/time";
import {
  COMMENT_MAX_LENGTH, LATE_OPTIONS, REACTION_EMOJIS, parseCommentSegments, plainCommentText, readyLocked,
  type AttendanceSummary, type CommentStatus, type EventCommentDTO, type EventCommentsResponse,
} from "@/lib/event-comments-shared";

/** Polling: sichtbar alle 20 s, mobil eingeklappt nur jede Minute (dann zählt nur der "neu"-Hinweis). */
const POLL_MS = 20_000;
const POLL_COLLAPSED_MS = 60_000;

type FoundUser = { id: string; username: string | null; name: string | null; image: string | null };

/**
 * Absprachen eines Events: Nachrichten, Status-Knöpfe ("komme später", "kann nicht", "bin bereit"),
 * angepinnte Orga-Infos, Reaktionen und @-Erwähnungen. Aktualisiert sich alle 20 s, solange sichtbar.
 *
 * collapsedOnMobile: unter lg zunächst eingeklappt (Event läuft bereits) — ab lg immer offen.
 * variant "panel": im Schnellzugriff (Benachrichtigungs-Panel) — ohne Kopf, füllt die volle Höhe.
 */
export default function EventComments({
  eventId, userId, isPlayer, initialUnread = 0, collapsedOnMobile = false, variant = "page", onRead,
}: {
  eventId: string;
  userId: string;
  /** Als Spieler angemeldet (für "Kann nicht" → Abmelden anbieten) */
  isPlayer: boolean;
  initialUnread?: number;
  collapsedOnMobile?: boolean;
  variant?: "page" | "panel";
  /** Wird aufgerufen, nachdem der Lesestand gesetzt wurde (z.B. Zähler im Panel aktualisieren) */
  onRead?: () => void;
}) {
  const isPanel = variant === "panel";
  const router = useRouter();
  const [data, setData] = useState<EventCommentsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(!collapsedOnMobile);
  const [unread, setUnread] = useState(initialUnread);
  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const lastSeenCount = useRef(0);
  const rootRef = useRef<HTMLElement>(null);
  const etagRef = useRef<string | null>(null);
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  // Mit ETag: Hat sich nichts geändert, antwortet der Server mit 304 ohne Inhalt
  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/comments`, {
        cache: "no-store",
        headers: etagRef.current ? { "If-None-Match": etagRef.current } : undefined,
      });
      if (res.status === 304) return;
      if (!res.ok) { setError((await res.json().catch(() => ({}))).error ?? "Absprachen konnten nicht geladen werden"); return; }
      etagRef.current = res.headers.get("ETag");
      setError(null);
      setData(await res.json());
    } catch { /* offline — beim nächsten Intervall erneut */ }
  }, [eventId]);

  // Laden + Polling, nur solange der Tab sichtbar ist (usePolling)
  usePolling(load, isPanel || open || isDesktop ? POLL_MS : POLL_COLLAPSED_MS);

  // Sprungleiste der Eventseite: eingeklappten Bereich öffnen (Scrollen übernimmt SectionJumpLink)
  useEffect(() => {
    if (isPanel) return;
    const onJump = (e: Event) => { if ((e as CustomEvent).detail === "absprachen") setOpen(true); };
    window.addEventListener(SECTION_JUMP_EVENT, onJump);
    return () => window.removeEventListener(SECTION_JUMP_EVENT, onJump);
  }, [isPanel]);

  // Direktlink (#absprachen, z.B. aus einer Benachrichtigung): aufklappen und hinscrollen
  useEffect(() => {
    if (isPanel || window.location.hash !== "#absprachen") return;
    const t = setTimeout(() => {
      setOpen(true);
      rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 300);
    return () => clearTimeout(t);
  }, [isPanel]);

  // Sichtbar & neue Nachrichten → als gelesen markieren
  const isVisibleNow = () => isPanel || open || isDesktop;
  useEffect(() => {
    if (!data || !isVisibleNow()) return;
    if (data.comments.length !== lastSeenCount.current || unread > 0) {
      lastSeenCount.current = data.comments.length;
      setUnread(0);
      fetch(`/api/events/${eventId}/comments/read`, { method: "POST" }).then(() => onRead?.()).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, open, eventId]);

  // Neue Nachrichten: unten bleiben, wenn man ohnehin unten war
  useEffect(() => {
    const el = listRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [data, open]);

  const pinned = useMemo(() => data?.comments.filter(c => c.pinned) ?? [], [data]);
  const total = data?.comments.length ?? 0;

  return (
    <section id={isPanel ? undefined : "absprachen"} ref={rootRef} className={isPanel ? "flex-1 min-h-0 flex flex-col" : "scroll-mt-24"}>
      {/* Kopf: mobil (eingeklappt) ein Knopf, ab lg eine Überschrift */}
      {!isPanel && <><button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
        className={`w-full glass rounded-2xl px-4 py-3 flex items-center gap-3 text-left lg:hidden ${open ? "mb-3" : ""}`}>
        <MessageCircle className="w-4 h-4 text-teal-300 shrink-0" />
        <span className="text-sm font-semibold text-white">Absprachen</span>
        {total > 0 && <span className="text-xs text-gray-500 tabular-nums">{total}</span>}
        {unread > 0 && !open && (
          <span className="shrink-0 whitespace-nowrap text-[11px] px-1.5 py-0.5 rounded-full bg-teal-500 text-teal-950 font-semibold">{unread} neu</span>
        )}
        {pinned.length > 0 && !open && <span className="text-xs truncate text-amber-300/90 min-w-0">📌 {plainCommentText(pinned[pinned.length - 1].content)}</span>}
        <ChevronDown className={`w-4 h-4 text-gray-500 ml-auto shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <h2 className="hidden lg:flex text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 items-center gap-2">
        <MessageCircle className="w-3.5 h-3.5" /> Absprachen
        {total > 0 && <span className="text-gray-600 normal-case tracking-normal">{total}</span>}
      </h2></>}

      <div className={isPanel ? "flex-1 min-h-0 flex flex-col" : `${open ? "" : "hidden"} lg:block glass rounded-2xl overflow-hidden`}>
        {!data && !error && (
          <div className="p-6 flex justify-center text-gray-500"><Loader2 className="w-5 h-5 animate-spin" /></div>
        )}
        {error && <p className="p-4 text-sm text-rose-300">{error}</p>}
        {data && (
          <>
            {pinned.length > 0 && (
              <div className="shrink-0 border-b border-amber-500/15 bg-amber-500/[0.05] divide-y divide-amber-500/10">
                {pinned.map(c => <PinnedItem key={c.id} c={c} eventId={eventId} canPin={data.canPin} onChange={load} />)}
              </div>
            )}

            {data.summary && <AttendanceBar summary={data.summary} />}

            {data.canSetStatus && (
              <StatusBar eventId={eventId} myStatus={data.myStatus} isPlayer={isPlayer} readyOpensAt={data.readyOpensAt}
                onPosted={async () => { stickToBottom.current = true; await load(); router.refresh(); }} />
            )}

            <div ref={listRef} onScroll={e => {
              const el = e.currentTarget;
              stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
            }} className={`${isPanel ? "flex-1 min-h-0" : "max-h-[26rem]"} overflow-y-auto overscroll-contain px-3 py-2 space-y-0.5`}>
              {data.comments.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-6">
                  Noch keine Nachrichten. Fragen, Absprachen oder „ich komme etwas später“ — hier rein damit.
                </p>
              )}
              {data.comments.map((c, i) => {
                const prev = data.comments[i - 1];
                const grouped = !!prev && prev.user.id === c.user.id && prev.kind === "text" && c.kind === "text"
                  && new Date(c.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60_000;
                return c.kind === "status"
                  ? <StatusItem key={c.id} c={c} />
                  : <MessageItem key={c.id} c={c} grouped={grouped} isMe={c.user.id === userId} eventId={eventId}
                      canPin={data.canPin} locked={data.locked} onChange={load} />;
              })}
            </div>

            {data.locked ? (
              <p className="shrink-0 border-t border-line px-4 py-3 text-xs text-gray-500">🔒 Die Absprachen zu diesem Event sind geschlossen.</p>
            ) : (
              <Composer eventId={eventId} onSent={async () => { stickToBottom.current = true; await load(); }} />
            )}
          </>
        )}
      </div>
    </section>
  );
}

// ── Zeit ──────────────────────────────────────────────────────────────────────

function timeLabel(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return "gerade";
  if (diff < 60 * 60_000) return `vor ${Math.floor(diff / 60_000)} min`;
  if (isSameBerlinDay(d, new Date())) return `${formatBerlinTime(d, { hour: "2-digit", minute: "2-digit" })} Uhr`;
  return formatBerlinDateTime(d, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

// ── Inhalt ────────────────────────────────────────────────────────────────────

function CommentText({ content }: { content: string }) {
  return (
    <p className="text-sm text-gray-200 whitespace-pre-wrap break-words">
      {parseCommentSegments(content).map((s, i) => {
        if (s.type === "mention") {
          return <Link key={i} href={`/profile/${s.userId}`} className="text-teal-300 font-medium hover:underline">@{s.name}</Link>;
        }
        if (s.type === "link") {
          return <a key={i} href={s.href} target="_blank" rel="noopener noreferrer nofollow" className="text-teal-300 underline break-all">{s.href}</a>;
        }
        return <span key={i}>{s.text}</span>;
      })}
    </p>
  );
}

async function api(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Das hat nicht geklappt");
  return json;
}

function PinnedItem({ c, eventId, canPin, onChange }: { c: EventCommentDTO; eventId: string; canPin: boolean; onChange: () => void }) {
  return (
    <div className="px-4 py-2.5 flex items-start gap-2">
      <span className="shrink-0 mt-0.5" aria-hidden>📌</span>
      <div className="flex-1 min-w-0">
        <CommentText content={c.content} />
        <p className="text-[11px] text-amber-200/60 mt-0.5">
          {c.user.name} · {timeLabel(c.createdAt)}{c.mirrored && " · auch auf Discord"}
        </p>
      </div>
      {canPin && (
        <button type="button" title="Lösen" aria-label="Nachricht lösen"
          onClick={() => api(`/api/events/${eventId}/comments/${c.id}`, "PATCH", { pinned: false }).then(onChange).catch(e => toast.error(e.message))}
          className="shrink-0 p-1 rounded-lg text-amber-200/60 hover:text-white hover:bg-line">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

function StatusItem({ c }: { c: EventCommentDTO }) {
  const tone = c.status === "late" ? "text-amber-300" : c.status === "absent" ? "text-rose-300" : "text-emerald-300";
  return (
    <div className="flex items-center gap-2 py-1.5 px-1 text-xs">
      <RankedAvatar userId={c.user.id} src={c.user.image} alt={c.user.name} size={18} variant="flat" />
      <span className="text-gray-300 font-medium truncate">{c.user.name}</span>
      <span className={`${tone} truncate`}>{c.content}</span>
      <span className="text-gray-600 ml-auto shrink-0">{timeLabel(c.createdAt)}</span>
    </div>
  );
}

function MessageItem({ c, grouped, isMe, eventId, canPin, locked, onChange }: {
  c: EventCommentDTO; grouped: boolean; isMe: boolean; eventId: string; canPin: boolean; locked: boolean; onChange: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(c.content);
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const base = `/api/events/${eventId}/comments/${c.id}`;

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try { await fn(); onChange(); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className={`group relative flex gap-2.5 rounded-xl px-1.5 ${grouped ? "pt-0.5 pb-1" : "pt-2 pb-1"} hover:bg-surface-2`}>
      <div className="w-7 shrink-0">
        {!grouped && <RankedAvatar userId={c.user.id} src={c.user.image} alt={c.user.name} size={28} variant="flat" />}
      </div>
      <div className="flex-1 min-w-0">
        {!grouped && (
          <p className="flex items-baseline gap-2 text-xs mb-0.5">
            <Link href={isMe ? "/profile" : `/profile/${c.user.id}`} className={`font-semibold truncate ${isMe ? "text-primary-fg" : "text-white"} hover:underline`}>
              {c.user.name}
            </Link>
            <span className="text-gray-600 shrink-0">{timeLabel(c.createdAt)}</span>
            {c.pinned && <span className="text-amber-300 shrink-0" title="Angepinnt">📌</span>}
          </p>
        )}
        {editing ? (
          <div className="space-y-1.5">
            <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={2} autoFocus
              className="w-full rounded-lg bg-black/30 border border-line-strong px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-teal-500/50" />
            <div className="flex gap-2 text-xs">
              <button type="button" disabled={busy} onClick={() => run(async () => { await api(base, "PATCH", { content: draft }); setEditing(false); })}
                className="px-2.5 py-1 rounded-lg bg-teal-500 text-teal-950 font-semibold disabled:opacity-50">Speichern</button>
              <button type="button" onClick={() => { setEditing(false); setDraft(c.content); }} className="px-2.5 py-1 rounded-lg text-gray-400 hover:text-white">Abbrechen</button>
            </div>
          </div>
        ) : (
          <>
            <CommentText content={c.content} />
            {c.edited && <span className="text-[10px] text-gray-600">(bearbeitet)</span>}
          </>
        )}

        {c.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {c.reactions.map(r => (
              <button key={r.emoji} type="button" disabled={locked || busy} title={r.users.join(", ")}
                onClick={() => run(() => api(`${base}/reactions`, "POST", { emoji: r.emoji }))}
                className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full border transition-colors ${
                  r.mine ? "bg-teal-500/15 border-teal-500/40 text-teal-200" : "bg-surface-2 border-line-strong text-gray-300 hover:bg-line"}`}>
                <span>{r.emoji}</span><span className="tabular-nums">{r.count}</span>
              </button>
            ))}
          </div>
        )}
        {picker && !locked && (
          <div className="flex gap-1 mt-1">
            {REACTION_EMOJIS.map(e => (
              <button key={e} type="button" onClick={() => { setPicker(false); run(() => api(`${base}/reactions`, "POST", { emoji: e })); }}
                className="text-base w-8 h-8 rounded-lg hover:bg-line active:scale-95">{e}</button>
            ))}
          </div>
        )}
      </div>

      {/* Aktionen: Desktop beim Hover, mobil dezent immer sichtbar */}
      {!locked && !editing && (
        <div className="flex items-start gap-0.5 shrink-0 opacity-60 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity sm:absolute sm:right-1 sm:top-1 sm:rounded-lg sm:bg-[#121418]/95 sm:border sm:border-line-strong">
          <IconBtn label="Reagieren" onClick={() => setPicker(p => !p)}><Smile className="w-3.5 h-3.5" /></IconBtn>
          {canPin && (
            <IconBtn label={c.pinned ? "Lösen" : "Anpinnen"} onClick={() => run(async () => {
              const r = await api(base, "PATCH", { pinned: !c.pinned });
              if (!c.pinned) toast.success(r.mirrored ? "Angepinnt und auf Discord geteilt" : "Angepinnt");
            })}>
              <span className="text-[11px] leading-none">📌</span>
            </IconBtn>
          )}
          {c.canEdit && <IconBtn label="Bearbeiten" onClick={() => setEditing(true)}><Pencil className="w-3.5 h-3.5" /></IconBtn>}
          {c.canDelete && (
            <IconBtn label="Löschen" onClick={() => { if (confirm("Nachricht löschen?")) run(() => api(base, "DELETE")); }}>
              <Trash2 className="w-3.5 h-3.5" />
            </IconBtn>
          )}
        </div>
      )}
    </div>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" title={label} aria-label={label} onClick={onClick}
      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-line">
      {children}
    </button>
  );
}

// ── Veranstalter-Übersicht ────────────────────────────────────────────────────

type AttendanceKey = "ready" | "late" | "absent" | "none";

/** Für Event-Verwalter: Rückmeldungen der Spieler auf einen Blick, Antippen zeigt die Namen. */
function AttendanceBar({ summary }: { summary: AttendanceSummary }) {
  const [openKey, setOpenKey] = useState<AttendanceKey | null>(null);
  const total = summary.ready.length + summary.late.length + summary.absent.length + summary.none.length;
  if (total === 0) return null;
  const items: { key: AttendanceKey; icon: string; label: string; count: number; tone: string }[] = [
    { key: "ready", icon: "✅", label: "bereit", count: summary.ready.length, tone: "text-emerald-300" },
    { key: "late", icon: "⏰", label: "später", count: summary.late.length, tone: "text-amber-300" },
    { key: "absent", icon: "❌", label: "sagen ab", count: summary.absent.length, tone: "text-rose-300" },
    { key: "none", icon: "❔", label: "ohne Rückmeldung", count: summary.none.length, tone: "text-gray-300" },
  ];
  const names = openKey === "late"
    ? summary.late.map(l => `${l.name}${l.lateMin ? ` (+${l.lateMin} min)` : ""}`)
    : openKey ? summary[openKey] : [];
  return (
    <div className="shrink-0 border-b border-line px-3 py-2 bg-surface-2">
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-[11px] text-gray-500 mr-1">Rückmeldungen ({total} Spieler):</span>
        {items.filter(i => i.count > 0).map(i => (
          <button key={i.key} type="button" onClick={() => setOpenKey(k => (k === i.key ? null : i.key))} aria-expanded={openKey === i.key}
            className={`px-2 py-1 rounded-lg border transition-colors ${openKey === i.key ? "bg-line border-white/25" : "border-line-strong hover:bg-line"} ${i.tone}`}>
            {i.icon} {i.count} {i.label}
          </button>
        ))}
      </div>
      {openKey && names.length > 0 && <p className="text-xs text-gray-300 mt-1.5 leading-relaxed">{names.join(", ")}</p>}
    </div>
  );
}

// ── Status-Knöpfe ─────────────────────────────────────────────────────────────

export function StatusBar({ eventId, myStatus, isPlayer, readyOpensAt, onPosted, compact = false }: {
  eventId: string;
  myStatus: EventCommentsResponse["myStatus"];
  isPlayer: boolean;
  /** Events mit Check-in: „Bin bereit“ erst ab diesem Zeitpunkt (30 Min. vor Start) */
  readyOpensAt: string | null;
  onPosted: () => Promise<void>;
  /** Ohne Rahmen/Beschriftung (Schnellzugriff im Panel) */
  compact?: boolean;
}) {
  const [lateOpen, setLateOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function post(status: CommentStatus, lateMin?: number) {
    setBusy(true);
    try {
      const r = await api(`/api/events/${eventId}/comments`, "POST", { status, lateMin });
      setLateOpen(false);
      if (status === "ready") toast.success(r.checkedIn ? "Bereit gemeldet und eingecheckt 🎮" : "Bereit gemeldet");
      else toast.success("Bescheid gegeben — danke!");
      if (status === "absent" && isPlayer && confirm("Möchtest du dich auch vom Event abmelden? Dein Platz wird dann frei.")) {
        const res = await fetch(`/api/events/${eventId}/register`, { method: "DELETE" });
        if (res.ok) toast("Abgemeldet");
        else toast.error((await res.json().catch(() => ({}))).error ?? "Abmelden hat nicht geklappt");
      }
      await onPosted();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const chip = (active: boolean) =>
    `text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-colors disabled:opacity-50 ${
      active ? "bg-line border-white/25 text-white" : "bg-surface-2 border-line-strong text-gray-300 hover:bg-line"}`;

  return (
    <div className={compact ? "" : "shrink-0 border-b border-line px-3 py-2.5"}>
      <div className="flex flex-wrap items-center gap-1.5">
        {!compact && <span className="text-[11px] text-gray-500 mr-1">Kurz Bescheid geben:</span>}
        <button type="button" disabled={busy} onClick={() => setLateOpen(o => !o)} className={chip(myStatus?.status === "late")}>⏰ Komme später</button>
        <button type="button" disabled={busy} onClick={() => post("absent")} className={chip(myStatus?.status === "absent")}>❌ Kann nicht</button>
        {readyLocked(readyOpensAt) ? (
          <span className="text-xs px-2.5 py-1.5 rounded-lg border border-line text-gray-500" title="„Bin bereit“ ist erst 30 Minuten vor Eventbeginn möglich">
            ⏳ Bereit ab {formatBerlinTime(readyOpensAt!)} Uhr
          </span>
        ) : (
          <button type="button" disabled={busy} onClick={() => post("ready")} className={chip(myStatus?.status === "ready")}>✅ Bin bereit</button>
        )}
      </div>
      {lateOpen && (
        <div className="flex items-center gap-1.5 mt-2">
          <span className="text-[11px] text-gray-500 mr-1">Etwa</span>
          {LATE_OPTIONS.map(m => (
            <button key={m} type="button" disabled={busy} onClick={() => post("late", m)} className={chip(false)}>+{m} min</button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Eingabe mit @-Erwähnungen ────────────────────────────────────────────────

function Composer({ eventId, onSent }: { eventId: string; onSent: () => Promise<void> }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [results, setResults] = useState<FoundUser[]>([]);
  const ref = useRef<HTMLTextAreaElement>(null);
  const pendingCaret = useRef<number | null>(null);
  const visibleLength = plainCommentText(text).length;

  // "@abc" direkt vor dem Cursor → Spielersuche
  function updateMention(value: string, caret: number) {
    const m = value.slice(0, caret).match(/(?:^|\s)@([^\s@\[\]()]{2,30})$/);
    setMentionQuery(m ? m[1] : null);
  }

  useEffect(() => {
    if (!mentionQuery) return; // Ergebnisse werden ohne Suchbegriff ohnehin nicht angezeigt
    const t = setTimeout(() => {
      fetch(`/api/users/search?q=${encodeURIComponent(mentionQuery)}`).then(r => r.ok ? r.json() : []).then(setResults).catch(() => {});
    }, 200);
    return () => clearTimeout(t);
  }, [mentionQuery]);

  function pickMention(u: FoundUser) {
    const el = ref.current;
    if (!el || mentionQuery === null) return;
    const caret = el.selectionStart;
    const start = caret - mentionQuery.length - 1;
    const token = `${mentionToken(u.username ?? u.name ?? "Spieler", u.id)} `;
    const next = text.slice(0, start) + token + text.slice(caret);
    pendingCaret.current = start + token.length;
    setText(next);
    setMentionQuery(null);
  }

  // Cursor nach dem Einfügen einer Erwähnung direkt hinter das Token setzen (vor dem nächsten Tastendruck)
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || pendingCaret.current === null) return;
    el.focus();
    el.selectionStart = el.selectionEnd = pendingCaret.current;
    pendingCaret.current = null;
  }, [text]);

  // Höhe an den Text anpassen (max. ~6 Zeilen). Leeres Feld: Höhe aus dem CSS (min-h). Nicht messen,
  // solange das Feld unsichtbar ist (eingeklappter Bereich, display: none) — sonst wird Höhe 0 fest-
  // geschrieben. Rahmen mitrechnen (border-box), sonst ist das Feld 2 px zu niedrig.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!text) { el.style.height = ""; return; }
    if (el.offsetParent === null) return;
    el.style.height = "auto";
    const border = el.offsetHeight - el.clientHeight;
    el.style.height = `${Math.min(el.scrollHeight + border, 160)}px`;
  }, [text]);

  async function send() {
    if (!text.trim() || sending || visibleLength > COMMENT_MAX_LENGTH) return;
    setSending(true);
    try {
      await api(`/api/events/${eventId}/comments`, "POST", { content: text });
      setText("");
      setMentionQuery(null);
      await onSent();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="relative shrink-0 border-t border-line p-2.5">
      {mentionQuery && results.length > 0 && (
        <div className="absolute bottom-full left-2.5 right-2.5 mb-1 glass-heavy rounded-card border border-line-strong overflow-hidden z-20">
          {results.map(u => (
            <button key={u.id} type="button" onMouseDown={e => { e.preventDefault(); pickMention(u); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-white hover:bg-line">
              <RankedAvatar userId={u.id} src={u.image} alt={u.username ?? u.name ?? ""} size={20} variant="flat" />
              {u.username ?? u.name}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2">
        <textarea ref={ref} value={text} rows={1} maxLength={1500}
          placeholder="Nachricht (@ zum Erwähnen)"
          onChange={e => { setText(e.target.value); updateMention(e.target.value, e.target.selectionStart); }}
          onKeyDown={e => {
            // Desktop: Enter sendet, Shift+Enter = neue Zeile. Auf Touch-Geräten macht Enter eine neue Zeile.
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia("(pointer: fine)").matches) {
              e.preventDefault();
              send();
            }
            if (e.key === "Escape") setMentionQuery(null);
          }}
          className="block flex-1 min-w-0 min-h-10 resize-none rounded-xl bg-black/30 border border-line-strong px-3 py-2 text-[16px] leading-6 sm:text-sm sm:leading-5 text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-500/50" />
        <button type="button" onClick={send} disabled={sending || !text.trim() || visibleLength > COMMENT_MAX_LENGTH}
          aria-label="Senden"
          className="shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-teal-500 text-teal-950 hover:bg-teal-400 disabled:opacity-40 transition-colors">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
      {visibleLength > COMMENT_MAX_LENGTH - 100 && (
        <p className={`text-[11px] mt-1 text-right tabular-nums ${visibleLength > COMMENT_MAX_LENGTH ? "text-rose-400" : "text-gray-500"}`}>
          {visibleLength}/{COMMENT_MAX_LENGTH}
        </p>
      )}
    </div>
  );
}
