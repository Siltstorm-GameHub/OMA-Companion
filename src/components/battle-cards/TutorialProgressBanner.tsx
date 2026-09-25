// ============================================
// Tutorial-Fortschritt — geführter Einstieg
// ============================================
// Rein informative Checkliste (kein Blocker/Gate für andere Aktionen) — zeigt
// erledigte Schritte, den aktuellen Schritt hervorgehoben und die restlichen
// gedimmt. Erscheint nur, solange ein aktives (nicht abgeschlossenes)
// Tutorial läuft (siehe tutorial.ts) — sobald `step` "done" ist, rendert die
// Komponente nichts, der Aufrufer kann sie also bedenkenlos immer einbinden.

import Link from "next/link";
import { Check, Pencil } from "@/components/icons";
import MobaIcon from "./MobaIcon";
import type { MobaIconName } from "@/lib/battle-cards/moba-icons";
import type { TutorialStepKey } from "@/lib/battle-cards/tutorial";

const STEP_ORDER: Exclude<TutorialStepKey, "done">[] = ["npc-battle", "community-pack", "customize", "campaign-level-1"];

const STEP_INFO: Record<
  Exclude<TutorialStepKey, "done">,
  { icon: MobaIconName | null; title: string; description: string; reward: string; href?: string }
> = {
  "npc-battle": {
    icon: "crossedSwords",
    title: "Kämpfe gegen einen NPC (Einfach)",
    description: "Starte weiter unten unter „Gegen NPC\" deinen ersten Übungskampf.",
    reward: "+200 Münzen & Community-Pack",
  },
  "community-pack": {
    icon: "chest",
    title: "Öffne dein Community-Pack",
    description: "Es liegt schon in deinem Inventar — darin steckt garantiert deine eigene Community-Karte.",
    reward: "Deine Community-Karte",
  },
  customize: {
    // Kein Stift-Icon im Kit — Ausnahme, bleibt Lucide.
    icon: null,
    title: "Passe deine Community-Karte an",
    description: "Gib ihr einen eigenen Untertitel und Beschreibungstext.",
    reward: "+500 Münzen",
    href: "/battle-cards/my-card",
  },
  "campaign-level-1": {
    icon: "map",
    title: "Spiele Level 1 der Kampagne",
    description: "Kapitel 1: Server-Neustart — dein erstes Level in der Kampagne.",
    reward: "Premium-Pack",
    href: "/battle-cards?tab=arena",
  },
};

export default function TutorialProgressBanner({ step }: { step: TutorialStepKey }) {
  if (step === "done") return null;
  const currentIndex = STEP_ORDER.indexOf(step);

  return (
    <div className="moba-panel rounded-2xl p-4 space-y-3">
      <p className="text-[10px] font-semibold text-[color:var(--moba-accent)] uppercase tracking-widest">Tutorial</p>
      <div className="space-y-2">
        {STEP_ORDER.map((key, i) => {
          const info = STEP_INFO[key];
          const done = i < currentIndex;
          const active = i === currentIndex;
          const content = (
            <div
              className={`flex items-center gap-3 rounded-xl p-2.5 transition-colors ${
                active ? "bg-orange-500/10 border border-[color:var(--moba-accent-line-strong)]" : ""
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  done ? "bg-emerald-500/15 text-emerald-400" : active ? "bg-orange-500/15 text-[color:var(--moba-accent)]" : "bg-black/20 text-[color:var(--moba-ink-dim)]"
                }`}
              >
                {done ? <Check className="w-4 h-4" /> : info.icon ? <MobaIcon name={info.icon} className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
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
