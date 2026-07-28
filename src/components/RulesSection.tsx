import { ScrollText } from "lucide-react";

export default function RulesSection({ rules, className = "" }: { rules: string | null | undefined; className?: string }) {
  if (!rules) return null;
  const lines = rules.split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  return (
    <div className={`glass rounded-2xl p-5 ${className}`}>
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
        <ScrollText className="w-3.5 h-3.5 text-teal-400" /> Regelwerk
      </h2>
      <div className="space-y-2">
        {lines.map((line, i) => (
          <div key={i} className="flex items-start gap-3 glass-heavy rounded-xl px-3 py-2.5">
            <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-teal-500/10 border border-teal-500/25 text-teal-400 mt-0.5">
              {i + 1}
            </span>
            <p className="text-sm text-gray-300 leading-relaxed">{line}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
