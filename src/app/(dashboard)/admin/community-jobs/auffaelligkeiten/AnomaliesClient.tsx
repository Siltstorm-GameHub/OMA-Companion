"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatBerlinDate, formatBerlinDateTime } from "@/lib/time";

interface Person { id: string; name: string }
interface Anomalies {
  days: number; totalVotes: number;
  pairs: { voter: Person; owner: Person; count: number; reverse: number; mutual: boolean }[];
  bursts: { voter: Person; count: number; at: string }[];
  newAccounts: { voter: Person; count: number; createdAt: string }[];
  concentration: { owner: Person; total: number; topShare: number; topVoters: Person[] }[];
}

const LABEL = "text-[10px] font-semibold text-gray-500 uppercase tracking-widest";

function P({ p }: { p: Person }) {
  return <Link href={`/profile/${p.id}`} className="text-teal-300 hover:text-teal-200 transition-colors">{p.name}</Link>;
}

function Block({ title, hint, empty, count, children }: { title: string; hint: string; empty: string; count: number; children: React.ReactNode }) {
  return (
    <section className="space-y-1.5">
      <h2 className={LABEL}>{title} ({count})</h2>
      <p className="text-[11px] text-gray-600">{hint}</p>
      <div className="glass rounded-xl overflow-hidden divide-y divide-white/[0.04]">
        {count === 0 ? <p className="p-3 text-xs text-gray-600">{empty}</p> : children}
      </div>
    </section>
  );
}

export default function AnomaliesClient() {
  const [data, setData] = useState<Anomalies | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/admin/community-jobs/overview?part=anomalies").then(r => (r.ok ? r.json() : Promise.reject())).then(setData).catch(() => setError(true));
  }, []);

  if (error) return <p className="text-xs text-red-400">Konnte nicht geladen werden.</p>;
  if (!data) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-teal-400 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <p className="text-[11px] text-gray-500">{data.totalVotes} Bewertungen der letzten {data.days} Tage ausgewertet.</p>

      <Block title="Auffällige Paare" hint="Eine Person hat dieselbe andere Person mindestens 8-mal bewertet. „Gegenseitig“ heißt: die andere hat mindestens 5-mal zurückbewertet." empty="Keine auffälligen Paare." count={data.pairs.length}>
        {data.pairs.map((p, i) => (
          <div key={i} className="p-3 text-xs text-gray-300 flex flex-wrap items-center gap-2">
            <P p={p.voter} /> → <P p={p.owner} /> <span className="text-gray-500">{p.count}× bewertet</span>
            {p.mutual ? <Badge tone="warning">gegenseitig ({p.reverse}×)</Badge> : p.reverse > 0 ? <span className="text-[10px] text-gray-600">zurück {p.reverse}×</span> : null}
          </div>
        ))}
      </Block>

      <Block title="Bewertungs-Schübe" hint="20 oder mehr Bewertungen innerhalb von 10 Minuten." empty="Keine Schübe." count={data.bursts.length}>
        {data.bursts.map((b, i) => (
          <div key={i} className="p-3 text-xs text-gray-300 flex flex-wrap items-center gap-2">
            <P p={b.voter} /> <span className="text-gray-500">{b.count} Bewertungen ab {formatBerlinDateTime(b.at, { dateStyle: "short", timeStyle: "short" })}</span>
          </div>
        ))}
      </Block>

      <Block title="Neue Konten mit vielen Bewertungen" hint="Konto jünger als 14 Tage und mindestens 5 abgegebene Bewertungen." empty="Keine." count={data.newAccounts.length}>
        {data.newAccounts.map((a, i) => (
          <div key={i} className="p-3 text-xs text-gray-300 flex flex-wrap items-center gap-2">
            <P p={a.voter} /> <span className="text-gray-500">{a.count} Bewertungen · Konto seit {formatBerlinDate(a.createdAt)}</span>
          </div>
        ))}
      </Block>

      <Block title="Stimmen von wenigen Personen" hint="Mindestens 10 Stimmen in den letzten 7 Tagen, davon mindestens 60 % von höchstens zwei Personen." empty="Keine." count={data.concentration.length}>
        {data.concentration.map((c, i) => (
          <div key={i} className="p-3 text-xs text-gray-300 flex flex-wrap items-center gap-2">
            <P p={c.owner} /> <span className="text-gray-500">{c.total} Stimmen, {Math.round(c.topShare * 100)} % von</span>
            {c.topVoters.map(v => <P key={v.id} p={v} />)}
          </div>
        ))}
      </Block>
    </div>
  );
}
