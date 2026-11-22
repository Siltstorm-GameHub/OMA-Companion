import type { ReactNode } from "react";
import { ChevronRight } from "@/components/icons";
import { GateLink } from "@/components/GuestGate";

/** Überschrift eines Abschnitts/Moduls mit optionalem "Alle →"-Link. */
export function SectionHeader({ title, href, linkLabel = "Alle", extra }: { title: ReactNode; href?: string; linkLabel?: string; extra?: ReactNode }) {
  return (
    <div className="mb-2.5 flex items-center justify-between gap-2">
      <h2 className="flex min-w-0 items-center gap-2 text-base font-extrabold text-fg">{title}</h2>
      <div className="flex shrink-0 items-center gap-3">
        {extra}
        {href && (
          <GateLink href={href} className="flex items-center gap-0.5 text-xs font-semibold text-primary-fg hover:text-fg">
            {linkLabel} <ChevronRight className="size-3.5" aria-hidden />
          </GateLink>
        )}
      </div>
    </div>
  );
}
