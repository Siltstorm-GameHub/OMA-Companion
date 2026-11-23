import type { ReactNode } from "react";
import { Glyph, type GlyphName } from "@/components/ui/Glyph";

export type ForYouTone = "teal" | "amber" | "muted" | "gold" | "danger";

export type ForYou = {
  tone: ForYouTone;
  glyph: GlyphName;
  title: ReactNode;
  text?: ReactNode;
  /** Ein Knopf (oder eine kleine Gruppe) rechts bzw. am Handy darunter */
  action?: ReactNode;
};

const TONE: Record<ForYouTone, { card: string; icon: string }> = {
  teal:   { card: "border-primary/40",  icon: "bg-primary-soft text-primary-fg" },
  amber:  { card: "border-warning/40",  icon: "bg-warning-soft text-warning" },
  muted:  { card: "border-line",        icon: "bg-surface-3 text-muted" },
  gold:   { card: "border-coin/40",     icon: "bg-coin-soft text-coin" },
  danger: { card: "border-danger/40",   icon: "bg-danger-soft text-danger" },
};

/**
 * "Für dich" auf der Eventseite: genau das Nächste, was dich betrifft — Bereit melden, dein Match,
 * Warteliste, Abstimmen, dein Ergebnis. Eine Karte statt verstreuter Hinweise in Kopf, Aktionsleiste
 * und Abschnitten. Am Handy unter dem Kopf, am großen Bildschirm oben in der Seitenspalte.
 */
export default function ForYouCard({ data, className = "" }: { data: ForYou; className?: string }) {
  const t = TONE[data.tone];
  return (
    <section aria-label="Für dich" className={`rounded-card border bg-surface shadow-card p-4 ${t.card} ${className}`}>
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-subtle">Für dich</p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
        <span className={`grid size-10 shrink-0 place-items-center rounded-control ${t.icon}`}><Glyph name={data.glyph} className="size-5" /></span>
        <div className="min-w-0 flex-1 basis-40">
          <p className="text-base font-extrabold leading-snug text-fg">{data.title}</p>
          {data.text && <p className="mt-0.5 text-sm text-muted">{data.text}</p>}
        </div>
        {data.action && <div className="flex flex-wrap items-center gap-2">{data.action}</div>}
      </div>
    </section>
  );
}
