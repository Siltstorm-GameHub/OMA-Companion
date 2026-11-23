import Link from "next/link";
import { ChevronDown, HelpCircle } from "@/components/icons";
import { Card } from "@/components/ui/Card";
import PredictionStreakCard from "@/components/PredictionStreakCard";
import MyPredictionsList, { type MyPrediction } from "@/components/MyPredictionsList";

/** Reiter "Vorhersagen" auf /events: Serie, Kurzanleitung (aufklappbar) und die eigenen Tipps. */
export default function EventPredictionsPanel({
  myPredictions,
  predictionStreak,
  pendingPredictions,
}: {
  myPredictions: MyPrediction[];
  predictionStreak: { current: number; best: number };
  pendingPredictions: number;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start">
        <div className="space-y-3 lg:sticky lg:top-[5.5rem]">
          <PredictionStreakCard
            current={predictionStreak.current}
            best={predictionStreak.best}
            pendingCount={pendingPredictions}
          />

          {/* ── Kurzanleitung ── */}
          <Card padded={false}>
            <details className="group">
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 text-sm font-semibold text-fg [&::-webkit-details-marker]:hidden">
                <HelpCircle className="size-4 text-primary-fg" /> Wie funktionieren Vorhersagen?
                <ChevronDown className="ml-auto size-4 text-subtle transition-transform group-open:rotate-180" />
              </summary>
              <ol className="list-decimal space-y-1.5 px-4 pb-4 pl-8 text-sm leading-relaxed text-muted">
                <li>Öffne die Seite eines bevorstehenden Events aus der <Link href="/events" className="font-semibold text-primary-fg hover:text-fg">Eventliste</Link>.</li>
                <li>Wähle unter „Wer gewinnt dieses Event?“ den Spieler, der deiner Meinung nach das Event gewinnt.</li>
                <li>Leg einen Münzen-Einsatz fest und bestätige deinen Tipp.</li>
                <li>Bis zum Start kannst du den Tipp ändern oder löschen — danach ist er gesperrt.</li>
                <li>Liegst du richtig, bekommst du Münzen und deine Serie wächst.</li>
              </ol>
            </details>
          </Card>
        </div>

        <MyPredictionsList initialPredictions={myPredictions} />
      </div>
    </div>
  );
}
