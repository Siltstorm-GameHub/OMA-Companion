"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, Radio, Trophy, Users, Tv2 } from "@/components/icons";
import { watchGroupHref } from "@/lib/watch-group-href";
import type { WatchGroup, WatchMember, WatchOverview as Overview } from "@/lib/watch-together";

const MAX = 4;

/**
 * Übersicht von /zusammen: automatisch erkannte Gruppen (gleiches Spiel), laufende Events mit
 * mehreren Streams und alle Live-Mitglieder zum Selbst-Zusammenstellen (bis zu 4).
 */
export default function WatchOverview({ data }: { data: Overview }) {
  const [picked, setPicked] = useState<string[]>([]);
  const toggle = (login: string) =>
    setPicked(p => (p.includes(login) ? p.filter(l => l !== login) : p.length < MAX ? [...p, login] : p));

  return (
    <div className="max-w-5xl mx-auto w-full p-4 sm:p-8 space-y-6">
      <div>
        <div className="flex items-center gap-2.5 mb-1">
          <Users className="w-5 h-5 text-teal-400" />
          <h1 className="text-lg font-semibold text-white">Zusammen ansehen</h1>
        </div>
        <p className="text-sm text-gray-500">
          Bis zu 4 Streams aus der OMA-Community gleichzeitig – mit einem gemeinsamen Chat aus allen Kanälen.
        </p>
      </div>

      {(data.sessions?.length ?? 0) > 0 && <GroupList icon={Tv2} title="Streamen gerade gemeinsam" groups={data.sessions!} />}
      {data.events.length > 0 && <GroupList icon={Trophy} title="Laufende Events" groups={data.events} />}
      {data.auto.length > 0 && <GroupList icon={Radio} title="Spielen gerade dasselbe" groups={data.auto} />}

      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Selbst zusammenstellen</h2>
        {data.live.length === 0 ? (
          <p className="text-sm text-gray-500">Gerade ist niemand aus der Community live.</p>
        ) : (
          <>
            <p className="text-xs text-gray-500">Bis zu {MAX} Streams auswählen.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {data.live.map(m => {
                const on = picked.includes(m.twitchLogin);
                return (
                  <button
                    key={m.twitchLogin}
                    onClick={() => toggle(m.twitchLogin)}
                    aria-pressed={on}
                    disabled={!on && picked.length >= MAX}
                    className={`text-left rounded-xl border px-3 py-2.5 transition-all disabled:opacity-40 ${
                      on ? "border-teal-400/60 bg-teal-500/15" : "border-white/[0.08] hover:border-white/25"
                    }`}
                  >
                    <MemberLine m={m} />
                    {m.title && <span className="block text-[11px] text-gray-500 truncate mt-0.5">{m.title}</span>}
                  </button>
                );
              })}
            </div>
            <div className="sticky bottom-4 flex justify-end">
              <Link
                href={picked.length ? `/zusammen?c=${picked.join(",")}` : "#"}
                aria-disabled={picked.length === 0}
                className={`text-sm px-4 py-2 rounded-xl border font-medium ${
                  picked.length ? "bg-teal-500/20 border-teal-400/50 text-teal-100 hover:bg-teal-500/30" : "pointer-events-none border-white/[0.08] text-gray-500"
                }`}
              >
                {picked.length ? `${picked.length} ${picked.length === 1 ? "Stream" : "Streams"} ansehen` : "Streams auswählen"}
              </Link>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function GroupList({ icon: Icon, title, groups }: { icon: typeof Users; title: string; groups: WatchGroup[] }) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">
        <Icon className="w-3.5 h-3.5" /> {title}
      </h2>
      <div className="grid sm:grid-cols-2 gap-2">
        {groups.map(g => (
          <Link
            key={g.key}
            href={watchGroupHref(g)}
            className="glass rounded-2xl p-4 hover:border-teal-500/40 border border-white/[0.06] transition-all"
          >
            <span className="block text-sm font-semibold text-white truncate">{g.label}</span>
            <span className="block text-xs text-gray-500 mb-2">{g.members.length} Streams · Zusammen ansehen →</span>
            <div className="space-y-1">
              {g.members.map(m => <MemberLine key={m.twitchLogin} m={m} />)}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function MemberLine({ m }: { m: WatchMember }) {
  return (
    <span className="flex items-center gap-2 min-w-0">
      {m.image
        // eslint-disable-next-line @next/next/no-img-element -- Profilbild (Discord-CDN)
        ? <img src={m.image} alt="" className="w-5 h-5 rounded-full shrink-0" />
        : <span className="w-5 h-5 rounded-full bg-white/10 shrink-0" />}
      <span className="text-sm text-gray-100 truncate">{m.name}</span>
      {m.game && <span className="text-xs text-gray-500 truncate">· {m.game}</span>}
      <span className="ml-auto flex items-center gap-1 text-xs text-gray-500 shrink-0"><Eye className="w-3 h-3" />{m.viewers}</span>
    </span>
  );
}
