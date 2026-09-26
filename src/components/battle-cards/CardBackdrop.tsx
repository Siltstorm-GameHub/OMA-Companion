import { BACKDROPS } from "@/lib/dnd/oq-backdrop";
import { isImageBg, type TeCharacterConfig } from "@/lib/te-character";

/** Gewählter Kartenhintergrund (Himmel oben, Boden unten); ohne Auswahl nichts. Liegt absolut hinter der Figur. */
export default function CardBackdrop({ config }: { config: TeCharacterConfig | null | undefined }) {
  if (!config?.bg) return null;
  if (isImageBg(config.bg)) {
    return (
      <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/battle-cards/bg/${config.bg}.webp`} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ imageRendering: "pixelated" }} draggable={false} />
        {config.night && <div className="absolute inset-0 bg-[#050a25]/45" />}
      </div>
    );
  }
  const b = BACKDROPS[config.bg as keyof typeof BACKDROPS];
  return (
    <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden">
      <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${b.sky[0]} 0%, ${b.sky[1]} 62%)` }} />
      <div
        className="absolute inset-x-0 bottom-0 h-[38%]"
        style={{ backgroundImage: `linear-gradient(180deg, rgba(0,0,0,${b.dim * 0.5}), rgba(0,0,0,${b.dim + 0.1})), url(/oq/tex/${b.ground}.png)`, backgroundSize: "auto, 48px 48px", imageRendering: "pixelated", borderTop: "1px solid rgba(0,0,0,0.45)" }}
      />
      {config.night && <div className="absolute inset-0 bg-[#050a25]/50" />}
    </div>
  );
}
