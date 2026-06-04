"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { X, CalendarDays, Scroll, Star, Swords, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";

const STEPS = [
  {
    icon: <Sparkles className="w-8 h-8 text-rose-400" />,
    bg: "from-rose-500/10",
    title: "Willkommen bei OMA! 👋",
    desc: "Der offizielle Companion für die Old Masters Ally Community. Hier findest du alles rund um Events, Turniere und dein persönliches Ranking.",
    action: null,
  },
  {
    icon: <CalendarDays className="w-8 h-8 text-blue-400" />,
    bg: "from-blue-500/10",
    title: "Events entdecken",
    desc: "Melde dich für Community-Events an, verdiene Punkte und steige im Ranking auf. Neue Events werden automatisch von Discord synchronisiert.",
    action: { label: "Events ansehen", href: "/events" },
  },
  {
    icon: <Scroll className="w-8 h-8 text-amber-400" />,
    bg: "from-amber-500/10",
    title: "Monatliche Quests",
    desc: "Jeden Monat gibt es neue Quests: Sprachkanal-Stunden, Nachrichten, Event-Teilnahmen. Schließe sie ab und kassiere Bonus-Punkte.",
    action: { label: "Quests ansehen", href: "/quests" },
  },
  {
    icon: <Star className="w-8 h-8 text-purple-400" />,
    bg: "from-purple-500/10",
    title: "Punkte & Level",
    desc: "Jede Aktivität bringt Punkte. Mit Punkten steigst du im Level und Rang auf — von Neuling bis Grandmaster. Verfolge deinen Fortschritt im Profil.",
    action: { label: "Punktesystem", href: "/points" },
  },
  {
    icon: <Swords className="w-8 h-8 text-emerald-400" />,
    bg: "from-emerald-500/10",
    title: "Level-Up-League",
    desc: "Die interne Liga mit wöchentlichen Spieltagen. Zeige was du kannst, sammle Liga-Punkte und klettere in der Saisonwertung nach oben.",
    action: { label: "Liga ansehen", href: "/lul" },
  },
];

const STORAGE_KEY = "oma-onboarding-done";

export function OnboardingModal() {
  const [show, setShow]   = useState(false);
  const [step, setStep]   = useState(0);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      // Kleine Verzögerung damit die Seite zuerst lädt
      const t = setTimeout(() => setShow(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  function dismiss() {
    setExiting(true);
    setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, "1");
      setShow(false);
      setExiting(false);
    }, 250);
  }

  function next() { if (step < STEPS.length - 1) setStep(s => s + 1); else dismiss(); }
  function prev() { if (step > 0) setStep(s => s - 1); }

  if (!show) return null;

  const current = STEPS[step];

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-250 ${exiting ? "opacity-0" : "opacity-100"}`}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={dismiss} />

      {/* Modal */}
      <div className={`relative glass card-shine rounded-2xl w-full max-w-sm overflow-hidden transition-all duration-300 ${exiting ? "scale-95 opacity-0" : "scale-100 opacity-100"}`}>
        {/* Gradient bg */}
        <div className={`absolute inset-0 bg-gradient-to-br ${current.bg} to-transparent pointer-events-none`} />
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

        {/* Close */}
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 z-10 w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/[0.06] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="relative p-6">
          {/* Step indicator */}
          <div className="flex gap-1.5 mb-6">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === step ? "flex-1 bg-rose-400" : i < step ? "flex-1 bg-rose-400/40" : "flex-1 bg-white/[0.08]"
                }`}
              />
            ))}
          </div>

          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center mb-5">
            {current.icon}
          </div>

          {/* Content */}
          <h2 className="text-lg font-bold text-white mb-2">{current.title}</h2>
          <p className="text-sm text-gray-400 leading-relaxed mb-6">{current.desc}</p>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={prev}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-white px-3 py-2.5 rounded-xl hover:bg-white/[0.05] transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}

            {current.action && (
              <Link
                href={current.action.href}
                onClick={dismiss}
                className="flex items-center gap-1.5 text-sm glass border border-white/[0.08] hover:border-white/[0.2] text-gray-300 hover:text-white px-4 py-2.5 rounded-xl transition-all"
              >
                {current.action.label}
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}

            <button
              onClick={next}
              className="ml-auto flex items-center gap-1.5 text-sm bg-rose-600 hover:bg-rose-500 text-white px-4 py-2.5 rounded-xl transition-colors font-medium"
            >
              {step === STEPS.length - 1 ? "Los geht's!" : "Weiter"}
              {step < STEPS.length - 1 && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
