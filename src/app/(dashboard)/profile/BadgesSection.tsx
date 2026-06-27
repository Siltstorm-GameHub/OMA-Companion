"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff, Pencil, X, Check, Plus } from "lucide-react";
import { BADGE_CATEGORY_LABELS, type Badge } from "@/lib/badges";

const MAX_SHOWCASE = 3;

type CustomBadgeDisplay = {
  id: string;
  icon: string;
  name: string;
  desc: string;
  category: string;
  earnedAt: string;
};

interface Props {
  systemBadges: Badge[];          // all system badges with earned/progress state
  customBadges: CustomBadgeDisplay[];
  showcaseKeys: string[];         // currently pinned badge keys (system) or "custom:<id>"
  readOnly?:    boolean;
}

export default function BadgesSection({ systemBadges, customBadges, showcaseKeys: initialKeys, readOnly = false }: Props) {
  const router = useRouter();
  const [showUnearned, setShowUnearned] = useState(false);
  const [editingShowcase, setEditingShowcase] = useState(false);
  const [selected, setSelected] = useState<string[]>(initialKeys);
  const [saving, setSaving] = useState(false);

  const earnedSystem  = systemBadges.filter(b => b.earned);
  const unearnedSystem = systemBadges.filter(b => !b.earned);

  const allPinnable = [
    ...earnedSystem.map(b => ({ key: b.id, icon: b.icon, name: b.name })),
    ...customBadges.map(b => ({ key: `custom:${b.id}`, icon: b.icon, name: b.name })),
  ];

  const showcaseDisplay = selected.map(key => allPinnable.find(b => b.key === key)).filter(Boolean) as typeof allPinnable;

  function togglePin(key: string) {
    setSelected(prev => {
      if (prev.includes(key)) return prev.filter(k => k !== key);
      if (prev.length >= MAX_SHOWCASE) {
        toast.error(`Maximal ${MAX_SHOWCASE} Abzeichen anpinnen`);
        return prev;
      }
      return [...prev, key];
    });
  }

  async function saveShowcase() {
    setSaving(true);
    try {
      const res = await fetch("/api/profile/badge-showcase", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys: selected }),
      });
      if (res.ok) {
        toast.success("Showcase gespeichert");
        setEditingShowcase(false);
        router.refresh();
      } else {
        toast.error((await res.json()).error ?? "Fehler");
      }
    } finally { setSaving(false); }
  }

  const totalEarned = earnedSystem.length + customBadges.length;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
          🏅 Abzeichen <span className="text-gray-600 normal-case">({totalEarned})</span>
        </h2>
        {!readOnly && (
          <div className="flex items-center gap-2">
            {unearnedSystem.length > 0 && (
              <button onClick={() => setShowUnearned(v => !v)}
                className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-gray-300 transition-colors">
                {showUnearned ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showUnearned ? "Nicht verdiente ausblenden" : "Nicht verdiente einblenden"}
              </button>
            )}
            {totalEarned > 0 && (
              <button onClick={() => { setEditingShowcase(v => !v); setSelected(initialKeys); }}
                className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-gray-300 transition-colors">
                <Pencil className="w-3 h-3" /> Showcase
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Showcase slots ────────────────────────────── */}
      {(showcaseDisplay.length > 0 || editingShowcase) && (
        <div className="glass rounded-2xl p-4 space-y-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">Gepinnte Abzeichen</p>
          <div className="flex gap-3">
            {Array.from({ length: MAX_SHOWCASE }).map((_, i) => {
              const item = showcaseDisplay[i];
              return (
                <div key={i}
                  className={`relative flex-1 aspect-square max-w-[80px] rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all ${
                    item
                      ? "border-purple-500/30 bg-purple-500/5"
                      : "border-white/10 bg-white/[0.02]"
                  } ${!readOnly && editingShowcase && item ? "cursor-pointer hover:border-red-500/40" : ""}`}
                  onClick={() => !readOnly && editingShowcase && item && togglePin(item.key)}
                  title={item?.name}>
                  {item ? (
                    <>
                      <span className="text-2xl">{item.icon}</span>
                      <span className="text-[9px] text-gray-400 text-center px-1 leading-tight line-clamp-2">{item.name}</span>
                      {!readOnly && editingShowcase && (
                        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500/80 flex items-center justify-center">
                          <X className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                    </>
                  ) : (
                    <Plus className="w-5 h-5 text-gray-700" />
                  )}
                </div>
              );
            })}
          </div>

          {!readOnly && editingShowcase && (
            <>
              <p className="text-[10px] text-gray-500">Abzeichen auswählen (max. {MAX_SHOWCASE}):</p>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                {allPinnable.map(b => {
                  const pinned = selected.includes(b.key);
                  return (
                    <button key={b.key} onClick={() => togglePin(b.key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                        pinned
                          ? "border-purple-500/50 bg-purple-500/10 text-purple-300"
                          : "border-white/10 bg-white/[0.02] text-gray-400 hover:border-white/20"
                      }`}>
                      <span>{b.icon}</span> {b.name}
                      {pinned && <Check className="w-3 h-3" />}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setEditingShowcase(false); setSelected(initialKeys); }}
                  className="text-xs text-gray-400 hover:text-white px-3 py-1.5">Abbrechen</button>
                <button onClick={saveShowcase} disabled={saving}
                  className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-medium px-4 py-1.5 rounded-xl transition-colors">
                  {saving ? "Speichern…" : <><Check className="w-3 h-3" /> Speichern</>}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Earned system badges by category ─────────── */}
      {earnedSystem.length === 0 && customBadges.length === 0 && !showUnearned && (
        <p className="text-xs text-gray-600 italic">Noch keine Abzeichen verdient.</p>
      )}

      {Object.entries(BADGE_CATEGORY_LABELS).map(([cat, label]) => {
        const catEarned   = earnedSystem.filter(b => b.category === cat);
        const catUnearned = showUnearned ? unearnedSystem.filter(b => b.category === cat) : [];
        if (!catEarned.length && !catUnearned.length) return null;
        return (
          <div key={cat} className="space-y-2">
            <p className="text-[10px] text-gray-600 uppercase tracking-widest">{label}</p>
            <div className="flex flex-wrap gap-2">
              {catEarned.map(badge => (
                <div key={badge.id} title={badge.desc}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium glass text-white border-white/10 hover:border-teal-500/30 transition-all">
                  <span>{badge.icon}</span> {badge.name}
                </div>
              ))}
              {catUnearned.map(badge => (
                <div key={badge.id} title={`${badge.desc}${badge.progress ? ` (${badge.progress.current}/${badge.progress.target})` : ""}`}
                  className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium text-gray-600 border-white/[0.06] bg-white/[0.02] overflow-hidden">
                  {badge.progress && (
                    <div className="absolute inset-0 rounded-full overflow-hidden">
                      <div className="h-full bg-white/[0.04] transition-all"
                        style={{ width: `${Math.round((badge.progress.current / badge.progress.target) * 100)}%` }} />
                    </div>
                  )}
                  <span className="relative opacity-50">{badge.icon}</span>
                  <span className="relative">{badge.name}</span>
                  {badge.progress && (
                    <span className="relative text-[9px] text-gray-700 tabular-nums">{badge.progress.current}/{badge.progress.target}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* ── Custom badges ─────────────────────────────── */}
      {customBadges.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] text-gray-600 uppercase tracking-widest">Besondere Leistungen</p>
          <div className="flex flex-wrap gap-2">
            {customBadges.map(badge => (
              <div key={badge.id} title={badge.desc}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium border-amber-500/30 bg-amber-500/5 text-amber-300 hover:border-amber-500/50 transition-all">
                <span>{badge.icon}</span> {badge.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
