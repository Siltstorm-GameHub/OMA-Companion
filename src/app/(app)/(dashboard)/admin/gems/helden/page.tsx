import Link from "next/link";
import { ArrowLeft } from "@/components/icons";
import HeroFigure from "@/components/gems/HeroFigure";
import HeroBackdrop from "@/components/gems/HeroBackdrop";
import { requireRole } from "@/lib/roles";
import { ART_SLOTS, deliveredArtKeys } from "@/lib/gems/hero/art";
import {
  HERO_ACCESSORIES,
  HERO_BACKDROPS,
  HERO_BASES,
  HERO_EMBLEMS,
  HERO_FACES,
  HERO_HAIRS,
  HERO_HEADGEAR,
  HERO_POSES,
  classOfBase,
  defaultLook,
  type HeroLook,
} from "@/lib/gems/hero/look";

export const metadata = { title: "Helden-Prüfbogen | Admin | OMA" };

// Prüfbogen für Zeichnungen (Phase 10e): jedes Teil auf einer Figur, groß und in Handy-Kartengröße
// (80 px). Zeigt, welche Teile schon als Zeichnung geliefert sind (art/helden, scripts/import-hero-art.ts).
export default async function HeroArtSheetPage() {
  await requireRole("admin");
  const delivered = new Set(deliveredArtKeys());
  const ref = defaultLook("DAMAGE_DEALER");

  const figure = (look: HeroLook, label: string, art?: string) => (
    <div key={label} className="flex flex-col items-center gap-1">
      <div className="flex items-end gap-2">
        <span className="relative block w-[120px] h-[132px] rounded-lg overflow-hidden">
          <HeroBackdrop id={look.backdrop} />
          <HeroFigure look={look} className="relative w-full h-full" />
        </span>
        <span className="relative block w-[80px] h-[88px] rounded-md overflow-hidden" title="Handy-Kartengröße">
          <HeroBackdrop id={look.backdrop} />
          <HeroFigure look={look} className="relative w-full h-full" />
        </span>
      </div>
      <span className="text-[11px] text-gray-300">{label}</span>
      {art && (
        <span className={`text-[10px] ${delivered.has(art) ? "text-teal-300" : "text-gray-500"}`}>
          {delivered.has(art) ? "Zeichnung" : "Code"} · {art}.svg
        </span>
      )}
    </div>
  );

  const section = (title: string, children: React.ReactNode) => (
    <section className="space-y-3">
      <h3 className="font-display text-sm font-bold text-white">{title}</h3>
      <div className="flex flex-wrap gap-4">{children}</div>
    </section>
  );

  return (
    <div className="space-y-8">
      <Link href="/admin/gems" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> OMA Gems
      </Link>
      <div className="space-y-1">
        <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">🎨 Helden-Prüfbogen</h2>
        <p className="text-sm text-gray-300">
          {delivered.size} von {ART_SLOTS.length} Teilen als Zeichnung geliefert, der Rest kommt aus dem Code.
        </p>
        <p className="text-xs text-gray-500">
          Zeichnungen nach <code>art/helden/</code> legen, <code>npx tsx scripts/import-hero-art.ts</code> ausführen, deployen.
          Vorgabe: <code>docs/gems-helden-geruest.md</code>. Jedes Teil ist groß und in Handy-Kartengröße zu sehen.
        </p>
      </div>

      {section(
        "Grundfiguren je Pose",
        HERO_BASES.flatMap((b) =>
          HERO_POSES.map((pose) =>
            figure({ ...defaultLook(classOfBase(b.id)), base: b.id, pose: pose.id }, `${b.label} · ${pose.label}`, `waffe-${b.id}`)
          )
        )
      )}
      {section("Gesichter", HERO_FACES.map((o) => figure({ ...ref, face: o.id }, o.label, `gesicht-${o.id}`)))}
      {section(
        "Frisuren",
        HERO_HAIRS.map((o) => figure({ ...ref, hair: o.id, headgear: "keine" }, o.label, o.id === "glatze" ? undefined : `frisur-${o.id}-vorn`))
      )}
      {section("Kopfbedeckungen", HERO_HEADGEAR.map((o) => figure({ ...ref, headgear: o.id }, o.label, o.id === "keine" ? undefined : `kopfbedeckung-${o.id}-vorn`)))}
      {section(
        "Accessoires",
        HERO_ACCESSORIES.map((o) =>
          figure({ ...ref, accessory: o.id }, o.label, o.id === "keins" ? undefined : o.id === "umhang" ? "accessoire-umhang-hinten" : `accessoire-${o.id}`)
        )
      )}
      {section("Embleme", HERO_EMBLEMS.map((o) => figure({ ...ref, emblem: o.id }, o.label, `emblem-${o.id}`)))}
      {section("Kartenhintergründe", HERO_BACKDROPS.map((o) => figure({ ...ref, backdrop: o.id }, o.label, `hintergrund-${o.id}`)))}

      <section className="space-y-2">
        <h3 className="font-display text-sm font-bold text-white">Alle Teile</h3>
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs">
          {ART_SLOTS.map((s) => (
            <li key={s.key} className={delivered.has(s.key) ? "text-teal-300" : "text-gray-500"}>
              {delivered.has(s.key) ? "✓" : "·"} {s.key}.svg
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
