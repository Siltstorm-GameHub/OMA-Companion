import type { ReactNode } from "react";
import { HeartColor as Heart } from "@/components/icons-color";
import { ChevronDown, Flame, Info, Lightbulb, Repeat, Target, Users, Wallet } from "@/components/icons";
import RankedAvatar from "@/components/RankedAvatar";
import { formatBerlinDate } from "@/lib/time";
import type { LedgerEntry, PoolAllocation } from "@/lib/donation-pool";

const MONTHS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const MONTHS_LONG = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const LEDGER_VISIBLE = 5;

export type PoolDonor = {
  id: string;
  name: string | null;
  image: string | null;
  streak: number;
  totalMonths: number;
  thisMonth: boolean;
};

export type DonationPoolData = {
  totalIn: number;
  totalOut: number;
  pool: PoolAllocation;
  avgDonations: number;
  ledger: LedgerEntry[];
  donors: PoolDonor[];
  me: { id: string; streak: number; thisMonth: boolean; totalMonths: number } | null;
  /** aktueller Monat (Berlin), 1–12 */
  currentMonth: number;
};

function fmt(n: number) {
  return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
/** Ganze Euro ohne Nachkommastellen, sonst zwei */
function eur(n: number) {
  return Number.isInteger(n) ? `${n.toLocaleString("de-DE")} €` : `${fmt(n)} €`;
}

function Bar({ value, max, tone = "teal", className = "h-2" }: { value: number; max: number; tone?: "teal" | "sky"; className?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={`${className} rounded-full bg-line overflow-hidden`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full ${tone === "sky" ? "bg-sky-400" : "bg-primary"}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-card border border-line bg-surface p-4 sm:p-5 ${className}`}>
      {children}
    </div>
  );
}

function SectionTitle({ icon, children, hint }: { icon: ReactNode; children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-3">
      <h2 className="flex items-center gap-2 text-base font-extrabold text-fg">{icon}{children}</h2>
      {hint && <p className="mt-0.5 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

function dueLabel(due: Date | string, months: number, yearly: boolean) {
  if (months < 0) return "überfällig";
  return `fällig ${formatBerlinDate(due, yearly ? { day: "numeric", month: "short", year: "numeric" } : { day: "numeric", month: "short" })}`;
}

function PayPalButton() {
  return (
    <a href="https://paypal.me/OMACommunity" target="_blank" rel="noopener noreferrer"
      className="flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.02] active:scale-95"
      style={{ background: "#0070BA" }}>
      <svg viewBox="0 0 24 24" width="16" height="16" fill="white" aria-hidden="true">
        <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z" />
      </svg>
      Mit PayPal spenden
    </a>
  );
}

/** Kopf: das, worauf das Geld gerade hinarbeitet — erst laufende Kosten, dann das nächste Ziel. */
function NextTargetHero({ data }: { data: DonationPoolData }) {
  const { pool } = data;
  const next = pool.next;
  const goalsWithCost = pool.goals.filter((g) => g.estimatedCost != null && g.estimatedCost > 0);
  const nextFixed = pool.fixed.find((f) => f.covered < f.target);

  let label: ReactNode;
  let title: string;
  let text: string | null = null;
  let progress: { value: number; max: number; tone: "teal" | "sky" } | null = null;
  let footer: ReactNode = null;

  if (next.kind === "fixed") {
    label = <><Repeat className="w-3.5 h-3.5" /> Zuerst: laufende Kosten</>;
    title = "Laufende Kosten sichern";
    text = nextFixed
      ? `Als Nächstes ${nextFixed.title}, ${dueLabel(nextFixed.nextDueAt, nextFixed.monthsUntilDue, nextFixed.yearly)}. Erst wenn das gedeckt ist, sparen wir für die Ziele.`
      : null;
    progress = { value: next.covered, max: next.target, tone: "sky" };
    footer = <><span><b className="text-white">{eur(next.covered)}</b> gedeckt</span><span>noch {eur(Math.round((next.target - next.covered) * 100) / 100)} bis {eur(next.target)}</span></>;
  } else if (next.kind === "goal") {
    label = <><Target className="w-3.5 h-3.5" /> Nächstes Ziel · {goalsWithCost.indexOf(next.goal) + 1} von {goalsWithCost.length}</>;
    title = next.goal.title;
    text = next.goal.description;
    progress = { value: next.covered, max: next.target, tone: "teal" };
    footer = <><span><b className="text-white">{eur(next.covered)}</b> gesammelt</span><span>noch {eur(Math.round((next.target - next.covered) * 100) / 100)} bis {eur(next.target)}</span></>;
  } else {
    label = <><Heart className="w-3.5 h-3.5" /> Community Spendenpool</>;
    title = goalsWithCost.length > 0 ? "Alle Ziele sind gedeckt" : "Gemeinsam für die Community";
    text = "Wir sammeln freiwillig, um laufende Kosten zu decken und uns gemeinsam etwas zu leisten. Kein Wettbewerb, nur gegenseitige Unterstützung.";
  }

  return (
    <div className="rounded-card border border-primary/40 bg-surface p-5 sm:p-6 grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-center">
      <div className="min-w-0">
        <p className={`flex items-center gap-1.5 text-xs font-semibold ${next.kind === "fixed" ? "text-sky-300" : "text-primary-fg"}`}>{label}</p>
        <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-fg">{title}</h1>
        {text && <p className="mt-1 text-sm text-gray-400">{text}</p>}
        {progress && (
          <div className="mt-4">
            <Bar value={progress.value} max={progress.max} tone={progress.tone} className="h-2.5" />
            <div className="mt-1.5 flex justify-between gap-3 text-xs text-gray-400 tabular-nums">{footer}</div>
          </div>
        )}
        {next.kind === "goal" && pool.fixedTarget > 0 && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
            <Repeat className="w-3.5 h-3.5 text-sky-400" /> Laufende Kosten ({eur(pool.fixedTarget)}) sind schon zurückgelegt.
          </p>
        )}
      </div>
      <div className="lg:border-l lg:border-line lg:pl-6">
        <PayPalButton />
        <p className="mt-2 flex gap-1.5 text-xs text-gray-400 leading-relaxed">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-sky-300" />
          <span>Bei PayPal <b className="text-gray-200">„Freunde und Familie“</b> wählen, dann gehen keine Gebühren ab. Bis 5 € im Monat reichen völlig.</span>
        </p>
      </div>
    </div>
  );
}

function BalanceCard({ data }: { data: DonationPoolData }) {
  const balance = data.pool.balance;
  return (
    <Card>
      <p className="text-xs text-gray-500 mb-1.5">Bilanz seit Start</p>
      <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-base tabular-nums">
        <span className="text-white">{fmt(data.totalIn)} €</span>
        <span className="text-gray-600">−</span>
        <span className="text-gray-400">{fmt(data.totalOut)} €</span>
        <span className="text-gray-600">=</span>
        <b className={`font-extrabold ${balance >= 0 ? "text-primary-fg" : "text-red-400"}`}>{fmt(balance)} €</b>
      </p>
      <p className="mt-1 text-xs text-gray-600">eingenommen − ausgegeben = im Pool</p>
    </Card>
  );
}

function MyCard({ data }: { data: DonationPoolData }) {
  const me = data.me;
  const month = MONTHS_LONG[data.currentMonth - 1];
  if (!me || me.totalMonths === 0) {
    return (
      <Card className="flex items-center gap-3">
        <Heart className="w-5 h-5 text-primary shrink-0" />
        <div>
          <p className="text-sm font-semibold text-white">Mach mit, wenn du magst</p>
          <p className="text-xs text-gray-500">Schon ein kleiner Betrag hilft, die laufenden Kosten zu decken.</p>
        </div>
      </Card>
    );
  }
  return (
    <Card className="flex items-center gap-3">
      <Flame className="w-5 h-5 text-primary shrink-0" />
      <div>
        <p className="text-sm font-semibold text-white">
          {me.streak > 1 ? <>Du bist seit <span className="text-primary-fg">{me.streak} Monaten in Folge</span> dabei</>
            : me.streak === 1 ? "Du bist dabei"
            : <>Du hast <span className="text-primary-fg">{me.totalMonths} {me.totalMonths === 1 ? "Monat" : "Monate"}</span> unterstützt</>}
        </p>
        <p className="text-xs text-gray-500">
          {me.thisMonth ? `${month} ist schon eingetragen. Danke!` : `Für ${month} ist noch nichts eingetragen.`}
        </p>
      </div>
    </Card>
  );
}

function FixedCostsCard({ data }: { data: DonationPoolData }) {
  const { pool } = data;
  if (pool.fixed.length === 0) return null;
  return (
    <Card>
      <SectionTitle icon={<Repeat className="w-4 h-4 text-sky-400" />}
        hint={<>ca. {eur(pool.monthlyRunRate)} im Monat · Spenden zuletzt im Schnitt {eur(data.avgDonations)} im Monat</>}>
        Laufende Kosten · werden zuerst gedeckt
      </SectionTitle>
      <ul className="divide-y divide-line">
        {pool.fixed.map((f) => {
          const done = f.covered >= f.target;
          return (
            <li key={f.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-white">{f.title}</p>
                <p className="text-xs text-gray-500">
                  {eur(f.amount)} {f.yearly ? "im Jahr" : "im Monat"} · {dueLabel(f.nextDueAt, f.monthsUntilDue, f.yearly)}
                  {f.yearly && f.target < f.amount && <> · {eur(f.target)} zurückgelegt</>}
                </p>
              </div>
              <div className="w-20 shrink-0"><Bar value={f.covered} max={f.target || 1} tone="sky" /></div>
              <span className={`w-14 shrink-0 text-right text-xs font-semibold ${done ? "text-sky-300" : "text-gray-500"}`}>
                {done ? "gedeckt" : `${Math.round((f.covered / (f.target || 1)) * 100)} %`}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function GoalsCard({ data }: { data: DonationPoolData }) {
  const { pool } = data;
  if (pool.goals.length === 0) return null;
  return (
    <Card>
      <SectionTitle icon={<Lightbulb className="w-4 h-4 text-yellow-400/80" />}
        hint={pool.fixedComplete ? "Was nach den laufenden Kosten übrig ist, füllt die Ziele der Reihe nach." : "Sobald die laufenden Kosten gedeckt sind, geht es hier weiter."}>
        Wofür wir sparen
      </SectionTitle>
      <ol className="divide-y divide-line">
        {pool.goals.map((g, i) => {
          const cost = g.estimatedCost;
          const done = cost != null && cost > 0 && g.covered >= cost;
          const active = pool.next.kind === "goal" && pool.next.goal.id === g.id;
          return (
            <li key={g.id} className="flex items-center gap-3 py-2.5">
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold tabular-nums ${active ? "bg-primary/20 text-primary-fg" : "bg-line text-gray-500"}`}>{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className={`truncate text-sm ${active || done ? "text-white" : "text-gray-300"}`}>{g.title}</p>
                {g.description && <p className="truncate text-xs text-gray-500">{g.description}</p>}
              </div>
              {cost != null && cost > 0 ? (
                <>
                  <div className="w-20 shrink-0"><Bar value={g.covered} max={cost} /></div>
                  <span className={`w-14 shrink-0 text-right text-xs tabular-nums ${done ? "text-primary-fg font-semibold" : "text-gray-400"}`}>{done ? "gedeckt" : eur(cost)}</span>
                </>
              ) : (
                <span className="shrink-0 text-xs text-gray-600">Preis offen</span>
              )}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

function LedgerRow({ e }: { e: LedgerEntry }) {
  return (
    <li className="flex items-center gap-3 py-2">
      <span className="w-14 shrink-0 text-xs text-gray-500 tabular-nums">{MONTHS[e.month - 1]} {String(e.year).slice(2)}</span>
      {e.kind === "in" ? (
        <span className="min-w-0 flex-1 truncate text-sm text-gray-300">Spenden · {e.donors} {e.donors === 1 ? "Person" : "Leute"}</span>
      ) : (
        <span className="min-w-0 flex-1 truncate text-sm text-gray-300" title={e.description ?? undefined}>
          {e.fixed && <Repeat className="mr-1 inline w-3 h-3 -mt-0.5 text-sky-400" aria-label="Laufende Kosten" />}
          {e.title}
        </span>
      )}
      <span className={`shrink-0 text-sm font-semibold tabular-nums ${e.kind === "in" ? "text-primary-fg" : "text-red-300/90"}`}>
        {e.kind === "in" ? "+" : "−"}{fmt(e.amount)}
      </span>
    </li>
  );
}

function LedgerCard({ data }: { data: DonationPoolData }) {
  const { ledger } = data;
  if (ledger.length === 0) return null;
  const visible = ledger.slice(0, LEDGER_VISIBLE);
  const rest = ledger.slice(LEDGER_VISIBLE);
  return (
    <Card>
      <SectionTitle icon={<Wallet className="w-4 h-4 text-gray-400" />} hint="Alle Einnahmen und Ausgaben, neueste zuerst.">Kassenbuch</SectionTitle>
      <ul className="divide-y divide-line">{visible.map((e) => <LedgerRow key={e.key} e={e} />)}</ul>
      {rest.length > 0 && (
        <details className="group">
          <summary className="mt-1 flex cursor-pointer list-none items-center gap-1 text-xs font-semibold text-primary-fg hover:text-teal-200 [&::-webkit-details-marker]:hidden">
            Ältere Einträge ({rest.length}) <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
          </summary>
          <ul className="mt-1 divide-y divide-line">{rest.map((e) => <LedgerRow key={e.key} e={e} />)}</ul>
        </details>
      )}
    </Card>
  );
}

function DonorWall({ data }: { data: DonationPoolData }) {
  const { donors } = data;
  if (donors.length === 0) return null;
  const thisMonth = donors.filter((d) => d.thisMonth).length;
  const month = MONTHS_LONG[data.currentMonth - 1];
  return (
    <Card>
      <SectionTitle icon={<Users className="w-4 h-4 text-gray-400" />}
        hint={<>Grüner Ring: im {month} dabei. Alphabetisch, ohne Rangfolge.</>}>
        Danke an {donors.length} Unterstützer{thisMonth > 0 && <span className="font-normal text-gray-400"> · im {month} {thisMonth}</span>}
      </SectionTitle>
      <ul className="flex flex-wrap gap-2.5">
        {donors.map((d) => {
          const isMe = d.id === data.me?.id;
          const name = d.name ?? "Unbekannt";
          const tip = `${name}${isMe ? " (Du)" : ""} · ${d.totalMonths} ${d.totalMonths === 1 ? "Monat" : "Monate"} dabei${d.streak >= 2 ? `, ${d.streak} in Folge` : ""}`;
          return (
            <li key={d.id} title={tip} className="flex w-14 flex-col items-center gap-1">
              <span className={`rounded-full p-[2px] ${d.thisMonth ? "bg-primary" : "bg-line"}`}>
                <RankedAvatar userId={d.id} src={d.image} alt={name} size={40} />
              </span>
              <span className={`w-full truncate text-center text-xs ${isMe ? "text-primary-fg" : "text-gray-500"}`}>{isMe ? "Du" : name}</span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/**
 * Spenden-Seite (Reiter "Spendenpool"): oben das, worauf das Geld gerade hinarbeitet
 * (laufende Kosten zuerst, dann das nächste Ziel), darunter Bilanz, Fixkosten, Ziele,
 * Kassenbuch und die Unterstützer-Wand.
 */
export default function DonationPoolView({ data }: { data: DonationPoolData }) {
  const empty = data.ledger.length === 0 && data.pool.goals.length === 0 && data.pool.fixed.length === 0;
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <NextTargetHero data={data} />

      <div className="grid gap-4 sm:grid-cols-2">
        <BalanceCard data={data} />
        <MyCard data={data} />
      </div>

      {(data.pool.fixed.length > 0 || data.pool.goals.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          <FixedCostsCard data={data} />
          <GoalsCard data={data} />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <LedgerCard data={data} />
        <DonorWall data={data} />
      </div>

      {empty && (
        <div className="py-10 text-center text-gray-600">
          <Heart className="mx-auto mb-3 h-10 w-10 opacity-30" />
          <p className="text-sm">Noch keine Spenden eingetragen.</p>
        </div>
      )}
    </div>
  );
}
