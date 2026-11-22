import type { HTMLAttributes } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Rahmen hebt sich beim Überfahren hervor (für klickbare Karten). */
  interactive?: boolean;
  /** false = kein Innenabstand (z. B. für Listen, die bis an den Rand gehen). */
  padded?: boolean;
}

/** Karte nach dem Designentwurf: feste Fläche, dünner Rand, 20 px Radius. */
export function Card({ interactive, padded = true, className, ...props }: CardProps) {
  return (
    <div
      className={`rounded-card border border-line bg-surface shadow-card ${padded ? "p-4 sm:p-5" : ""} ${
        interactive ? "transition-colors hover:border-line-strong hover:bg-surface-2" : ""
      } ${className ?? ""}`}
      {...props}
    />
  );
}
