"use client";
import { useState } from "react";
import Link from "next/link";
import { Target, HelpCircle, ChevronDown } from "lucide-react";
import PredictionStreakCard from "@/components/PredictionStreakCard";
import MyPredictionsList, { type MyPrediction } from "@/components/MyPredictionsList";

export default function EventPredictionsPanel({
  myPredictions,
  predictionStreak,
  pendingPredictions,
}: {
  myPredictions: MyPrediction[];
  predictionStreak: { current: number; best: number };
  pendingPredictions: number;
}) {
  const [predictionHelpOpen, setPredictionHelpOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* ── Kurzanleitung ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-end">
          <button
            onClick={() => setPredictionHelpOpen(v => !v)}
            className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" /> Wie geht das?
            <ChevronDown className={`w-3 h-3 transition-transform ${predictionHelpOpen ? "rotate-180" : ""}`} />
          </button>
        </div>

        {predictionHelpOpen && (
          <div className="glass rounded-2xl p-4 text-xs text-gray-400 leading-relaxed space-y-4">
            <div className="space-y-1.5">
              <p className="text-gray-300 font-medium flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-violet-400" /> Event-Sieger-Vorhersage
              </p>
              <ol className="list-decimal list-inside space-y-1.5">
                <li>Öffne die Seite eines bevorstehenden Events (Tab "Events" oder <Link href="/events" className="text-violet-400 hover:text-violet-300">Eventliste</Link>).</li>
                <li>Scrolle zum Bereich "Event-Gesamtsieger-Vorhersage" und wähle per Suche den Nutzer, der deiner Meinung nach das gesamte Event gewinnt.</li>
                <li>Lege einen Münzen-Einsatz fest und bestätige deinen Tipp.</li>
                <li>Bis der Event-Start erreicht ist, kannst du deine Vorhersage jederzeit ändern oder löschen — danach ist sie gesperrt.</li>
                <li>Liegst du nach Event-Ende richtig, bekommst du Münzen ausgezahlt und deine Serie wächst.</li>
              </ol>
            </div>
          </div>
        )}
      </div>

      {/* ── Event-Sieger-Vorhersagen ── */}
      <PredictionStreakCard
        current={predictionStreak.current}
        best={predictionStreak.best}
        pendingCount={pendingPredictions}
      />
      <div className="space-y-2">
        <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5" /> Meine Event-Sieger-Vorhersagen
        </p>
        <MyPredictionsList initialPredictions={myPredictions} />
      </div>
    </div>
  );
}
