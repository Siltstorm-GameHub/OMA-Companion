import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";

/*
 * Tabellen-Baustein (Rangliste, Reihen-Tabellen, Turnier-Tabellen, Admin-Listen):
 * Karte mit fester Kopfzeile, ruhigen Trennlinien, Hervorhebung der eigenen Zeile und
 * waagerechtem Scrollen am Handy statt gequetschter Spalten.
 */

export function Table({ children, className, stickyHead = false }: { children: ReactNode; className?: string; stickyHead?: boolean }) {
  return (
    <div className={`overflow-x-auto rounded-card border border-line bg-surface ${className ?? ""}`}>
      <table className={`w-full border-collapse text-sm ${stickyHead ? "[&_thead_th]:sticky [&_thead_th]:top-0" : ""}`}>{children}</table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return <thead className="bg-surface-2">{children}</thead>;
}

export function Th({ className, align = "left", ...props }: ThHTMLAttributes<HTMLTableCellElement> & { align?: "left" | "right" | "center" }) {
  return (
    <th
      scope="col"
      className={`border-b border-line px-3 py-2.5 text-xs font-bold uppercase tracking-[0.06em] text-subtle whitespace-nowrap text-${align} ${className ?? ""}`}
      {...props}
    />
  );
}

export function Tr({ me = false, className, ...props }: HTMLAttributes<HTMLTableRowElement> & { me?: boolean }) {
  return (
    <tr
      aria-current={me ? "true" : undefined}
      className={`border-b border-line last:border-b-0 transition-colors ${me ? "bg-primary-soft/70" : "hover:bg-surface-2"} ${className ?? ""}`}
      {...props}
    />
  );
}

export function Td({ className, align = "left", ...props }: TdHTMLAttributes<HTMLTableCellElement> & { align?: "left" | "right" | "center" }) {
  return <td className={`px-3 py-2.5 text-${align} align-middle ${className ?? ""}`} {...props} />;
}

/** Platz-Zelle: 1–3 in Medaillenfarben */
export function RankCell({ rank }: { rank: number }) {
  const cls = rank === 1 ? "bg-coin text-canvas" : rank === 2 ? "bg-gray-300 text-canvas" : rank === 3 ? "bg-amber-700 text-fg" : "text-subtle";
  return (
    <span className={`inline-grid size-7 place-items-center rounded-full text-xs font-extrabold tabular-nums ${cls}`}>{rank}</span>
  );
}
