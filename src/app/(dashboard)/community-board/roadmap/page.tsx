import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Rocket, Star, Trophy } from "lucide-react";
import { getSessionUser } from "@/lib/roles";
import { getRoadmap } from "@/lib/visionaer-service";
import { formatBerlinDate } from "@/lib/time";

export const dynamic = "force-dynamic";

type Item = Awaited<ReturnType<typeof getRoadmap>>["planned"][number];

function IdeaRow({ item }: { item: Item }) {
  return (
    <li>
      <Link href={`/community-board/idea/${item.id}`} className="flex items-start justify-between gap-3 hover:text-teal-300 transition-colors">
        <span className="min-w-0">
          <span className="block text-sm text-gray-100 truncate">{item.title}</span>
          <span className="block text-[11px] text-gray-500 truncate">
            von {item.author}{item.game ? ` · ${item.game}` : ""}{item.at ? ` · ${formatBerlinDate(item.at)}` : ""}{item.note ? ` · ${item.note}` : ""}
          </span>
        </span>
        <span className="shrink-0 text-[11px] text-gray-500 flex items-center gap-1">
          {item.count > 0 ? <>{item.average.toFixed(1)}<Star className="w-3 h-3 text-amber-400 fill-amber-400" /></> : "–"}
        </span>
      </Link>
    </li>
  );
}

function Section({ title, empty, children, count }: { title: string; empty: string; children: React.ReactNode; count: number }) {
  return (
    <section className="glass rounded-2xl p-4 space-y-2">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{title}</h2>
      {count === 0 ? <p className="text-xs text-gray-600">{empty}</p> : <ul className="space-y-2">{children}</ul>}
    </section>
  );
}

/** Roadmap: was aus den Ideen der Community wird — geplant, umgesetzt, Spiele-Wunschliste und Top-Ideen. */
export default async function RoadmapPage() {
  const user = await getSessionUser();
  if (!user) notFound();
  const { planned, done, wishlist, topWeek, topMonth } = await getRoadmap();

  return (
    <div className="max-w-2xl mx-auto space-y-4 px-4 py-6">
      <Link href="/community-board" className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-teal-300 transition-colors">
        <ChevronLeft className="w-3.5 h-3.5" /> Zurück zum Community-Board
      </Link>
      <div>
        <h1 className="text-lg font-bold text-white flex items-center gap-2"><Rocket className="w-5 h-5 text-teal-400" /> Roadmap</h1>
        <p className="text-xs text-gray-500 mt-0.5">Ihr habt gewünscht — das wird daraus.</p>
      </div>

      <Section title={`Wird umgesetzt (${planned.length})`} empty="Aktuell ist nichts in Umsetzung." count={planned.length}>
        {planned.map(i => <IdeaRow key={i.id} item={i} />)}
      </Section>
      <Section title={`Umgesetzt (${done.length})`} empty="Noch keine umgesetzten Ideen." count={done.length}>
        {done.map(i => <IdeaRow key={i.id} item={i} />)}
      </Section>

      <section className="glass rounded-2xl p-4 space-y-2">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Spiele-Wunschliste</h2>
        {wishlist.length === 0 ? <p className="text-xs text-gray-600">Noch keine Spiele-Ideen mit Steam-Link.</p> : (
          <ol className="space-y-1.5">
            {wishlist.map((g, i) => (
              <li key={g.appId} className="flex items-center justify-between gap-3 text-sm">
                <a href={`https://store.steampowered.com/app/${g.appId}`} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate text-gray-100 hover:text-teal-300 transition-colors">
                  <span className="text-gray-600 mr-2 tabular-nums">{i + 1}.</span>{g.name}
                </a>
                <span className="shrink-0 text-[11px] text-gray-500">
                  {g.votes > 0 ? `Ø ${g.average.toFixed(1)} ★ · ${g.votes} Stimmen` : "noch keine Stimmen"}{g.participants > 0 ? ` · ${g.participants} dabei` : ""}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="grid sm:grid-cols-2 gap-4">
        {[{ title: "Top-Ideen dieser Woche", items: topWeek }, { title: "Top-Ideen dieses Monats", items: topMonth }].map(block => (
          <section key={block.title} className="glass rounded-2xl p-4 space-y-2">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-1.5"><Trophy className="w-3.5 h-3.5 text-amber-400" /> {block.title}</h2>
            {block.items.length === 0 ? <p className="text-xs text-gray-600">Noch keine Bewertungen.</p> : (
              <ol className="space-y-1.5">
                {block.items.map((t, i) => (
                  <li key={t.id}>
                    <Link href={`/community-board/idea/${t.id}`} className="block text-sm text-gray-100 hover:text-teal-300 transition-colors truncate">
                      <span className="text-gray-600 mr-2 tabular-nums">{i + 1}.</span>{t.title}
                    </Link>
                    <span className="block text-[11px] text-gray-500 pl-5">Ø {t.average.toFixed(1)} ★ · {t.votes} Stimmen · {t.author}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
