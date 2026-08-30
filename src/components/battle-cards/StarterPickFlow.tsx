"use client";

// ============================================
// Start-Pack — Auswahl-Flow (4-Schritte-Wizard)
// ============================================
// Schritt 1-3: je 1 Karte aus Tank/Damage Dealer/Support wählen (Pflicht,
// nacheinander, mit "Zurück"-Möglichkeit). Schritt 4: aus allen verbliebenen
// Standard-Karten 2 weitere frei wählen — auch eine bereits gewählte Klasse
// ein zweites Mal ist erlaubt (zählt dann als Duplikat). Community-Karten
// tauchen hier nie auf: die Seite reicht nur rarity=STANDARD-Karten herein.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AnimatePresence, motion } from "motion/react";
import { Check, Shield, Swords, HeartPulse, Gift, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import BattleCardView, { type BattleCardData } from "./BattleCardView";

type ClassKey = "TANK" | "DAMAGE_DEALER" | "SUPPORT";
type CardWithId = BattleCardData & { id: string };

const CLASS_CONFIG: Record<ClassKey, { color: string; icon: LucideIcon; label: string }> = {
  TANK: { color: "#14b8a6", icon: Shield, label: "Tank" },
  DAMAGE_DEALER: { color: "#ef4444", icon: Swords, label: "Damage Dealer" },
  SUPPORT: { color: "#8b5cf6", icon: HeartPulse, label: "Support" },
};
const CLASS_ORDER: ClassKey[] = ["TANK", "DAMAGE_DEALER", "SUPPORT"];

type StepDef = { key: ClassKey | "bonus"; label: string; color: string; icon: LucideIcon };
const STEPS: StepDef[] = [
  ...CLASS_ORDER.map((cls) => ({ key: cls, label: CLASS_CONFIG[cls].label, color: CLASS_CONFIG[cls].color, icon: CLASS_CONFIG[cls].icon })),
  { key: "bonus" as const, label: "Bonus-Karten", color: "#f59e0b", icon: Gift },
];

function StepProgress({ current }: { current: number }) {
  return (
    <div className="flex items-center">
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        const done = i < current;
        const active = i === current;
        return (
          <div key={s.key} className={`flex items-center ${i < STEPS.length - 1 ? "flex-1" : ""}`}>
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors duration-300"
                style={{
                  borderColor: done || active ? s.color : "rgba(255,255,255,0.12)",
                  background: done ? s.color : active ? `${s.color}22` : "transparent",
                }}
              >
                {done ? <Check className="w-4 h-4 text-black" /> : <Icon className="w-4 h-4" style={{ color: active ? s.color : "#52525b" }} />}
              </div>
              <span
                className="hidden sm:block text-[9px] uppercase tracking-wide font-semibold whitespace-nowrap"
                style={{ color: active ? s.color : "#6b7280" }}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="h-0.5 flex-1 mx-1.5 sm:mx-2 rounded-full transition-colors duration-300" style={{ background: done ? s.color : "rgba(255,255,255,0.08)" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function CardChoice({
  card,
  color,
  selected,
  disabled,
  onSelect,
  delay = 0,
}: {
  card: CardWithId;
  color: string;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28, scale: 0.94 }}
      animate={{ opacity: disabled ? 0.35 : 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.35, ease: "easeOut" }}
      className="flex flex-col items-center gap-2.5"
    >
      <div
        className="relative rounded-2xl"
        style={{
          boxShadow: selected ? `0 0 0 3px ${color}, 0 0 28px ${color}66` : "0 0 0 1px rgba(255,255,255,0.06)",
          transition: "box-shadow 0.25s ease",
        }}
      >
        <BattleCardView card={card} />
        <AnimatePresence>
          {selected && (
            <motion.span
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center shadow-lg"
              style={{ background: color }}
            >
              <Check className="w-4 h-4 text-black" />
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <button
        type="button"
        onClick={onSelect}
        disabled={disabled}
        className="w-full max-w-[240px] py-2 rounded-xl text-sm font-semibold transition-all disabled:cursor-not-allowed"
        style={{ background: selected ? color : "rgba(255,255,255,0.06)", color: selected ? "#000" : "#e5e7eb" }}
      >
        {selected ? "Ausgewählt" : "Auswählen"}
      </button>
    </motion.div>
  );
}

export default function StarterPickFlow({ cards }: { cards: CardWithId[] }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [classPicks, setClassPicks] = useState<Partial<Record<ClassKey, string>>>({});
  const [bonusPicks, setBonusPicks] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const cardsByClass = useMemo(() => {
    const map: Record<ClassKey, CardWithId[]> = { TANK: [], DAMAGE_DEALER: [], SUPPORT: [] };
    for (const c of cards) map[c.class].push(c);
    return map;
  }, [cards]);

  const stepDef = STEPS[step];
  const isBonusStep = stepDef.key === "bonus";
  const isLastStep = step === STEPS.length - 1;
  const stepValid = isBonusStep ? bonusPicks.length === 2 : !!classPicks[stepDef.key as ClassKey];

  function pickClass(cls: ClassKey, cardId: string) {
    setClassPicks((prev) => ({ ...prev, [cls]: cardId }));
  }

  function toggleBonus(cardId: string) {
    setBonusPicks((prev) => {
      if (prev.includes(cardId)) return prev.filter((id) => id !== cardId);
      if (prev.length >= 2) return prev;
      return [...prev, cardId];
    });
  }

  function goBack() {
    if (step === 0) return;
    setDirection(-1);
    setStep((s) => s - 1);
  }

  function goNext() {
    if (!stepValid || submitting) return;
    if (isLastStep) { submit(); return; }
    setDirection(1);
    setStep((s) => s + 1);
  }

  async function submit() {
    setSubmitting(true);
    try {
      const cardIds = [...CLASS_ORDER.map((cls) => classPicks[cls]!), ...bonusPicks];
      const res = await fetch("/api/battle-cards/starter-pick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardIds }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Fehler beim Speichern");
        return;
      }
      toast.success("Start-Pack gewählt!");
      router.push("/battle-cards");
      router.refresh();
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setSubmitting(false);
    }
  }

  const classCards = !isBonusStep ? cardsByClass[stepDef.key as ClassKey] : [];
  const showVs = !isBonusStep && classCards.length === 2;

  return (
    <div className="space-y-6">
      <StepProgress current={step} />

      <AnimatePresence mode="wait">
        <motion.div
          key={stepDef.key}
          initial={{ opacity: 0, x: direction * 48 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction * -48 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="space-y-5"
        >
          <div className="text-center space-y-1">
            <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: stepDef.color }}>
              Schritt {step + 1}/{STEPS.length}
            </p>
            <h2 className="text-xl font-black text-white">
              {isBonusStep ? `Wähle 2 weitere Karten (${bonusPicks.length}/2)` : `Wähle deinen ${stepDef.label}`}
            </h2>
            {isBonusStep && (
              <p className="text-xs text-gray-500">Eine bereits gewählte Karte darfst du hier erneut nehmen.</p>
            )}
          </div>

          {!isBonusStep ? (
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 py-2">
              {classCards.map((card, i) => (
                <div key={card.id} className="flex items-center gap-6 sm:gap-10">
                  <CardChoice
                    card={card}
                    color={stepDef.color}
                    selected={classPicks[stepDef.key as ClassKey] === card.id}
                    onSelect={() => pickClass(stepDef.key as ClassKey, card.id)}
                    delay={i * 0.08}
                  />
                  {showVs && i === 0 && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.15 }}
                      className="text-lg font-black text-gray-700 select-none"
                    >
                      VS
                    </motion.span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-6 justify-items-center">
              {cards.map((card, i) => (
                <CardChoice
                  key={card.id}
                  card={card}
                  color="#f59e0b"
                  selected={bonusPicks.includes(card.id)}
                  disabled={bonusPicks.length >= 2 && !bonusPicks.includes(card.id)}
                  onSelect={() => toggleBonus(card.id)}
                  delay={i * 0.04}
                />
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={goBack}
          disabled={step === 0}
          className="flex items-center gap-1.5 px-4 py-3 rounded-xl text-sm font-semibold text-gray-400 hover:text-white disabled:opacity-0 disabled:pointer-events-none transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Zurück
        </button>
        <button
          type="button"
          onClick={goNext}
          disabled={!stepValid || submitting}
          className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ background: stepDef.color, color: "#000" }}
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isLastStep ? (
            "Start-Pack bestätigen"
          ) : (
            <>Weiter <ArrowRight className="w-4 h-4" /></>
          )}
        </button>
      </div>
    </div>
  );
}
