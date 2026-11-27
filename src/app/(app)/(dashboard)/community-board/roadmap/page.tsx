import { formatFixed } from "@/lib/format-number";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import BoardSectionNav from "@/components/community/BoardSectionNav";
import { Rocket, Star, Trophy } from "@/components/icons";
import { getSessionUser } from "@/lib/roles";
import { getRoadmap } from "@/lib/visionaer-service";
import { formatBerlinDate } from "@/lib/time";

export const dynamic = "force-dynamic";

type Item = Awaited<ReturnType<typeof getRoadmap>>["planned"][number];

function IdeaRow({ item }: { item: Item }) {
  return (
    <li>
      <Link href={`/community-board/idea/${item.id}`} className="flex items-start justify-between gap-3 hover:text-primary-fg transition-colors">
        <span className="min-w-0">
          <span className="block text-sm text-fg truncate">{item.title}</span>
          <span className="block text-xs text-subtle truncate">
            von {item.author}{item.game ? ` · ${item.game}` : ""}{item.at ? ` · ${formatBerlinDate(item.at)}` : ""}{item.note ? ` · ${item.note}` : ""}
          </span>
        </span>
        <span className="shrink-0 text-xs text-subtle flex items-center gap-1">
          {item.count > 0 ? <>{formatFixed(item.average, 1)}<Star className="w-3 h-3 text-coin fill-amber-400" /></> : "–"}
        </span>
      </Link>
    </li>
  );
}

function Section({ title, empty, children, count }: { title: string; empty: string; children: React.ReactNode; count: number }) {
  return (
    <section className="glass rounded-card p-4 space-y-2">
      <h2 className="text-xs font-semibold text-muted uppercase tracking-widest">{title}</h2>
      {count === 0 ? <p className="text-xs text-subtle">{empty}</p> : <ul className="space-y-2">{children}</ul>}
    </section>
  );
}

/** Roadmap: was aus den Ideen der Community wird — geplant, umgesetzt, Spiele-Wunschliste und Top-Ideen. */
export default async function RoadmapPage() {
  const user = await getSessionUser();
  if (!user) notFound();
  const { planned, done, wishlist, topWeek, topMonth } = await getRoadmap();

  return (
    <div className="px-4 pb-5 pt-0 sm:p-6 max-w-3xl mx-auto w-full min-w-0 space-y-5 animate-fade-in">
      <BoardSectionNav active="roadmap" />
      <PageHeader title={<span className="flex items-center gap-2"><Rocket className="size-6 text-primary" /> Roadmap</span>}
        description="Ihr habt gewünscht — das wird daraus." />

      <Section title={`Wird umgesetzt (${planned.length})`} empty="Aktuell ist nichts in Umsetzung." count={planned.length}>
        {planned.map(i => <IdeaRow key={i.id} item={i} />)}
      </Section>
      <Section title={`Umgesetzt (${done.length})`} empty="Noch keine umgesetzten Ideen." count={done.length}>
        {done.map(i => <IdeaRow key={i.id} item={i} />)}
      </Section>

      <section className="glass rounded-card p-4 space-y-2">
        <h2 className="text-xs font-semibold text-muted uppercase tracking-widest">Spiele-Wunschliste</h2>
        {wishlist.length === 0 ? <p className="text-xs text-subtle">Noch keine Spiele-Ideen mit Steam-Link.</p> : (
          <ol className="space-y-1.5">
            {wishlist.map((g, i) => (
              <li key={g.appId} className="flex items-center justify-between gap-3 text-sm">
                <a href={`https://store.steampowered.com/app/${g.appId}`} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate text-fg hover:text-primary-fg transition-colors">
                  <span className="text-subtle mr-2 tabular-nums">{i + 1}.</span>{g.name}
                </a>
                <span className="shrink-0 text-xs text-subtle">
                  {g.votes > 0 ? `Ø ${formatFixed(g.average, 1)} ★ · ${g.votes} Stimmen` : "noch keine Stimmen"}{g.participants > 0 ? ` · ${g.participants} dabei` : ""}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="grid sm:grid-cols-2 gap-4">
        {[{ title: "Top-Ideen dieser Woche", items: topWeek }, { title: "Top-Ideen dieses Monats", items: topMonth }].map(block => (
          <section key={block.title} className="glass rounded-card p-4 space-y-2">
            <h2 className="text-xs font-semibold text-muted uppercase tracking-widest flex items-center gap-1.5"><Trophy className="w-3.5 h-3.5 text-coin" /> {block.title}</h2>
            {block.items.length === 0 ? <p className="text-xs text-subtle">Noch keine Bewertungen.</p> : (
              <ol className="space-y-1.5">
                {block.items.map((t, i) => (
                  <li key={t.id}>
                    <Link href={`/community-board/idea/${t.id}`} className="block text-sm text-fg hover:text-primary-fg transition-colors truncate">
                      <span className="text-subtle mr-2 tabular-nums">{i + 1}.</span>{t.title}
                    </Link>
                    <span className="block text-xs text-subtle pl-5">Ø {formatFixed(t.average, 1)} ★ · {t.votes} Stimmen · {t.author}</span>
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
