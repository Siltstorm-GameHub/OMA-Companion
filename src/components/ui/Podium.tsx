import type { ReactNode } from "react";
import { GateLink } from "@/components/GuestGate";
import RankedAvatar from "@/components/RankedAvatar";

/** Medaillenfarben für Platz 1–3 (Gold = Münz-Gold, Silber, Bronze) — überall gleich */
export const MEDAL = [
  { ring: "ring-coin", badge: "bg-coin text-canvas" },
  { ring: "ring-gray-300", badge: "bg-gray-300 text-canvas" },
  { ring: "ring-amber-700", badge: "bg-amber-700 text-fg" },
] as const;

const SIZES = {
  sm: { avatar: [52, 42, 42], stand: ["h-14", "h-10", "h-7"], ring: "ring-2", badge: "size-5 text-xs -bottom-1.5", name: "mt-2.5 text-sm font-bold", standGap: "mt-2" },
  md: { avatar: [68, 54, 54], stand: ["h-20", "h-14", "h-10"], ring: "ring-[3px]", badge: "size-6 text-xs -bottom-2", name: "mt-3.5 text-sm font-extrabold", standGap: "mt-2.5" },
  lg: { avatar: [84, 64, 64], stand: ["h-28", "h-20", "h-14"], ring: "ring-[3px]", badge: "size-7 text-sm -bottom-2", name: "mt-4 text-sm sm:text-base font-extrabold", standGap: "mt-3" },
} as const;

export type PodiumEntry = {
  id: string;
  /** Anzeigename (auch für alt-Text) */
  name: string;
  image: string | null;
  /** Ziel beim Klick (ohne: nicht klickbar) */
  href?: string;
  isMe?: boolean;
  /** Eigene Darstellung des Namens (z. B. mit Kosmetik/Abzeichen) */
  nameNode?: ReactNode;
  /** Eigener Avatar (z. B. mit Look); sonst RankedAvatar */
  avatar?: (size: number) => ReactNode;
  /** Zeile unter dem Namen (Punkte, Belohnung …) */
  value?: ReactNode;
  /** Weitere Zeile darunter (z. B. Veränderung) */
  below?: ReactNode;
};

/**
 * Siegertreppchen 2 · 1 · 3 — Avatar mit Medaillen-Ring, Platz-Abzeichen, Name, Wert und Sockel.
 * Eine Komponente für Rangliste, Übersicht und Eventseite. `entries[0]` ist Platz 1; 1–3 Einträge.
 */
export function Podium({ entries, size = "md", className = "" }: { entries: PodiumEntry[]; size?: keyof typeof SIZES; className?: string }) {
  const s = SIZES[size];
  const shown = entries.slice(0, 3);
  // Reihenfolge auf dem Treppchen: 2 · 1 · 3 (bei weniger Plätzen entsprechend kürzer)
  const order = shown.length === 3 ? [1, 0, 2] : shown.length === 2 ? [1, 0] : [0];
  const cols = shown.length === 3 ? "grid-cols-3" : shown.length === 2 ? "grid-cols-2 max-w-sm mx-auto" : "grid-cols-1 max-w-[12rem] mx-auto";

  return (
    <ol className={`grid ${cols} items-end gap-2 sm:gap-4 ${className}`} aria-label="Siegertreppchen">
      {order.map(i => {
        const e = shown[i];
        const px = s.avatar[i];
        const inner = (
          <>
            <span className="relative">
              <span className={`block rounded-full ${s.ring} ${MEDAL[i].ring}`}>
                {e.avatar ? e.avatar(px) : <RankedAvatar userId={e.id} src={e.image} alt={e.name} size={px} rounded="full" />}
              </span>
              <span className={`absolute left-1/2 grid -translate-x-1/2 place-items-center rounded-full font-extrabold ${s.badge} ${MEDAL[i].badge}`}>{i + 1}</span>
            </span>
            <span className={`${s.name} max-w-full truncate ${e.isMe ? "text-primary-fg" : "text-fg"} ${e.href ? "group-hover:text-primary-fg" : ""}`}>
              {e.nameNode ?? e.name}{e.isMe && <span className="ml-1 text-xs font-semibold text-subtle">(du)</span>}
            </span>
            {e.value && <span className="text-xs font-bold tabular-nums text-muted">{e.value}</span>}
            {e.below}
            <span className={`${s.standGap} w-full rounded-t-control bg-surface-2 ${s.stand[i]}`} aria-hidden />
          </>
        );
        return (
          <li key={e.id} className="min-w-0">
            {e.href
              ? <GateLink href={e.href} className="group flex min-w-0 flex-col items-center text-center">{inner}</GateLink>
              : <div className="flex min-w-0 flex-col items-center text-center">{inner}</div>}
          </li>
        );
      })}
    </ol>
  );
}
