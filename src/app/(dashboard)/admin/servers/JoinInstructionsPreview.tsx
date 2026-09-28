import { Info } from "@/components/icons";

// Live-Vorschau, wie die "So trittst du bei"-Anleitung später auf der Server-Karte
// aussieht (gleiche Optik wie ServerCredentials.tsx) — Admins sehen so direkt beim
// Tippen, ob Zeilenumbrüche/Länge passen, statt es blind auf der echten Karte zu prüfen.
export default function JoinInstructionsPreview({ text }: { text: string }) {
  return (
    <div className="col-span-2 rounded-lg bg-teal-500/10 border border-teal-500/20 overflow-hidden">
      <div className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-teal-300">
        <Info className="w-3.5 h-3.5 shrink-0" />
        Vorschau
      </div>
      <p className="px-3 pb-3 text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">
        {text.trim() || <span className="text-gray-500 italic">Noch kein Text — User sehen diesen Abschnitt dann gar nicht.</span>}
      </p>
    </div>
  );
}
