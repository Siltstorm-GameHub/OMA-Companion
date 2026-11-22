import { ScrollText } from "@/components/icons";

function RuleItem({ i, line }: { i: number; line: string }) {
  return (
    <div className="flex items-start gap-3 glass-heavy rounded-card px-3 py-2.5">
      <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-teal-500/10 border border-teal-500/25 text-teal-400 mt-0.5">
        {i + 1}
      </span>
      <p className="text-sm text-gray-300 leading-relaxed">{line}</p>
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
    <div id={id} className={`glass rounded-2xl p-5 scroll-mt-36 ${className}`}>
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
        <ScrollText className="w-3.5 h-3.5 text-teal-400" /> Regelwerk
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {shown.map((line, i) => <RuleItem key={i} i={i} line={line} />)}
      </div>
      {rest.length > 0 && (
        <details className="group mt-2">
          <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden text-xs font-medium text-teal-300 hover:text-teal-200 px-1 py-1">
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
