// ============================================
// Battle-Cards-Hub — Reiter "Held" (Startseite)
// ============================================
// Cockpit statt Menü: wer ist mein Held, was wartet auf mich, wo geht es weiter. Reine Darstellung (Server-Komponente); die Daten
// kommen aus page.tsx und lib/battle-cards/hub-hero.ts. Jede Zeile in "Das wartet auf dich" erscheint nur, wenn wirklich etwas offen ist.

import Link from "next/link";
import CoinIcon from "@/components/CoinIcon";
import MobaIcon from "@/components/battle-cards/MobaIcon";
import TutorialProgressBanner from "@/components/battle-cards/TutorialProgressBanner";
import type { TutorialStepKey } from "@/lib/battle-cards/tutorial";
import { HubCharacterSheet } from "@/components/battle-cards/HubQuestPanels";
import TeCharacter from "@/components/te-character/TeCharacter";
import { TE_CROP_FIGURE, defaultTeConfig, sanitizeTeConfig } from "@/lib/te-character";
import { MAX_LEVEL, levelOf, levelProgress, xpForLevel } from "@/lib/te-map/rpg";
import { getDndClass } from "@/lib/dnd/classes";
import { titleOf } from "@/lib/dnd/perks";
import { displayTitle } from "@/lib/dnd/coin-shop";
import { worldEntryLabel, type HeroCockpit } from "@/lib/battle-cards/hub-hero";

const CHRONICLE_ICON: Record<string, string> = { quest: "📜", level: "⭐", location: "📍", announce: "📣", event: "🎲" };

function ago(iso: string): string {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (min < 1) return "gerade eben";
  if (min < 60) return `vor ${min} Min.`;
  const h = Math.round(min / 60);
  if (h < 24) return `vor ${h} Std.`;
  const d = Math.round(h / 24);
  return d === 1 ? "gestern" : `vor ${d} Tagen`;
}

interface Waiting { icon: "chest" | "crossedSwords" | "star" | "coin" | "friends"; text: string; href: string }

export default function HeldPanel({
  cockpit, tutorialStep, coins, eloOverall, unopenedPacks, pendingChallenges, spunToday,
}: {
  cockpit: HeroCockpit;
  tutorialStep: TutorialStepKey;
  coins: number;
  eloOverall: number;
  unopenedPacks: number;
  pendingChallenges: number;
  spunToday: boolean;
}) {
  const { card, place, tracker, party, invites, chronicle } = cockpit;
  const level = levelOf(card.dndXp);
  const maxed = level >= MAX_LEVEL;
  const className = card.dndClass ? getDndClass(card.dndClass)?.name ?? card.dndClass : null;
  const openPoints = card.dndAttrPoints + card.dndPerkPicks;
  const character = sanitizeTeConfig(card.teCharacter) ?? defaultTeConfig();

  const waiting: Waiting[] = [];
  if (unopenedPacks > 0) waiting.push({ icon: "chest", text: `${unopenedPacks} ungeöffnete${unopenedPacks === 1 ? "s Pack" : " Packs"}`, href: "/battle-cards?tab=laden" });
  if (pendingChallenges > 0) waiting.push({ icon: "crossedSwords", text: `${pendingChallenges} Herausforderung${pendingChallenges === 1 ? "" : "en"} von der Community`, href: "/battle-cards?tab=arena" });
  if (card.dndAttrPoints > 0) waiting.push({ icon: "star", text: `${card.dndAttrPoints} Attributspunkt${card.dndAttrPoints === 1 ? "" : "e"} zu verteilen`, href: "#charakterblatt" });
  if (card.dndPerkPicks > 0) waiting.push({ icon: "star", text: `${card.dndPerkPicks} Fähigkeit${card.dndPerkPicks === 1 ? "" : "en"} zu wählen`, href: "#charakterblatt" });
  for (const inv of invites) waiting.push({ icon: "friends", text: `${inv.fromName} lädt dich in eine Gruppe ein`, href: "/oma-quest" });
  if (!spunToday) waiting.push({ icon: "coin", text: "Das tägliche Glücksrad ist bereit", href: "/battle-cards?tab=laden" });

  const worldLabel = worldEntryLabel(card, place);

  return (
    <div className="space-y-6">
      <TutorialProgressBanner step={tutorialStep} />

      {/* Held */}
      <div className="moba-panel rounded-2xl p-4">
        <div className="flex items-center gap-4">
          <div className="shrink-0 rounded-xl bg-black/30 border border-white/10 p-2">
            <TeCharacter config={character} scale={4} crop={TE_CROP_FIGURE} title={card.name} />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Dein Held</p>
              <h1 className="text-xl font-black text-white truncate">{card.name}</h1>
              <p className="text-xs text-gray-400">
                {displayTitle(card, titleOf(level))}{className ? ` · ${className}` : ""} · Stufe {level}
              </p>
            </div>
            <div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-[color:var(--moba-accent)]" style={{ width: `${Math.round(levelProgress(card.dndXp) * 100)}%` }} />
              </div>
              <p className="mt-1 text-[10px] text-gray-500 tabular-nums">
                {maxed ? "Höchste Stufe erreicht" : `${card.dndXp} / ${xpForLevel(level + 1)} XP bis Stufe ${level + 1}`}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="moba-pill normal-case px-3 py-2 text-amber-400 font-bold tabular-nums" title="App-Münzen">
            <CoinIcon size={14} /> {coins} Münzen
          </span>
          <span className="moba-pill normal-case px-3 py-2 text-yellow-300 font-bold tabular-nums" title="Gold gibt es nur in OMA Quest">
            {card.dndGold} Gold
          </span>
          <span className="moba-pill normal-case px-3 py-2 text-gray-300 tabular-nums">Elo {eloOverall}</span>
          <Link href="/battle-cards/my-card" className="moba-pill normal-case font-semibold px-3 py-2 hover:bg-white/[0.06] transition-colors">
            <MobaIcon name="profile" className="w-3.5 h-3.5" /> Heldenkarte
          </Link>
        </div>
      </div>

      {/* Weitermachen */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/oma-quest" className="moba-panel rounded-2xl p-4 hover:bg-white/[0.04] transition-colors flex items-center gap-3">
          <MobaIcon name="map" className="w-8 h-8 shrink-0" />
          <span className="min-w-0">
            <span className="block text-sm font-bold text-white truncate">{worldLabel.title}</span>
            <span className="block text-xs text-gray-500">{worldLabel.sub}</span>
          </span>
        </Link>
        <Link href="/battle-cards?tab=arena" className="moba-panel rounded-2xl p-4 hover:bg-white/[0.04] transition-colors flex items-center gap-3">
          <MobaIcon name="crossedSwords" className="w-8 h-8 shrink-0" />
          <span>
            <span className="block text-sm font-bold text-white">Kampf starten</span>
            <span className="block text-xs text-gray-500">Duels, Gems, Kampagne</span>
          </span>
        </Link>
      </div>

      {/* Was wartet */}
      {waiting.length > 0 && (
        <div className="moba-panel rounded-2xl p-4 space-y-2">
          <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
            Das wartet auf dich{openPoints > 0 ? ` · ${openPoints} offen` : ""}
          </h2>
          {waiting.map((w) => (
            <Link key={w.text} href={w.href} className="flex items-center gap-2 text-sm text-gray-200 hover:text-white transition-colors">
              <MobaIcon name={w.icon} className="w-4 h-4 shrink-0" /> {w.text}
            </Link>
          ))}
        </div>
      )}

      {/* Charakterblatt: Attribute verteilen, Fähigkeiten wählen */}
      {card.dndCreatedAt && (
        <details id="charakterblatt" open={openPoints > 0} className="group scroll-mt-4">
          <summary className="moba-panel rounded-2xl p-4 cursor-pointer list-none flex items-center justify-between gap-3">
            <span className="text-sm font-bold text-white">Charakterblatt</span>
            <span className="text-xs text-gray-400">
              {openPoints > 0 ? `${openPoints} offen · ` : ""}Attribute &amp; Fähigkeiten
              <span className="ml-2 inline-block transition-transform group-open:rotate-90" aria-hidden>›</span>
            </span>
          </summary>
          <div className="mt-2"><HubCharacterSheet /></div>
        </details>
      )}

      {/* Aktuelle Quests */}
      {tracker.length > 0 && (
        <div className="moba-panel rounded-2xl p-4 space-y-3">
          <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Aktuelle Quests</h2>
          {tracker.map((q) => (
            <div key={q.slug} className="text-sm">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold text-white">{q.title}</span>
                <span className="text-[10px] text-gray-500 tabular-nums shrink-0">{q.progress}</span>
              </div>
              <p className="text-xs text-gray-400">{q.objective}{q.where ? ` — ${q.where}` : ""}</p>
            </div>
          ))}
        </div>
      )}

      {/* Gruppe */}
      {party && party.members.length > 1 && (
        <div className="moba-panel rounded-2xl p-4 space-y-2">
          <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Deine Gruppe</h2>
          <div className="flex flex-wrap gap-2">
            {party.members.filter((m) => m.cardId !== card.id).map((m) => (
              <span key={m.cardId} className="moba-pill normal-case px-3 py-1.5 text-xs text-gray-200">
                {m.name}{m.here ? " · bei dir" : ""}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Chronik */}
      {chronicle.length > 0 && (
        <div className="moba-panel rounded-2xl p-4 space-y-2">
          <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Heute im Reich</h2>
          {chronicle.map((c) => (
            <p key={c.id} className="text-xs text-gray-300 flex gap-2">
              <span aria-hidden>{CHRONICLE_ICON[c.kind] ?? "•"}</span>
              <span className="flex-1">{c.text}</span>
              <span className="text-gray-600 shrink-0">{ago(c.createdAt)}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
