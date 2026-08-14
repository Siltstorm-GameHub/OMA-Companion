import Image from "next/image";
import type { Pokal } from "@prisma/client";
import { POKAL_CATEGORY_IMAGE, getPokalCategoryLabel } from "@/lib/pokal";

type PokalWithOwner = Pokal & { user: { name: string | null; username: string | null } };

interface Props {
  pokale: PokalWithOwner[];
  /** "Eventreihen-Pokal" oder "Pokal" — steuert nur die Überschrift. */
  label?: string;
}

const CATEGORY_BADGE_CLASS: Record<string, string> = {
  competitive: "bg-red-500/15 text-red-300 border-red-500/25",
  fun: "bg-pink-500/15 text-pink-300 border-pink-500/25",
  casual: "bg-sky-500/15 text-sky-300 border-sky-500/25",
  training: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  community_event: "bg-violet-500/15 text-violet-300 border-violet-500/25",
  special: "bg-amber-500/15 text-amber-300 border-amber-500/25",
};

/**
 * Gewinner-Pokale einer einzelnen Event-/Eventreihen-Seite (nicht die persönliche
 * Vitrine — dort läuft die Anzeige über PokalSection). Zeigt pro Gewinner eine Karte
 * mit Name, weil hier (anders als in der Vitrine) mehrere User mit je eigenem Namen
 * auftreten können (Gleichstand).
 */
export default function EventPokalWinners({ pokale, label = "Pokal" }: Props) {
  if (!pokale.length) return null;

  const isSeries = pokale[0]?.isSeries ?? false;
  const boxSize = isSeries ? 132 : 78;
  const imgSize = isSeries ? 108 : 64;

  return (
    <div className="space-y-4">
      <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
        🏆 {label}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {pokale.map((p) => (
          <div
            key={p.id}
            className={`flex flex-col items-center gap-2 rounded-2xl border p-3 ${
              isSeries
                ? "border-amber-500/30 bg-amber-500/[0.06]"
                : "border-white/[0.07] bg-white/[0.03]"
            }`}
          >
            <div
              className="relative flex items-center justify-center"
              style={{ width: boxSize, height: boxSize }}
            >
              <Image
                src={POKAL_CATEGORY_IMAGE[p.category]}
                alt={getPokalCategoryLabel(p.category)}
                width={imgSize}
                height={imgSize}
                className="object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.35)]"
              />
            </div>
            <span
              className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${
                CATEGORY_BADGE_CLASS[p.category] ?? "bg-white/10 text-gray-300 border-white/20"
              }`}
            >
              {getPokalCategoryLabel(p.category)}
            </span>
            <div className="text-center leading-tight">
              <p className="font-serif text-xs text-gray-200" style={{ fontVariant: "small-caps" }}>
                {p.title}
              </p>
              <p className="font-serif text-[10px] text-gray-500 mt-0.5" style={{ fontVariant: "small-caps" }}>
                {p.user.username ?? p.user.name ?? "?"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
