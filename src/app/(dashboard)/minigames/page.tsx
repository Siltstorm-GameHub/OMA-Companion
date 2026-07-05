import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { MousePointerClick, Swords, ChevronRight, Lock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getMinigamesConfig } from "@/lib/minigames-config";
import PredictionStreakCard from "@/components/PredictionStreakCard";

export default async function MinigamesHubPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [config, predictionStreak, pendingPredictions] = await Promise.all([
    getMinigamesConfig(),
    prisma.predictionStreak.findUnique({ where: { userId } }),
    prisma.eventWinnerPrediction.count({ where: { userId, resolved: false } }),
  ]);

  const cards = [
    {
      href: "/minigames/clicker",
      enabled: config.clickerEnabled,
      icon: MousePointerClick,
      color: "violet",
      title: "Idle-Clicker",
      desc: "Tippe für Münzen, level deinen Tap-Wert auf und fang schwebende Bonus-Icons.",
    },
    {
      href: "/minigames/duel",
      enabled: config.duelEnabled,
      icon: Swords,
      color: "rose",
      title: "1v1 Münzen-Duell",
      desc: "Fordere andere Mitglieder heraus und setze Münzen auf einen Münzwurf.",
    },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Minigames</h1>
        <p className="text-sm text-gray-500 mt-1">Verdiene Münzen durch tägliche Minispiele.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cards.map(card => {
          const Icon = card.icon;
          const content = (
            <div className={`glass rounded-2xl p-5 h-full transition-all ${
              card.enabled ? "hover:border-white/20 border border-white/10" : "border border-white/5 opacity-50"
            }`}>
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-${card.color}-500/10 border border-${card.color}-500/20`}>
                  <Icon className={`w-5 h-5 text-${card.color}-400`} />
                </div>
                <h2 className="text-sm font-semibold text-white flex-1">{card.title}</h2>
                {card.enabled ? <ChevronRight className="w-4 h-4 text-gray-600" /> : <Lock className="w-4 h-4 text-gray-600" />}
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">{card.desc}</p>
              {!card.enabled && <p className="text-[10px] text-gray-600 mt-2 uppercase tracking-wide">Zurzeit deaktiviert</p>}
            </div>
          );
          return card.enabled ? (
            <Link key={card.href} href={card.href}>{content}</Link>
          ) : (
            <div key={card.href}>{content}</div>
          );
        })}
      </div>

      <div>
        <p className="text-xs text-gray-500 mb-2.5">
          Tippe auf einer Eventseite, wer das Event insgesamt gewinnt — hier siehst du deinen Fortschritt.
          {!config.predictionEnabled && <span className="text-amber-500"> Zurzeit deaktiviert.</span>}
        </p>
        <PredictionStreakCard
          current={predictionStreak?.current ?? 0}
          best={predictionStreak?.best ?? 0}
          pendingCount={pendingPredictions}
        />
      </div>
    </div>
  );
}
