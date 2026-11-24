import { prisma } from "@/lib/prisma";
import { getSessionUser, getCaptainedSquadIds } from "@/lib/roles";
import { loadManageAttentionCount } from "@/lib/admin-inbox";
import { PageHeader } from "@/components/ui/PageHeader";
import { GateLink } from "@/components/GuestGate";
import { buttonClasses } from "@/components/ui/button-styles";
import EventsSectionNav from "@/components/events/EventsSectionNav";
import type { MyPrediction } from "@/components/MyPredictionsList";
import EventPredictionsPanel from "../EventPredictionsPanel";

/**
 * Events → Vorhersagen (eigene Adresse, damit die Seitenleiste direkt darauf verlinken kann).
 * Früher ein Reiter auf /events (?tab=predictions leitet hierher um).
 */
export default async function EventPredictionsPage() {
  const me = await getSessionUser();
  const userId = me?.id ?? null;
  const isMod = me?.role === "moderator" || me?.role === "admin";

  const [rows, streak, pending, manageCount] = userId
    ? await Promise.all([
        prisma.eventWinnerPrediction.findMany({
          where: { userId },
          include: {
            event: { select: { id: true, title: true, startAt: true } },
            predictedUser: { select: { id: true, username: true, name: true, image: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        }),
        prisma.predictionStreak.findUnique({ where: { userId } }),
        prisma.eventWinnerPrediction.count({ where: { userId, resolved: false } }),
        (async () => loadManageAttentionCount(isMod ? null : { userId, captainedSquadIds: await getCaptainedSquadIds(userId) }))(),
      ])
    : [[], null, 0, 0] as const;

  const myPredictions: MyPrediction[] = rows.map(p => ({
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
    <div className="px-5 pb-5 pt-0 sm:p-6 max-w-6xl mx-auto w-full min-w-0 space-y-5 animate-fade-in">
      <PageHeader title="Vorhersagen" description="Tipp, wer ein Event gewinnt — liegst du richtig, gibt es Münzen und deine Serie wächst." />
      <EventsSectionNav active="predictions" manageCount={manageCount} loggedIn={!!userId} />
      {userId ? (
        <EventPredictionsPanel
          myPredictions={myPredictions}
          predictionStreak={{ current: streak?.current ?? 0, best: streak?.best ?? 0 }}
          pendingPredictions={pending}
        />
      ) : (
        <div className="rounded-card border border-line bg-surface p-6 text-center shadow-card">
          <p className="text-sm text-muted">Melde dich an, um Sieger zu tippen und deine Vorhersagen zu sehen.</p>
          <GateLink href="/events/vorhersagen" className={buttonClasses("primary", "md", "mt-3")}>Anmelden</GateLink>
        </div>
      )}
    </div>
  );
}
