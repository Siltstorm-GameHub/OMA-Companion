// ============================================
// Tutorial-Fortschritt — geführter Einstieg
// ============================================
// Rein informative Checkliste (kein Blocker/Gate für andere Aktionen) — zeigt
// erledigte Schritte, den aktuellen Schritt hervorgehoben und die restlichen
// gedimmt. Erscheint nur, solange ein aktives (nicht abgeschlossenes)
// Tutorial läuft (siehe tutorial.ts) — sobald `step` "done" ist, rendert die
// Komponente nichts, der Aufrufer kann sie also bedenkenlos immer einbinden.

import Link from "next/link";
import { Check, Swords, Package, Pencil, Map } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { TutorialStepKey } from "@/lib/battle-cards/tutorial";

const STEP_ORDER: Exclude<TutorialStepKey, "done">[] = ["npc-battle", "community-pack", "customize", "campaign-level-1"];

const STEP_INFO: Record<
  Exclude<TutorialStepKey, "done">,
  { icon: LucideIcon; title: string; description: string; reward: string; href?: string }
> = {
  "npc-battle": {
    icon: Swords,
    title: "Kämpfe gegen einen NPC (Einfach)",
    description: "Starte weiter unten unter „Gegen NPC\" deinen ersten Übungskampf.",
    reward: "+200 Münzen & Community-Pack",
  },
  "community-pack": {
    icon: Package,
    title: "Öffne dein Community-Pack",
    description: "Es liegt schon in deinem Inventar — darin steckt garantiert deine eigene Community-Karte.",
    reward: "Deine Community-Karte",
  },
  customize: {
    icon: Pencil,
    title: "Passe deine Community-Karte an",
    description: "Gib ihr einen eigenen Untertitel und Beschreibungstext.",
    reward: "+500 Münzen",
    href: "/battle-cards/my-card",
  },
  "campaign-level-1": {
    icon: Map,
    title: "Spiele Level 1 der Kampagne",
    description: "Kapitel 1: Server-Neustart — dein erstes Level in der Kampagne.",
    reward: "Premium-Pack",
    href: "/battle-cards?tab=kampagne",
  },
};

export default function TutorialProgressBanner({ step }: { step: TutorialStepKey }) {
  if (step === "done") return null;
  const currentIndex = STEP_ORDER.indexOf(step);

  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      <p className="text-[10px] font-semibold text-violet-300 uppercase tracking-widest">Tutorial</p>
      <div className="space-y-2">
        {STEP_ORDER.map((key, i) => {
          const info = STEP_INFO[key];
          const Icon = info.icon;
          const done = i < currentIndex;
          const active = i === currentIndex;
          const content = (
            <div
              className={`flex items-center gap-3 rounded-xl p-2.5 transition-colors ${
                active ? "bg-violet-500/10 border border-violet-500/25" : ""
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  done ? "bg-emerald-500/15 text-emerald-400" : active ? "bg-violet-500/15 text-violet-300" : "bg-white/[0.04] text-gray-600"
                }`}
              >
                {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${done ? "text-gray-500 line-through" : active ? "text-white" : "text-gray-500"}`}>
                  {info.title}
                </p>
                {active && <p className="text-xs text-gray-400 mt-0.5">{info.description}</p>}
              </div>
              {!done && (
                <span className={`text-[10px] font-bold shrink-0 ${active ? "text-amber-300" : "text-gray-600"}`}>{info.reward}</span>
              )}
            </div>
          );
          return active && info.href ? (
            <Link key={key} href={info.href} className="block hover:bg-white/[0.02] rounded-xl transition-colors">
              {content}
            </Link>
          ) : (
            <div key={key}>{content}</div>
          );
        })}
      </div>
    </div>
  );
}
