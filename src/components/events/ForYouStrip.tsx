import Link from "next/link";
import { Glyph, type GlyphName } from "@/components/ui/Glyph";
import { ChevronRight } from "@/components/icons";

export type ForYouItem = {
  key: string;
  tone: "teal" | "amber" | "violet";
  glyph: GlyphName;
  title: string;
  text?: string;
  href: string;
  cta: string;
};

const TONE: Record<ForYouItem["tone"], { icon: string; cta: string }> = {
  teal:   { icon: "bg-primary-soft text-primary-fg", cta: "bg-primary text-primary-ink hover:bg-primary-hover" },
  amber:  { icon: "bg-warning-soft text-warning",    cta: "bg-warning text-canvas hover:brightness-110" },
  violet: { icon: "bg-violet-500/15 text-violet-300", cta: "bg-primary text-primary-ink hover:bg-primary-hover" },
};

/**
 * "Für dich" oben auf der Eventliste (eingeloggt): was dich gerade betrifft — Bereit melden, Gegner-
 * Meldung bestätigen, abstimmen, dein nächstes Event. Kurzfassung der Karte auf der Detailseite;
 * jede Zeile führt dorthin. Ersetzt den großen "Dein nächstes Event"-Kopf.
 */
export default function ForYouStrip({ items }: { items: ForYouItem[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-label="Für dich" className="rounded-card border border-primary/30 bg-surface shadow-card p-3 sm:p-4">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-subtle">Für dich</p>
      <ul className="divide-y divide-line">
        {items.map(it => (
          <li key={it.key}>
            <Link href={it.href} className="group flex min-h-14 items-center gap-3 py-2">
              <span className={`grid size-10 shrink-0 place-items-center rounded-control ${TONE[it.tone].icon}`}><Glyph name={it.glyph} className="size-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-extrabold text-fg group-hover:text-primary-fg">{it.title}</span>
                {it.text && <span className="block truncate text-xs text-muted">{it.text}</span>}
              </span>
              <span className={`hidden sm:inline-flex min-h-9 shrink-0 items-center rounded-control px-3.5 text-sm font-bold transition-colors ${TONE[it.tone].cta}`}>{it.cta}</span>
              <ChevronRight className="size-4 shrink-0 text-subtle sm:hidden" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
