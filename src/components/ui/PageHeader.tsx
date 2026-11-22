import type { ReactNode } from "react";

/**
 * Einheitlicher Seitenkopf: Titel, ein Satz Beschreibung, rechts die Hauptaktion(en).
 * Am Handy rutschen die Aktionen unter den Text.
 */
export function PageHeader({
  title, description, actions, className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={`flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between ${className ?? ""}`}>
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold tracking-tight text-fg sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
