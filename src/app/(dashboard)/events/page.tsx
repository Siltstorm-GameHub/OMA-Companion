import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { CalendarDays } from "lucide-react";
import SyncButton from "./SyncButton";
import RegisterButton from "./RegisterButton";

const STATUS_LABELS: Record<string, { label: string; style: string }> = {
  open:     { label: "Offen",    style: "bg-blue-900/50 text-blue-300" },
  active:   { label: "Läuft",   style: "bg-green-900/50 text-green-300" },
  closed:   { label: "Voll",    style: "bg-amber-900/50 text-amber-300" },
  finished: { label: "Beendet", style: "bg-gray-800 text-gray-500" },
};

export default async function EventsPage() {
  const session = await auth();
  const userId = session?.user?.id;

  const events = await prisma.event.findMany({
    orderBy: [{ status: "asc" }, { startAt: "asc" }],
    include: {
      _count: { select: { registrations: true } },
      registrations: userId ? { where: { userId } } : false,
    },
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Events</h1>
          <p className="text-xs text-gray-500 mt-0.5">Automatisch synchronisiert mit Discord</p>
        </div>
        <SyncButton />
      </div>

      <div className="space-y-3">
        {events.length === 0 && (
          <div className="text-center py-12 text-gray-500 bg-gray-900 border border-gray-800 rounded-xl">
            <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>Keine Events. Klicke auf "Discord sync".</p>
          </div>
        )}

        {events.map((ev) => {
          const s = STATUS_LABELS[ev.status] ?? STATUS_LABELS.finished;
          const isRegistered = userId
            ? (ev.registrations as { userId: string }[])?.some((r) => r.userId === userId)
            : false;
          const isFull = !!(ev.maxPlayers && ev._count.registrations >= ev.maxPlayers);
          const canRegister = ev.status === "open" || ev.status === "active";
          const cleanDescription = ev.description?.replace(/\n?\ndiscord:[^\n]*/g, "").trim();
          const isDiscord = ev.description?.includes("discord:");

          return (
            <div key={ev.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4">
              {/* Datum */}
              <div className="text-center w-12 shrink-0">
                <p className="text-xl font-semibold text-white leading-none">
                  {new Date(ev.startAt).getDate()}
                </p>
                <p className="text-xs text-gray-500 uppercase">
                  {new Date(ev.startAt).toLocaleString("de-DE", { month: "short" })}
                </p>
                <p className="text-xs text-gray-600">
                  {new Date(ev.startAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-white">{ev.title}</p>
                  {isDiscord && (
                    <span className="flex items-center gap-1 text-xs text-rose-400">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.01.095.053.182.112.245a19.89 19.89 0 0 0 5.993 3.03.077.077 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                      </svg>
                      Discord
                    </span>
                  )}
                  {ev.type === "tournament" && (
                    <span className="text-xs bg-amber-900/50 text-amber-300 px-2 py-0.5 rounded-full">Turnier</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  {ev.game && <span className="text-xs text-gray-400">{ev.game}</span>}
                  <span className="text-xs text-gray-500">
                    {ev._count.registrations}{ev.maxPlayers ? ` / ${ev.maxPlayers}` : ""} Teilnehmer
                  </span>
                  <span className="text-xs text-rose-400 font-medium">+{ev.pointReward} Pts</span>
                </div>
                {cleanDescription && (
                  <p className="text-xs text-gray-600 mt-1 truncate max-w-md">{cleanDescription}</p>
                )}
              </div>

              {/* Status + Button */}
              <div className="flex items-center gap-3 shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.style}`}>
                  {isFull && !isRegistered ? "Voll" : s.label}
                </span>
                {userId && canRegister && (
                  <RegisterButton
                    eventId={ev.id}
                    isRegistered={isRegistered}
                    isFull={isFull && !isRegistered}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
