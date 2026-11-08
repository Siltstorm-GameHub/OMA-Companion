import type { CSSProperties, ReactNode } from "react";

export type NameTag = "span" | "p" | "div" | "h1" | "h2" | "h3";
import { getCosmeticOf, type JobBadgeTier } from "@/lib/cosmetics/catalog";
import { Briefcase } from "@/components/icons";

/** Stil einer Namensfarbe (einfarbig oder Verlauf per background-clip:text). */
export function nameColorStyle(nameColorId: string | null | undefined): CSSProperties | undefined {
  const c = getCosmeticOf(nameColorId, "nameColor");
  if (!c) return undefined;
  if (c.gradient) {
    return {
      backgroundImage: c.gradient,
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      color: "transparent",
      WebkitTextFillColor: "transparent",
    };
  }
  return { color: c.color };
}

/**
 * Name mit gekaufter Namensfarbe. Rein darstellend (keine Hooks) — der Aufrufer liefert die
 * Farb-ID, z.B. aus getUserLooks() (Server) oder useUserLook() (Client, siehe StyledUserName).
 */
export function CosmeticName({
  nameColor, children, as: Tag = "span", className = "", style,
}: {
  nameColor?: string | null;
  children: ReactNode;
  as?: NameTag;
  className?: string;
  style?: CSSProperties;
}) {
  const s = nameColorStyle(nameColor);
  return <Tag className={className} style={s ? { ...style, ...s } : style}>{children}</Tag>;
}

/** Metall-Optik der Community-Job-Abzeichen: Rand, Hintergrund, Glanz-Verlauf des Stufen-Worts, Leuchten. */
const JOB_BADGE: Record<JobBadgeTier, { stage: string; border: string; bg: string; metal: string; glow: string; icon: string; fx: string }> = {
  silver: {
    stage: "Silber",
    border: "rgba(203,213,225,0.55)",
    bg: "linear-gradient(135deg, rgba(71,85,105,0.55), rgba(15,23,42,0.75) 55%, rgba(100,116,139,0.45))",
    metal: "linear-gradient(90deg, #94a3b8, #f8fafc 45%, #cbd5e1 60%, #94a3b8)",
    glow: "0 0 10px rgba(203,213,225,0.25)",
    icon: "linear-gradient(135deg, #e2e8f0, #64748b)",
    fx: "",
  },
  gold: {
    stage: "Gold",
    border: "rgba(251,191,36,0.7)",
    bg: "linear-gradient(135deg, rgba(120,53,15,0.65), rgba(28,16,4,0.85) 55%, rgba(146,64,14,0.55))",
    metal: "linear-gradient(90deg, #b45309, #fde68a 40%, #fbbf24 60%, #b45309)",
    glow: "0 0 14px rgba(251,191,36,0.35)",
    icon: "linear-gradient(135deg, #fde68a, #b45309)",
    fx: "job-badge-shine",
  },
  platinum: {
    stage: "Platin",
    border: "rgba(165,243,252,0.8)",
    bg: "linear-gradient(135deg, rgba(14,116,144,0.55), rgba(8,20,40,0.85) 50%, rgba(126,34,206,0.45))",
    metal: "linear-gradient(90deg, #67e8f9, #ffffff 35%, #c4b5fd 55%, #a5f3fc 75%, #67e8f9)",
    glow: "0 0 18px rgba(103,232,249,0.45)",
    icon: "linear-gradient(135deg, #ecfeff, #22d3ee 50%, #a78bfa)",
    fx: "job-badge-shine job-badge-pulse",
  },
};

/**
 * Community-Job-Titel als Abzeichen: Aktentaschen-Siegel, „Community-Job“ und die Stufe in Metall-Optik.
 * Gold glänzt, Platin glänzt und leuchtet zusätzlich. Bleibt einzeilig, damit es auch in Listen passt.
 */
function JobTitleBadge({ tier, className = "" }: { tier: JobBadgeTier; className?: string }) {
  const s = JOB_BADGE[tier];
  return (
    <span
      className={`job-badge relative inline-flex items-center gap-1.5 max-w-full overflow-hidden rounded-full border pl-0.5 pr-2 py-0.5 align-middle ${s.fx} ${className}`}
      style={{ borderColor: s.border, background: s.bg, boxShadow: s.glow }}
      title={`Community-Job: ${s.stage} — freigeschaltet über die Community-Jobs`}
    >
      <span className="relative inline-flex items-center justify-center w-4 h-4 rounded-full shrink-0" style={{ background: s.icon }}>
        <Briefcase className="w-2.5 h-2.5" style={{ backgroundColor: "rgba(15,23,42,0.85)" }} />
      </span>
      <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/70 whitespace-nowrap">Community-Job</span>
      <span className="w-px h-2.5 bg-white/25 shrink-0" />
      <span
        className="text-[10px] font-black uppercase tracking-[0.16em] whitespace-nowrap"
        style={{ backgroundImage: s.metal, backgroundSize: "200% 100%", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", WebkitTextFillColor: "transparent" }}
      >
        {s.stage}
      </span>
      {tier === "platinum" && <span aria-hidden className="text-[9px] leading-none text-cyan-100">✦</span>}
    </span>
  );
}

/** Titel-Zeile unter dem Namen (gekauft oder per Ansehen freigeschaltet). */
export function CosmeticTitle({ title, className = "" }: { title?: string | null; className?: string }) {
  const t = getCosmeticOf(title, "title");
  if (!t) return null;
  if (t.jobBadge) return <JobTitleBadge tier={t.jobBadge} className={className} />;
  return (
    <span
      className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-[0.12em] ${className}`}
      style={{ color: t.color, textShadow: `0 0 10px ${t.color}55` }}
    >
      {t.text}
    </span>
  );
}
