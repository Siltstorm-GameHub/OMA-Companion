import { ScrollText } from "@/components/icons";

function RuleItem({ i, line }: { i: number; line: string }) {
  return (
    <div className="flex items-start gap-3 rounded-control border border-line bg-surface-2 px-3 py-2.5">
      <span className="shrink-0 size-6 rounded-full grid place-items-center text-xs font-extrabold bg-primary-soft text-primary-fg">
        {i + 1}
      </span>
      <p className="text-sm text-fg/90 leading-relaxed">{line}</p>
    </div>
  );
}

/**
 * Regelwerk (eine Regel pro Zeile). Mit `preview` werden nur die ersten N Regeln gezeigt, der Rest
 * klappt auf ("Alle 9 Regeln") — für Seiten, auf denen die Regeln nicht das Wichtigste sind.
 */
export default function RulesSection({
  rules, className = "", preview, id,
}: {
  rules: string | null | undefined;
  className?: string;
  preview?: number;
  id?: string;
}) {
  if (!rules) return null;
  const lines = rules.split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;
  const shown = preview && lines.length > preview + 1 ? lines.slice(0, preview) : lines;
  const rest = lines.slice(shown.length);

  return (
    <div id={id} className={`rounded-card border border-line bg-surface shadow-card p-4 sm:p-5 scroll-mt-36 ${className}`}>
      <h2 className="text-base font-extrabold text-fg mb-3 flex items-center gap-2">
        <ScrollText className="size-4 text-primary-fg" /> Regelwerk
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {shown.map((line, i) => <RuleItem key={i} i={i} line={line} />)}
      </div>
      {rest.length > 0 && (
        <details className="group mt-2">
          <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden text-sm font-semibold text-primary-fg hover:text-fg px-1 py-1.5">
            <span className="group-open:hidden">Alle {lines.length} Regeln anzeigen</span>
            <span className="hidden group-open:inline">Weniger anzeigen</span>
          </summary>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
            {rest.map((line, j) => <RuleItem key={j} i={shown.length + j} line={line} />)}
          </div>
        </details>
      )}
    </div>
  );
}
