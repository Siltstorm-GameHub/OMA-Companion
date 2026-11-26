"use client";

import Link from "next/link";
import { useState } from "react";
import GameCover from "@/components/GameCover";
import RankedAvatar from "@/components/RankedAvatar";
import ServerInterestButtons, { type InterestState } from "@/components/games/ServerInterestButtons";
import { ChevronRight, Info, Sparkles } from "@/components/icons";
import type { ServerCandidate } from "@/lib/games/server-candidates-server";
import {
  SERVER_READY_MIN_INTEREST, SERVER_READY_MIN_REGULAR, SERVER_SCORE_WEIGHTS, SERVER_SOURCE_LABELS,
  candidateScore, isReadyForServer, missingForReady,
} from "@/lib/games/server-candidates";
import { formatPlayers, formatPrice, subscriptionBadges } from "@/lib/games/options";

function CandidateCard({ c, rank, canInterest }: { c: ServerCandidate; rank: number; canInterest: boolean }) {
  const [interest, setInterest] = useState<InterestState>({ level: c.myInterest, regular: c.regular, casual: c.casual });
  const counts = { ...interest, inCount: c.inCount, wishCount: c.wishCount };
  const score = candidateScore(counts);
  const ready = isReadyForServer(interest);
  const missing = missingForReady(interest);
  const players = formatPlayers(c.minPlayers, c.maxPlayers);
  const price = c.isFree ? "Kostenlos" : formatPrice(c.priceCents, c.priceCurrency);
  const subs = subscriptionBadges(c.subscriptions);
  const facts = [players, c.crossplay ? "Crossplay" : null, price, subs.length ? `Im Abo: ${subs.join(", ")}` : null]
    .filter(Boolean) as string[];

  return (
    <li className={`rounded-card glass p-4 space-y-3 border ${ready ? "border-primary/40" : "border-line"}`}>
      <div className="flex items-start gap-3">
        <span className="w-5 shrink-0 pt-2 text-xs font-bold text-subtle tabular-nums text-right">{rank}</span>
        <GameCover game={c.name} coverUrl={c.coverUrl} className="w-16 h-10 shrink-0" rounded="rounded-lg" />
        <div className="flex-1 min-w-0">
          <Link href={`/spiele/${c.slug}`} className="inline-flex items-center gap-1 text-sm font-semibold text-fg hover:text-primary-fg">
            <span className="truncate">{c.name}</span> <ChevronRight className="w-3 h-3 shrink-0 text-subtle" />
          </Link>
          {facts.length > 0 && <p className="text-xs text-subtle truncate">{facts.join(" · ")}</p>}
          <p className="text-xs text-muted mt-0.5">
            {c.inCount} am Start · {c.wishCount} würden es holen · <span className="text-fg/90">{interest.regular + interest.casual} wären dabei</span>
            {interest.regular > 0 && <> ({interest.regular} regelmäßig)</>}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-display text-xl font-extrabold text-fg leading-none tabular-nums" title="Score">{score}</p>
          <p className="text-[11px] text-subtle">Punkte</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-line">
        <div className="flex items-center gap-2 min-w-0">
          {ready ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/15 border border-primary/40 text-primary-fg">
              <Sparkles className="w-3 h-3" /> Bereit zum Einrichten
            </span>
          ) : missing && (
            <span className="text-xs text-subtle">
              Noch {missing.total > 0 ? `${missing.total} ${missing.total === 1 ? "Zusage" : "Zusagen"}` : ""}
              {missing.total > 0 && missing.regular > 0 ? ", davon " : ""}
              {missing.regular > 0 ? `${missing.regular} regelmäßig` : ""} bis zur Schwelle
            </span>
          )}
          {c.people.length > 0 && (
            <span className="flex -space-x-1.5" aria-label="Zugesagt haben">
              {c.people.slice(0, 6).map(p => (
                <span key={p.id} title={p.name} className="rounded-full ring-2 ring-[var(--bg-surface)]">
                  <RankedAvatar userId={p.id} src={p.image} alt={p.name} size={22} />
                </span>
              ))}
            </span>
          )}
        </div>
        {canInterest && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-subtle">Ich wäre dabei:</span>
            <ServerInterestButtons slug={c.slug} initial={interest} onChange={setInterest} size="sm" />
          </div>
        )}
      </div>
      {c.source && <p className="text-[11px] text-subtle -mt-1">Server-tauglich: {SERVER_SOURCE_LABELS[c.source]}</p>}
    </li>
  );
}

/** Kandidaten für neue Community-Server (aus GameSwipe), mit offen erklärtem Score. */
export default function ServerCandidates({ candidates, canInterest }: { candidates: ServerCandidate[]; canInterest: boolean }) {
  const w = SERVER_SCORE_WEIGHTS;
  return (
    <section id="kandidaten" className="space-y-3 scroll-mt-20">
      <div>
        <h2 className="text-base font-extrabold text-fg">Kandidaten für neue Server</h2>
        <p className="text-xs text-muted mt-1">
          Spiele aus GameSwipe, die sich für einen eigenen OMA-Server eignen und noch keinen haben. Sag „Ich wäre dabei“,
          wenn du mitspielen würdest — geht der Server online, wird deine Bewerbung automatisch angelegt.
        </p>
      </div>

      <details className="rounded-control bg-surface-2 border border-line px-3 py-2 text-xs text-muted">
        <summary className="cursor-pointer select-none inline-flex items-center gap-1.5 text-fg/85">
          <Info className="w-3.5 h-3.5" /> So entsteht die Reihenfolge
        </summary>
        <ul className="mt-2 space-y-0.5 list-disc pl-4">
          <li>Punkte = regelmäßig dabei × {w.regular} + gelegentlich dabei × {w.casual} + „Am Start“ × {w.in} + „Würde ich holen“ × {w.wish}</li>
          <li>
            Bereit zum Einrichten ab {SERVER_READY_MIN_INTEREST} Zusagen, davon mindestens {SERVER_READY_MIN_REGULAR} regelmäßig —
            dann landet der Kandidat beim Team.
          </li>
          <li>Fehlt ein Spiel? Auf der Spielseite unter „Mithelfen“ als server-tauglich markieren.</li>
        </ul>
      </details>

      {candidates.length === 0 ? (
        <p className="text-xs text-subtle">
          Noch keine Kandidaten. Markiere in <Link href="/spiele" className="text-primary hover:text-primary-fg">GameSwipe</Link> Spiele
          als server-tauglich, dann tauchen sie hier auf.
        </p>
      ) : (
        <ol className="space-y-2">
          {candidates.map((c, i) => <CandidateCard key={c.id} c={c} rank={i + 1} canInterest={canInterest} />)}
        </ol>
      )}
    </section>
  );
}
