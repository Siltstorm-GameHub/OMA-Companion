// ============================================
// MobaDivider — Zierlinie im MOBA-Kit-Stil
// ============================================
// Quelle: Assets/UI/MOBA Style/PNG/DIALOGS/Dividers/hor2.png (dünne Linie +
// Raute). Das Asset selbst hat die Raute am linken Rand -- für eine
// zentrierte Doppel-Raute wird die linke Hälfte gespiegelt (scaleX(-1)) und
// an die unveränderte rechte Hälfte gesetzt, sodass beide Rauten in der
// Mitte aufeinandertreffen.
export default function MobaDivider({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center h-4 ${className}`} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element -- dekorativ, kein Next-Image nötig */}
      <img src="/battle-cards/moba/dividers/hor2.png" alt="" className="flex-1 h-full object-contain" style={{ transform: "scaleX(-1)" }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/battle-cards/moba/dividers/hor2.png" alt="" className="flex-1 h-full object-contain" />
    </div>
  );
}
