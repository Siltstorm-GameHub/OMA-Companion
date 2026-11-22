// TEMPORÄR – Sichtprüfung ohne Datenbank. Wird wieder gelöscht.
import DashboardChrome from "../(dashboard)/DashboardChrome";
import EventCard, { type EventCardData } from "@/components/events/EventCard";
import { MyMatchModule, RankingModule, SquadsModule, UpcomingEventsModule } from "../(dashboard)/dashboard/HomeModules";

const d = (days: number) => new Date(Date.now() + days * 86_400_000);

const card: EventCardData = {
  id: "e1", href: "/tournament/e1", title: "Mario Kart Abend", game: "Mario Kart 8", coverUrl: null, omaOriginal: false,
  phase: { phase: "open", label: "Anmeldung offen", tone: "teal" } as EventCardData["phase"],
  date: { top: "FR", weekday: "FR", day: "28", time: "20:00" }, series: { name: "Kart-Liga", color: "#2dd4bf", href: "/events" },
  metaLine: "Turnier · K.-o.", playerCount: 9, maxPlayers: 16, coins: 30, isRegistered: true, urgency: null, relevance: [],
  avatars: [], friendNames: [], communityBy: null, kind: "tournament",
};

export default async function Preview() {
  return (
    <DashboardChrome isGuest={false} inviteUrl={null} partnerFooter={null} support={{ label: "Laufende Kosten", percent: 64 }}>
      <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6">
        <h1 className="text-2xl font-extrabold">Hey Sebastian</h1>
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
          <div className="min-w-0 space-y-6 lg:col-span-2">
            <MyMatchModule match={{
              eventId: "e1", eventTitle: "Rocket League Cup", game: "Rocket League", coverUrl: null, roundLabel: "Halbfinale", live: true,
              me: { name: "Sebastian", image: null, score: 2 }, opponent: { name: "Fritzi", image: null, score: 1 },
            }} />
            <UpcomingEventsModule events={[1, 2, 3, 4].map(i => ({
              id: `u${i}`, title: ["Among Us Nacht", "CS2 Wingman", "Fortnite Duos", "Quiz-Abend"][i - 1], game: null, coverUrl: null,
              omaOriginal: i === 2, startAt: d(i), startsIn: `in ${i} Tagen`, playerCount: 4 + i, maxPlayers: 10, isRegistered: i === 1,
            }))} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><EventCard ev={card} /><EventCard ev={{ ...card, id: "e2", isRegistered: false }} /></div>
          </div>
          <div className="min-w-0 space-y-6">
            <RankingModule
              top={[["Fritzi", 1840], ["Hanna", 1610], ["Sebastian", 1395], ["Max", 990], ["Lena", 640]].map(([n, p], i) => ({ id: `r${i}`, name: n as string, image: null, rankPoints: p as number }))}
              me={{ rank: 3, rankPoints: 1395 }} memberCount={142} trend="up" wanderpokal={{ title: "Mario Kart", holders: "Fritzi" }}
            />
            <SquadsModule squads={[{ id: "s1", name: "Night Owls", memberCount: 8, mine: true }, { id: "s2", name: "Kart Kings", memberCount: 5, mine: true }]} />
          </div>
        </div>
      </div>
    </DashboardChrome>
  );
}
