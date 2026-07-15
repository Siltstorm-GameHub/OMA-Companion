import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getMinigamesConfig } from "@/lib/minigames-config";
import PredictionStreakCard from "@/components/PredictionStreakCard";
import MyPredictionsList, { type MyPrediction } from "./MyPredictionsList";

export default async function MinigamesHubPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [config, predictionStreak, pendingPredictions, myPredictionRows] = await Promise.all([
    getMinigamesConfig(),
    prisma.predictionStreak.findUnique({ where: { userId } }),
    prisma.eventWinnerPrediction.count({ where: { userId, resolved: false } }),
    prisma.eventWinnerPrediction.findMany({
      where: { userId },
      include: {
        event: { select: { id: true, title: true, startAt: true } },
        predictedUser: { select: { id: true, username: true, name: true, image: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const myPredictions: MyPrediction[] = myPredictionRows.map(p => ({
    eventId: p.event.id,
    eventTitle: p.event.title,
    eventStartAt: p.event.startAt.toISOString(),
    predictedUser: p.predictedUser,
    wager: p.wager,
    resolved: p.resolved,
    correct: p.correct,
    coinsAwarded: p.coinsAwarded,
  }));

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Minigames</h1>
        <p className="text-sm text-gray-500 mt-1">
          Verdiene Münzen durch tägliche Minispiele. Das 1v1 Münzen-Duell findest du auf dem Profil anderer Mitglieder.
        </p>
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

      <div>
        <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-2.5">Meine Vorhersagen</p>
        <MyPredictionsList initialPredictions={myPredictions} />
      </div>
    </div>
  );
}
