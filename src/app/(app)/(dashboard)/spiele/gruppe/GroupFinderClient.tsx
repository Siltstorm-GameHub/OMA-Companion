"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import GameCover from "@/components/GameCover";
import RankedAvatar from "@/components/RankedAvatar";
import { Chip } from "@/components/games/GameFieldsForm";
import { ArrowLeft, Check, Dices, Heart, Loader2, Plus, Search, Users, X } from "@/components/icons";
import type { GameListItem } from "@/lib/games/filter";
import { rankForGroup, type GroupGameInfo, type GroupMatch } from "@/lib/games/group";
import { GAME_MODES, formatPlayers, type GameMode } from "@/lib/games/options";

interface Member { id: string; name: string; image: string | null }

const MAX_MEMBERS = 16;

function MatchRow({ match, names }: { match: GroupMatch; names: Map<string, string> }) {
  const g = match.game;
  const facts = [g.modes.map(m => GAME_MODES[m]).join(" · ") || null, formatPlayers(g.minPlayers, g.maxPlayers)].filter(Boolean);
  return (
    <Link href={`/spiele/${g.slug}`} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.04] transition-colors group">
      <GameCover game={g.name} coverUrl={g.coverUrl} className="w-24 h-11 sm:w-28 sm:h-13" rounded="rounded-md" fallbackVariant="plain" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate group-hover:text-teal-200 transition-colors">{g.name}</p>
        {facts.length > 0 && <p className="text-[11px] text-gray-500 truncate">{facts.join(" · ")}</p>}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-0.5 text-[11px]">
          {match.free && <span className="text-emerald-300">Kostenlos</span>}
          {match.wanters.length > 0 && (
            <span className="text-rose-300 inline-flex items-center gap-1"><Heart className="w-2.5 h-2.5" /> {match.wanters.length} auf der Wunschliste</span>
          )}
          {match.missing.length > 0 && (
            <span className="text-amber-300/90 truncate">Fehlt: {match.missing.map(id => names.get(id) ?? "?").join(", ")}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function GroupFinderClient({ games, members, meId }: { games: GameListItem[]; members: Member[]; meId: string }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([meId]);
  const [search, setSearch] = useState("");
  const [modes, setModes] = useState<GameMode[]>([]);
  const [info, setInfo] = useState<{ key: string; data: Record<string, GroupGameInfo> } | null>(null);

  const byId = useMemo(() => new Map(members.map(m => [m.id, m])), [members]);
  const names = useMemo(() => new Map(members.map(m => [m.id, m.id === meId ? "du" : m.name])), [members, meId]);
  const key = [...selected].sort().join(",");

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      fetch(`/api/games/group?users=${encodeURIComponent(key)}`)
        .then(r => (r.ok ? r.json() : {}))
        .then((data: Record<string, GroupGameInfo>) => { if (!cancelled) setInfo({ key, data }); })
        .catch(() => { if (!cancelled) setInfo({ key, data: {} }); });
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [key]);

  const loading = info?.key !== key;
  const filtered = useMemo(
    () => (modes.length === 0 ? games : games.filter(g => modes.some(m => g.modes.includes(m)))),
    [games, modes],
  );
  const result = useMemo(() => rankForGroup(filtered, info?.data ?? {}, selected), [filtered, info, selected]);

  const needle = search.trim().toLowerCase();
  const suggestions = needle
    ? members.filter(m => !selected.includes(m.id) && m.name.toLowerCase().includes(needle)).slice(0, 8)
    : [];

  const add = (id: string) => {
    setSelected(s => (s.includes(id) || s.length >= MAX_MEMBERS ? s : [...s, id]));
    setSearch("");
  };
  const remove = (id: string) => setSelected(s => s.filter(x => x !== id));

  const pickRandom = () => {
    const pool = result.ready.length > 0 ? result.ready : result.almost;
    if (pool.length === 0) return;
    router.push(`/spiele/${pool[Math.floor(Math.random() * pool.length)].game.slug}`);
  };

  return (
    <div className="p-3 sm:p-6 max-w-3xl mx-auto space-y-4 sm:space-y-5 animate-fade-in">
      <Link href="/spiele" className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Spieleliste
      </Link>

      <div>
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(20,184,166,0.12)", border: "1px solid rgba(20,184,166,0.25)" }}>
            <Users className="w-4.5 h-4.5 text-teal-400" />
          </div>
          <h1 className="font-display text-2xl font-black text-white tracking-tight">Was zocken wir?</h1>
        </div>
        <p className="text-xs text-gray-500 ml-11">Wähle, wer mitzockt — wir zeigen Spiele, die alle haben (oder die kostenlos sind) und zur Gruppengröße passen.</p>
      </div>

      {/* Gruppe */}
      <div className="surface rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-300">Wer zockt mit? <span className="text-gray-500 font-normal">({selected.length})</span></p>
          {selected.length > 1 && (
            <button type="button" onClick={() => setSelected([meId])} className="text-[11px] text-gray-500 hover:text-white">Zurücksetzen</button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {selected.map(id => {
            const m = byId.get(id);
            return (
              <span key={id} className="inline-flex items-center gap-1.5 rounded-full pl-0.5 pr-1 py-0.5 bg-teal-500/10 border border-teal-500/25 text-xs text-teal-100">
                <RankedAvatar userId={id} look={null} src={m?.image} alt={m?.name ?? ""} size={22} />
                {names.get(id) ?? "?"}
                {id !== meId && (
                  <button type="button" onClick={() => remove(id)} aria-label={`${m?.name ?? "Mitglied"} entfernen`} className="p-0.5 rounded-full hover:bg-white/10">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            );
          })}
        </div>
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && suggestions[0]) { e.preventDefault(); add(suggestions[0].id); } }}
            placeholder={selected.length >= MAX_MEMBERS ? `Maximal ${MAX_MEMBERS} Leute` : "Mitglied hinzufügen …"}
            disabled={selected.length >= MAX_MEMBERS}
            aria-label="Mitglied suchen"
            className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-8 pr-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-500/40 disabled:opacity-50"
          />
          {suggestions.length > 0 && (
            <div className="absolute z-20 left-0 right-0 mt-1 rounded-xl glass-heavy border border-white/10 overflow-hidden">
              {suggestions.map(m => (
                <button key={m.id} type="button" onClick={() => add(m.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-200 hover:bg-white/[0.06] text-left">
                  <RankedAvatar userId={m.id} look={null} src={m.image} alt={m.name} size={24} />
                  <span className="flex-1 truncate">{m.name}</span>
                  <Plus className="w-3.5 h-3.5 text-teal-400" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-xs text-gray-500 mr-0.5">Lust auf</span>
          {(["coop", "pvp"] as GameMode[]).map(m => (
            <Chip key={m} active={modes.includes(m)} onClick={() => setModes(x => (x.includes(m) ? x.filter(y => y !== m) : [...x, m]))}>
              {GAME_MODES[m]}
            </Chip>
          ))}
        </div>
      </div>

      {/* Ergebnis */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-xs text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Schaue, was ihr habt …
        </div>
      ) : (
        <>
          <section className="surface rounded-2xl p-2 sm:p-3">
            <div className="flex items-center justify-between gap-2 px-2 pt-1 pb-2">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-teal-400" /> {selected.length === 1 ? "Hast du" : "Haben alle"} ({result.ready.length})
              </h2>
              {(result.ready.length > 0 || result.almost.length > 0) && (
                <button type="button" onClick={pickRandom}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border border-teal-500/30 text-teal-200 hover:bg-teal-500/10 transition-colors">
                  <Dices className="w-3.5 h-3.5" /> Zufällig wählen
                </button>
              )}
            </div>
            {result.ready.length === 0 ? (
              <p className="text-xs text-gray-500 px-2 pb-2">
                Noch kein Spiel, das alle haben. Tipp: Markiert auf den Spiel-Seiten „Hab ich“ — oder tragt eure Lieblingsspiele im Profil ein.
              </p>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {result.ready.map(m => <MatchRow key={m.game.id} match={m} names={names} />)}
              </div>
            )}
          </section>

          {result.almost.length > 0 && (
            <section className="surface rounded-2xl p-2 sm:p-3">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 px-2 pt-1 pb-2">
                <Users className="w-3.5 h-3.5 text-amber-400" /> Fehlt nur wenigen ({result.almost.length})
              </h2>
              <div className="divide-y divide-white/[0.04]">
                {result.almost.map(m => <MatchRow key={m.game.id} match={m} names={names} />)}
              </div>
            </section>
          )}

          <p className="text-[11px] text-gray-600 text-center">
            Gezählt wird „Hab ich“ auf den Spiel-Seiten und „Zockt gerade“ im Profil. Kostenlose Spiele hat jeder.
          </p>
        </>
      )}
      <span className="sr-only" aria-live="polite">{loading ? "Lade Vorschläge" : `${result.ready.length} Spiele, die alle haben`}</span>
    </div>
  );
}
