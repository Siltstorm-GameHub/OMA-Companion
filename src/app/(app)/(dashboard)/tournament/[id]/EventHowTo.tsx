import { Check } from "@/components/icons";
import { formatBerlinTime } from "@/lib/time";

export type HowToStep = { key: string; label: string; hint?: string; state: "done" | "current" | "todo" };

/**
 * Schritte "So läuft's ab" mit dem eigenen Stand (rein, testbar über event-howto.test.ts).
 * Turniere: Anmelden → (Check-in) → (Auslosung) → Spielen & melden → Abschluss.
 */
export function howToSteps(o: {
  registered: boolean;
  waitlistPos: number | null;
  checkInEnabled: boolean;
  checkInOpensAt: Date | null;
  checkedIn: boolean;
  checkInOpen: boolean;
  hasDraw: boolean;
  drawn: boolean;
  started: boolean;
}): HowToStep[] {
  const steps: HowToStep[] = [];
  steps.push({
    key: "register",
    label: o.registered ? "Angemeldet" : o.waitlistPos ? `Warteliste · Platz ${o.waitlistPos}` : "Anmelden",
    hint: o.registered ? undefined : o.waitlistPos ? "Wird ein Platz frei, rückst du automatisch nach." : undefined,
    state: o.registered ? "done" : "current",
  });
  if (o.checkInEnabled) {
    const at = o.checkInOpensAt ? `ab ${formatBerlinTime(o.checkInOpensAt, { hour: "2-digit", minute: "2-digit" })} Uhr` : "kurz vor dem Start";
    steps.push({
      key: "checkin",
      label: o.checkedIn ? "Bereit gemeldet" : `Check-in ${at}`,
      hint: o.checkedIn ? undefined : "„Bin bereit“ drücken, sonst wirst du nicht ausgelost.",
      state: o.checkedIn ? "done" : o.registered && o.checkInOpen && !o.drawn ? "current" : "todo",
    });
  }
  if (o.hasDraw) {
    steps.push({
      key: "draw",
      label: o.drawn ? "Ausgelost" : "Auslosung",
      hint: o.drawn ? undefined : "Danach bekommst du eine Meldung mit deinem ersten Gegner.",
      state: o.drawn ? "done" : o.registered && (!o.checkInEnabled || o.checkedIn) ? "current" : "todo",
    });
  }
  steps.push({
    key: "play",
    label: "Spielen & Ergebnis melden",
    hint: "Mit Screenshot. Bestätigt dein Gegner, gilt es sofort.",
    state: o.started ? "current" : o.registered && o.drawn ? "current" : "todo",
  });
  steps.push({ key: "finish", label: "Abschluss & Belohnung", hint: "Nach dem Event durch den Veranstalter.", state: "todo" });
  // Nur einen "current"-Schritt zeigen: den ersten
  let seen = false;
  return steps.map(s => {
    if (s.state !== "current") return s;
    if (seen) return { ...s, state: "todo" as const };
    seen = true;
    return s;
  });
}

// ── Ablauf-Leiste (für alle sichtbar, unter dem Kopf) ──────────────────────────────────────────

export type TimelineStep = { key: string; label: string; time?: string | null; state: "done" | "current" | "todo" };

/**
 * Ablauf des ganzen Events: Anmeldung → (Bereit melden) → (Auslosung) → Spielen → (Abstimmung) → Ergebnis.
 * Erledigt ist, was die Phase schon hinter sich hat; "current" ist der erste offene Schritt.
 */
export function eventTimeline(o: {
  phase: "before" | "drawn" | "live" | "voting" | "after";
  now?: Date;
  registrationClosesAt: Date | null;
  checkInAt: Date | null;
  hasDraw: boolean;
  drawn: boolean;
  startAt: Date;
  endAt: Date | null;
  period: boolean;
  hasVoting: boolean;
}): TimelineStep[] {
  const now = o.now ?? new Date();
  const t = (d: Date) => formatBerlinTime(d, { hour: "2-digit", minute: "2-digit" });
  const started = o.phase === "live" || o.phase === "voting" || o.phase === "after";
  const raw: { key: string; label: string; time?: string | null; done: boolean }[] = [
    {
      key: "reg", label: o.period ? "Einsteigen" : "Anmeldung",
      time: o.registrationClosesAt ? `bis ${t(o.registrationClosesAt)}` : null,
      done: o.drawn || started || (!!o.checkInAt && now >= o.checkInAt),
    },
  ];
  if (o.checkInAt) raw.push({ key: "ready", label: "Bereit melden", time: `ab ${t(o.checkInAt)}`, done: o.drawn || started });
  if (o.hasDraw) raw.push({ key: "draw", label: "Auslosung", done: o.drawn || started });
  raw.push({
    key: "play", label: o.period ? "Läuft" : "Spielen",
    time: o.period && o.endAt ? `bis ${formatBerlinTime(o.endAt, { day: "2-digit", month: "2-digit" })}` : t(o.startAt),
    done: o.phase === "voting" || o.phase === "after",
  });
  if (o.hasVoting) raw.push({ key: "vote", label: "Abstimmung", done: o.phase === "after" });
  raw.push({ key: "result", label: "Ergebnis", done: o.phase === "after" });
  let current = false;
  return raw.map(s => {
    if (s.done) return { key: s.key, label: s.label, time: s.time, state: "done" as const };
    if (!current) { current = true; return { key: s.key, label: s.label, time: s.time, state: "current" as const }; }
    return { key: s.key, label: s.label, time: s.time, state: "todo" as const };
  });
}

/**
 * Schmale Ablauf-Leiste: wo das Event gerade steht, mit Uhrzeiten (ersetzt den Kasten "So läuft es ab").
 * Am Handy nur die Punkte über die volle Breite und darunter der aktuelle Schritt in Worten.
 */
export function EventTimeline({ steps, className = "" }: { steps: TimelineStep[]; className?: string }) {
  const currentIdx = steps.findIndex(s => s.state === "current");
  const current = currentIdx >= 0 ? steps[currentIdx] : null;
  const dot = (s: TimelineStep, i: number) => (
    <span className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-extrabold ${
      s.state === "done" ? "bg-primary text-primary-ink"
        : s.state === "current" ? "bg-surface ring-2 ring-primary text-primary-fg"
          : "bg-surface-3 text-subtle"
    }`}>
      {s.state === "done" ? <Check className="size-3.5" /> : i + 1}
    </span>
  );
  return (
    <nav aria-label="Ablauf" className={className}>
      {/* Handy: Punkte über die volle Breite, darunter der aktuelle Schritt */}
      <div className="sm:hidden">
        <ol className="flex items-center">
          {steps.map((s, i) => (
            <li key={s.key} className={`flex items-center ${i > 0 ? "flex-1" : ""}`} aria-current={s.state === "current" ? "step" : undefined} title={s.label}>
              {i > 0 && <span className={`mx-1 h-0.5 flex-1 rounded-full ${s.state === "todo" ? "bg-line-strong" : "bg-primary/60"}`} aria-hidden />}
              {dot(s, i)}
            </li>
          ))}
        </ol>
        <p className="mt-1.5 text-xs text-muted">
          {current
            ? <>Schritt {currentIdx + 1} von {steps.length}: <b className="text-fg">{current.label}</b>{current.time && <span className="font-bold text-primary-fg"> · {current.time}</span>}</>
            : <>Abgeschlossen</>}
        </p>
      </div>
      {/* Ab Tablet: mit Beschriftung und Uhrzeiten */}
      <ol className="hidden sm:flex items-start">
        {steps.map((s, i) => (
          <li key={s.key} className="flex flex-1 items-start" aria-current={s.state === "current" ? "step" : undefined}>
            {i > 0 && <span className={`mt-[11px] h-0.5 flex-1 min-w-4 rounded-full ${s.state === "todo" ? "bg-line-strong" : "bg-primary/60"}`} aria-hidden />}
            <span className="flex w-[5.5rem] shrink-0 flex-col items-center gap-1 text-center">
              {dot(s, i)}
              <span className={`text-xs leading-tight ${s.state === "current" ? "font-extrabold text-fg" : s.state === "done" ? "font-semibold text-muted" : "font-semibold text-subtle"}`}>{s.label}</span>
              {s.time && <span className={`text-[11px] tabular-nums leading-tight ${s.state === "current" ? "text-primary-fg font-bold" : "text-subtle"}`}>{s.time}</span>}
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
