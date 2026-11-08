import type { CSSProperties, ReactNode } from "react";

export type NameTag = "span" | "p" | "div" | "h1" | "h2" | "h3";
import { getCosmeticOf } from "@/lib/cosmetics/catalog";

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

/** Titel-Zeile unter dem Namen (gekauft oder per Ansehen freigeschaltet). */
export function CosmeticTitle({ title, className = "" }: { title?: string | null; className?: string }) {
  const t = getCosmeticOf(title, "title");
  if (!t) return null;
  return (
    <span
      className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-[0.12em] ${className}`}
      style={{ color: t.color, textShadow: `0 0 10px ${t.color}55` }}
    >
      {t.text}
    </span>
  );
}
