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

/** Kasten "So läuft's ab" (vor dem Start, bei Turnieren) — zeigt auch, wo man selbst gerade steht. */
export default function EventHowTo({ steps }: { steps: HowToStep[] }) {
  return (
    <section aria-label="So läuft's ab" className="glass rounded-2xl px-4 py-3 mb-5">
      <h2 className="text-base font-extrabold text-fg mb-2.5">So läuft&apos;s ab</h2>
      <ol className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
        {steps.map((s, i) => (
          <li key={s.key} className={`flex items-start gap-2 rounded-xl px-3 py-2 sm:flex-1 sm:min-w-[10rem] border ${
            s.state === "current" ? "border-primary/40 bg-primary/[0.07]"
              : s.state === "done" ? "border-line bg-surface-2 opacity-75"
                : "border-line"
          }`}>
            <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              s.state === "done" ? "bg-primary/20 text-primary-fg" : s.state === "current" ? "bg-primary text-primary-ink" : "bg-line text-gray-400"
            }`}>
              {s.state === "done" ? <Check className="w-3 h-3" /> : i + 1}
            </span>
            <span className="min-w-0">
              <span className={`block text-sm ${s.state === "current" ? "text-white font-semibold" : "text-gray-300"}`}>{s.label}</span>
              {s.hint && s.state !== "done" && <span className="block text-xs text-gray-500">{s.hint}</span>}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
