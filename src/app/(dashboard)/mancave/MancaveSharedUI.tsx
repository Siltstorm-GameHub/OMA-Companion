"use client";
import { useState, type Dispatch, type SetStateAction } from "react";
import Image from "next/image";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import {
  Trophy, Package, CalendarDays, Medal, Swords, Clock, MessageSquare, Gamepad2, Wrench, Lock,
  ArrowUpCircle, ArrowDownCircle, ArrowLeft, FlaskConical, Home, Mail, BarChart3,
} from "lucide-react";
import CoinIcon from "@/components/CoinIcon";
import RankedAvatar from "@/components/RankedAvatar";
import type { MancaveData } from "./mancave-data";
import { cn } from "@/lib/utils";
import { CATEGORY_CONFIG } from "@/lib/wanderpocal";

export type MancavePanel = "trophy" | "items" | "mail" | "wanderpokale-kategorie" | "wanderpokale-genre" | "eventpokale" | null;

/**
 * `<Html>` (drei, 3D-verankerte Overlays wie der Monitor-Screen) rendert
 * seinen Inhalt NICHT als normales React-Portal, sondern über einen eigenen
 * `ReactDOM.createRoot()` — ein komplett separater React-Baum ohne Zugriff
 * auf JEDEN React-Context der App, inklusive Next.js' Router-Context.
 * `useRouter()` würde dort mit einer Exception crashen ("invariant expected
 * app router to be mounted"). JobsPanel/ItemsPanel riefen früher genau
 * deshalb `router.refresh()` (bzw. als Fallback `window.location.reload()`)
 * auf, um nach einem Upgrade/einer Job-Aktion den Rest der Seite zu
 * aktualisieren — das hat auf dem Monitor-Screen IMMER den kompletten
 * Reload-Zweig getroffen, nie den Router-Zweig, und dadurch bei jeder
 * Aktion die ganze 3D-Ansicht (Kamera, WebGL-Kontext, geladene Modelle) neu
 * geladen (User-Feedback). Beide Panels patchen ihre Änderungen jetzt
 * stattdessen über `onDataChange` direkt in `MonitorScreenContent`s
 * lokalen State (siehe dort) — reine Prop-Callbacks funktionieren über die
 * `<Html>`-Grenze hinweg problemlos, nur Context-basierte Hooks wie
 * `useRouter()` nicht.
 */

/**
 * Wie viele Benachrichtigungen gerade anliegen (bezahlbare Upgrades) — treibt
 * den Mail-Badge im Monitor-Dock. Rein aus den ohnehin geladenen Daten
 * berechnet, kein eigener "gelesen"-Zustand (siehe MailPanel-Kommentar).
 */
function notificationCount(data: MancaveData): number {
  return data.items.filter(i => i.nextCost !== null && i.nextCost <= data.totalPoints).length;
}

const PANEL_TITLES: Record<Exclude<MancavePanel, null>, string> = {
  trophy: "Statistik", items: "Ausbau", mail: "Postfach",
  "wanderpokale-kategorie": "Kategorie-Wanderpokale", "wanderpokale-genre": "Genre-Wanderpokale",
  eventpokale: "Event-Pokale",
};

/**
 * "Echter Desktop"-Look: dunkler Hintergrund mit großem, blassem OMA-Logo
 * als Wallpaper-Wasserzeichen (wie ein echter PC-Desktop), oben rechts eine
 * schmale "System-Tray"-Leiste (Rang + Münzen), unten ein Dock/Taskbar mit
 * den Panel-Icons. Rendert bei fester Pixelgröße (siehe SCREEN_CONTENT_W/H
 * in MancaveScene3D.tsx), daher feste px-Werte statt vw-Clamp-Werten.
 *
 * Verwaltet den geöffneten Panel-Zustand SELBST (statt über die 3D-Szene) —
 * ein Klick auf ein Dock-Icon öffnet das Panel DIREKT AUF DEM MONITOR
 * (schmale Titelleiste mit Zurück-Pfeil + scrollbarer Inhalt), statt eines
 * bildschirmfüllenden Popups. User-Wunsch: "Anzeige bleibt auf dem Monitor".
 * Der separate Pokale-Hotspot auf dem Schreibtisch (SHELF_POS) nutzt weiter
 * das große Popup — das ist bewusst unverändert, hat nichts mit dem Monitor
 * zu tun.
 */
export function MonitorScreenContent({ data: initialData }: { data: MancaveData }) {
  // Lokaler State statt direkt `initialData`: Upgrade/Job-Aktionen (siehe
  // ItemsPanel/JobsPanel unten) patchen hier rein, damit sich Münzstand/
  // Ausbau-Stufen sofort im System-Tray und im jeweils offenen Panel zeigen
  // — OHNE die ganze Seite/3D-Szene neu zu laden. Läuft der Screen im
  // isolierten <Html>-React-Baum (siehe Kommentar weiter unten), gibt es
  // dafür ohnehin keinen Router — ein `router.refresh()` hätte hier vorher
  // nur per Fallback auf `window.location.reload()` funktioniert.
  const [data, setData] = useState(initialData);
  // React-empfohlenes Muster "State beim Prop-Wechsel anpassen" (react.dev)
  // statt useEffect: läuft während des Renders, kein zusätzlicher Zyklus/
  // Cascading-Render-Risiko. `initialData` ändert sich für eine gemountete
  // Instanz zwar kaum noch (kein router.refresh()/reload mehr in diesem
  // Feature), aber andere, unabhängige Refreshes derselben Seite (z.B.
  // Profil-Bio bearbeiten) liefern trotzdem ein frisches Server-Objekt.
  const [prevInitialData, setPrevInitialData] = useState(initialData);
  if (initialData !== prevInitialData) {
    setPrevInitialData(initialData);
    setData(initialData);
  }
  const [view, setView] = useState<MancavePanel>(null);
  const notifs = notificationCount(data);

  if (view) {
    return (
      <div className="relative w-full h-full flex flex-col select-none" style={{ background: "#05100d" }}>
        <div className="shrink-0 flex items-center gap-2.5 px-4" style={{ height: 44, background: "rgba(8,16,15,0.9)", borderBottom: "1px solid rgba(45,212,191,0.15)" }}>
          <button onClick={() => setView(null)} aria-label="Zurück zum Desktop"
            className="flex items-center justify-center rounded-md hover:bg-white/10 transition-colors" style={{ width: 30, height: 30 }}>
            <ArrowLeft className="text-teal-300" style={{ width: 20, height: 20 }} />
          </button>
          <span className="text-teal-200 font-semibold" style={{ fontSize: 19 }}>{PANEL_TITLES[view]}</span>
        </div>
        {/* Panel-Inhalte in eigener Schriftgröße (für das große Popup vom
            Schreibtisch-Hotspot ausgelegt, text-xs/text-[10-11px]) — auf dem
            640px-Monitor-Canvas ist das gut lesbar, kein zusätzliches Skalieren
            nötig (das hatte den Text vorher nur noch kleiner gemacht).
            Mausrad manuell auf scrollTop gemappt statt auf natives Scrollen zu
            vertrauen — die Fläche liegt in einem <Html transform>-Overlay (3D-
            verankert, eigener isolierter React-Baum ohne Router-Context —
            siehe `<Html>`-Kommentar ganz oben in dieser Datei), nativer
            Wheel-Scroll wirkte dort unzuverlässig (User-Feedback: musste den
            winzigen Scrollbalken per Hand ziehen, gerade bei der langen
            Ausbau-Liste).
            stopPropagation, damit das Rad-Event nicht zusätzlich beim Kamera-
            Zoom (LookAroundRig, hängt am <canvas>) landet — auch wenn Canvas
            und dieses Overlay ohnehin getrennte DOM-Zweige sind, schadet die
            Absicherung nicht. */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5" style={{ fontSize: 15 }}
          onWheel={e => { e.currentTarget.scrollTop += e.deltaY; e.stopPropagation(); }}>
          {view === "trophy" && <TrophyPanel data={data} />}
          {view === "items" && <ItemsPanel data={data} onDataChange={setData} />}
          {view === "mail" && <MailPanel data={data} onOpenPanel={setView} />}
          {view === "wanderpokale-kategorie" && <WanderpokalePanel data={data} scopeType="category" />}
          {view === "wanderpokale-genre" && <WanderpokalePanel data={data} scopeType="genre" />}
          {view === "eventpokale" && <EventPokalePanel data={data} />}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden select-none" style={{ background: "#05100d" }}>
      {/* Wallpaper: OMA-Logo als blasses, zentriertes Wasserzeichen */}
      <div className="absolute inset-0" style={{
        backgroundImage: "url(/OMALogoNew.png)", backgroundRepeat: "no-repeat",
        backgroundPosition: "center", backgroundSize: "62%", opacity: 0.1,
      }} />
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 40%, rgba(13,59,54,0.35), rgba(3,8,7,0.85) 75%)" }} />

      {/* System-Tray oben rechts: Rang + Münzen, wie eine echte OS-Menüleiste */}
      <div className="absolute top-0 inset-x-0 flex items-center justify-end gap-5 px-6" style={{ height: 46 }}>
        <span className={`font-bold leading-none ${data.rankColor}`} style={{ fontSize: 21 }}>
          {data.rankLabel} <span className="text-teal-300/60 font-normal">#{data.leaderboardRank}</span>
        </span>
        <span className="flex items-center gap-1.5 text-amber-300 font-semibold tabular-nums leading-none" style={{ fontSize: 21 }}>
          <CoinIcon size={21} />{data.totalPoints.toLocaleString("de-DE")}
        </span>
      </div>
      <div className="absolute top-[46px] inset-x-0 h-px" style={{ background: "rgba(45,212,191,0.15)" }} />

      {/* Rang-Fortschritt, dezent wie ein Desktop-Widget in der Ecke */}
      <div className="absolute left-6 bottom-[96px] w-[230px]">
        <div className="h-2 rounded-full overflow-hidden bg-white/10">
          <div className="h-full rounded-full" style={{ width: `${data.rankPct}%`, background: "linear-gradient(90deg,#14b8a6,#2dd4bf)" }} />
        </div>
      </div>

      {/* Taskbar/Dock unten — jedes Icon öffnet sein Panel direkt auf dem Monitor */}
      <div className="absolute left-0 right-0 bottom-4 flex items-center justify-center gap-3">
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl"
          style={{ background: "rgba(8,16,15,0.65)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(2px)" }}>
          <DockIcon icon={<BarChart3 />} onClick={() => setView("trophy")} />
          <DockIcon icon={<Wrench />} onClick={() => setView("items")} />
          <DockIcon icon={<Mail />} badge={notifs} onClick={() => setView("mail")} />
        </div>
      </div>
    </div>
  );
}

function DockIcon({ icon, badge, onClick }: { icon: React.ReactNode; badge?: number; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="relative flex items-center justify-center rounded-md transition-colors hover:brightness-125"
      style={{ width: 50, height: 50, background: "rgba(45,212,191,0.12)", border: "1px solid rgba(45,212,191,0.3)" }}>
      <span className="text-teal-300" style={{ width: 27, height: 27 }}>{icon}</span>
      {!!badge && badge > 0 && (
        <span className="absolute -top-2 -right-2 flex items-center justify-center rounded-full bg-rose-500 text-white font-bold leading-none"
          style={{ width: 21, height: 21, fontSize: 14 }}>
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}

/**
 * "Postfach": zeigt gerade AKTUELL zutreffende Hinweise (bezahlbare
 * Upgrades) — bewusst kein persistenter Gelesen/Ungelesen-Zustand (keine
 * neue DB-Tabelle dafür), sondern live aus den ohnehin geladenen Daten
 * berechnet. Klick auf einen Eintrag springt direkt ins passende Panel.
 */
export function MailPanel({ data, onOpenPanel }: { data: MancaveData; onOpenPanel: (p: MancavePanel) => void }) {
  const affordable = data.items.filter(i => i.nextCost !== null && i.nextCost <= data.totalPoints);

  const empty = affordable.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Mail className="w-4 h-4 text-teal-400" />
        <h3 className="text-sm font-semibold text-white">Postfach</h3>
      </div>
      {empty && (
        <p className="text-xs text-gray-600">Keine neuen Nachrichten — schau später wieder vorbei.</p>
      )}
      {affordable.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest flex items-center gap-1">
            <CoinIcon size={11} /> Genug Münzen für ein Upgrade
          </p>
          {affordable.map(i => (
            <button key={i.key} onClick={() => onOpenPanel("items")}
              className="w-full flex items-center gap-2.5 text-left px-2.5 py-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.05] transition-colors">
              <ArrowUpCircle className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-200 truncate">
                  {i.tier === 0 ? `${i.label} freischalten` : `${i.label} auf Stufe ${i.tier + 1}`}
                </p>
                <p className="text-[10px] text-gray-500">
                  {i.nextCost === 0 ? "Kostenlos (Testphase)" : `${i.nextCost!.toLocaleString("de-DE")} Münzen`}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function TrophyPanel({ data }: { data: MancaveData }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Trophy className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-white">Pokale &amp; Abzeichen</h3>
      </div>
      {data.pokale.length > 0 ? (
        <div className="space-y-1.5">
          {data.pokale.slice(0, 6).map(p => (
            <div key={p.id} className="flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg bg-white/[0.03]">
              <Trophy className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="text-gray-300 truncate">{p.title}</span>
            </div>
          ))}
        </div>
      ) : <p className="text-xs text-gray-600">Noch keine Pokale gewonnen.</p>}
      {data.badges.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {data.badges.map(b => (
            <span key={b.key} title={`${b.name} — ${b.desc}`}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-base bg-white/[0.04] border border-white/[0.06]">
              {b.icon}
            </span>
          ))}
        </div>
      )}
      <div className="pt-2 border-t border-white/[0.06] space-y-2">
        <p className="text-[10px] text-gray-500 uppercase tracking-widest flex items-center gap-1"><Package className="w-3 h-3" /> Aktivität & Spiele</p>
        <div className="grid grid-cols-2 gap-2">
          <StatTile icon={<CalendarDays className="w-3.5 h-3.5" />} label="Events" value={data.eventCount} color="text-emerald-400" />
          <StatTile icon={<Medal className="w-3.5 h-3.5" />} label="Event-Siege" value={data.eventWins} color="text-amber-400" />
          <StatTile icon={<Swords className="w-3.5 h-3.5" />} label="Poll-Master" value={data.pollMasterCount} color="text-purple-400" />
          <StatTile icon={<Clock className="w-3.5 h-3.5" />} label="Voice-Std." value={`${data.voiceHours}h`} color="text-teal-400" />
          <StatTile icon={<MessageSquare className="w-3.5 h-3.5" />} label="Nachrichten" value={data.messageCount} color="text-blue-400" />
        </div>
        {data.topGames.length > 0 && (
          <p className="text-xs text-gray-300 flex items-center gap-1.5"><Gamepad2 className="w-3.5 h-3.5 text-blue-400 shrink-0" /> {data.topGames.slice(0, 3).join(" · ")}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Detail-Panel fürs Wanderpokal-Regal (3D-Hotspot direkt am Möbel, siehe
 * WANDERPOKAL_REGAL_CFG in MancaveScene3D.tsx) — zeigt ALLE 12 Scopes, nicht
 * nur die eigenen: eigene Pokale hervorgehoben, fremde mit aktuellem Halter
 * + Siegen (oder "noch nie vergeben"), damit man sieht, wen man als
 * nächstes ablösen könnte.
 */
const WANDERPOKAL_SCOPE_LABEL: Record<"category" | "genre", string> = {
  category: "Kategorie-Wanderpokale", genre: "Genre-Wanderpokale",
};

// Vorschaubilder derselben 3D-Assets, die auch im Regal stehen (siehe
// WANDERPOKAL_MODELS in MancaveScene3D.tsx) — 6 eigene, die übrigen 6
// Scopes (shooter + die 5 abstrakten Kategorien) teilen sich weiterhin den
// generischen Gold-Pokal, bis es dafür passende Assets gibt.
export const WANDERPOKAL_THUMBS: Record<string, string> = {
  racing: "/mancave-trophies/wanderpokal_rennlegende.png",
  community: "/mancave-trophies/wanderpokal_communitystar.png",
  arcade: "/mancave-trophies/wanderpokal_arcade.png",
  sport: "/mancave-trophies/wanderpokal_sport.png",
  beat_em_up: "/mancave-trophies/wanderpokal_beat_em_up.png",
  special: "/mancave-trophies/wanderpokal_special.png",
};
export const WANDERPOKAL_THUMB_DEFAULT = "/mancave-trophies/wanderpokal_generic.png";

/**
 * Zeigt nur die 6 Scopes EINES Typs (Kategorie ODER Genre) — je nachdem,
 * welches der beiden Kreuz-Regale angeklickt wurde (User-Wunsch: getrennte
 * Panels statt einer gemeinsamen 12er-Liste). Für Scopes, die ein ANDERER
 * User hält: dessen Profilbild samt Rang-Rahmen + Siege, klickbar zum
 * Profil. Zusätzlich immer die eigene Siegzahl im selben Scope zum
 * Vergleich (`myWinCount`, aus `WanderpocalStat` — unabhängig davon, ob man
 * je Halter war).
 */
export function WanderpokalePanel({ data, scopeType }: { data: MancaveData; scopeType: "category" | "genre" }) {
  const rows = data.wanderpokalStatus.filter(s => s.scopeType === scopeType);
  const ownedCount = rows.filter(s => s.ownedByMe).length;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Trophy className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-white">{WANDERPOKAL_SCOPE_LABEL[scopeType]}</h3>
      </div>
      <p className="text-[11px] text-gray-500">
        {ownedCount > 0
          ? `Du hältst gerade ${ownedCount} von 6.`
          : "Du hältst aktuell keinen davon — bei jedem Sieg kann sich das ändern."}
      </p>
      <div className="space-y-1.5">
        {rows.map(s => {
          const winLabel = (n: number) => `${n} ${n === 1 ? "Sieg" : "Siege"}`;
          return (
            <div key={`${s.scopeType}:${s.scopeValue}`}
              className={cn(
                "flex items-center justify-between gap-2 text-xs px-2.5 py-2 rounded-lg",
                s.ownedByMe ? "bg-amber-400/10 border border-amber-400/30" : "bg-white/[0.03]",
              )}>
              {/* 1) Pokal-Asset (dasselbe Modell, das auch im Regal steht) + Name */}
              <div className="flex items-center gap-2 min-w-0">
                <Image src={WANDERPOKAL_THUMBS[s.scopeValue] ?? WANDERPOKAL_THUMB_DEFAULT} alt="" width={36} height={36}
                  className="w-9 h-9 object-contain shrink-0" unoptimized />
                <span className={cn("truncate", s.ownedByMe ? "text-amber-200 font-semibold" : "text-gray-300")}>{s.title}</span>
              </div>
              {/* 2) Profilbild inkl. Rangrahmen des aktuellen Besitzers (auch bei sich
                  selbst) + dessen Siegzahl, darunter der eigene Vergleichswert. */}
              <div className="text-right shrink-0">
                {s.ownedByMe ? (
                  <div className="flex items-center justify-end gap-1.5">
                    <RankedAvatar rankPoints={data.rankPoints} src={data.avatarUrl} alt="Du" size={22} rounded="full" />
                    <span className="text-[10px] text-amber-300/80">Du · {winLabel(s.winCount ?? 0)}</span>
                  </div>
                ) : s.holderUserId ? (
                  <a href={`/profile/${s.holderUserId}`} className="flex items-center justify-end gap-1.5 hover:underline">
                    <RankedAvatar rankPoints={s.holderRankPoints ?? 0} src={s.holderAvatarUrl} alt={s.holderName ?? "Halter"} size={22} rounded="full" />
                    <span className="text-[10px] text-gray-400">{s.holderName} · {winLabel(s.winCount ?? 0)}</span>
                  </a>
                ) : (
                  <span className="text-[10px] text-gray-500">noch nie vergeben</span>
                )}
                {!s.ownedByMe && (
                  <div className="text-[9px] text-gray-600 mt-0.5">Du: {winLabel(s.myWinCount)}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Detail-Panel fürs Event-Pokal-Regal — listet JEDEN einzelnen Pokal
 * (nicht nur die ersten 3, die auf dem Regal stehen) mit Datum + Kategorie
 * und einem Link zur jeweiligen Event-/Serienseite.
 */
export function EventPokalePanel({ data }: { data: MancaveData }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Medal className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-white">Event-Pokale</h3>
      </div>
      {data.pokale.length > 0 ? (
        <div className="space-y-1.5">
          {data.pokale.map(p => {
            const cat = CATEGORY_CONFIG[p.category];
            const href = p.seriesId ? `/events/series/${p.seriesId}` : p.eventId ? `/tournament/${p.eventId}` : null;
            const date = new Date(p.awardedAt).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
            return (
              <div key={p.id} className="flex items-center justify-between gap-2 text-xs px-2.5 py-2 rounded-lg bg-white/[0.03]">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="shrink-0">{cat?.emoji ?? "🏆"}</span>
                  <div className="min-w-0">
                    <p className="text-gray-300 truncate">{p.title}{p.isSeries && <span className="text-gray-500"> (Serie)</span>}</p>
                    <p className="text-[10px] text-gray-500">{cat?.title ?? p.category} · {date}</p>
                  </div>
                </div>
                {href && (
                  <a href={href} className="shrink-0 text-[10px] text-teal-300 hover:text-teal-200 underline underline-offset-2">
                    Zum Event
                  </a>
                )}
              </div>
            );
          })}
        </div>
      ) : <p className="text-xs text-gray-600">Noch keine Event-Pokale gewonnen.</p>}
    </div>
  );
}

/**
 * Ausbau-Panel des neuen Mancave-Systems (siehe mancave-items.ts,
 * mancave-economy.ts) — Phase 1: nur Wirtschaft/Buttons, die Szene selbst
 * sieht optisch noch gleich aus, bis es Blender-Stufenvarianten gibt.
 * Boden/Wand/Fenster tauchen hier bewusst NICHT als eigene Kaufzeile auf —
 * ihre Stufe steigt automatisch mit (Durchschnitt aller Objekt-Stufen).
 */
export function ItemsPanel({ data, onDataChange }: { data: MancaveData; onDataChange: Dispatch<SetStateAction<MancaveData>> }) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(url: string, itemKey: string, fallbackError: string) {
    setPending(itemKey);
    setError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemKey }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? fallbackError);
        return;
      }
      // Kein Reload mehr nötig: der aktualisierte Ausbau-Ausschnitt (Stufen,
      // Boden/Wand-Stufe, Münzstand) kommt leichtgewichtig per GET zurück
      // (siehe /api/mancave/items) und wird direkt in den von
      // MonitorScreenContent gehaltenen State gemergt — die 3D-Szene selbst
      // bleibt dabei komplett unangetastet.
      const summary = await fetch("/api/mancave/items").then(r => r.json()).catch(() => null);
      if (summary && !("error" in summary)) onDataChange(prev => ({ ...prev, ...summary }));
    } catch {
      setError("Verbindung fehlgeschlagen");
    } finally {
      setPending(null);
    }
  }

  const upgrade   = (itemKey: string) => run("/api/mancave/upgrade", itemKey, "Konnte nicht aufgerüstet werden");
  const downgrade = (itemKey: string) => run("/api/mancave/downgrade", itemKey, "Konnte nicht zurückgestuft werden");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pr-8">
        <Wrench className="w-4 h-4 text-teal-400" />
        <h3 className="text-sm font-semibold text-white">Ausbau</h3>
      </div>
      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
        style={{ background: "rgba(45,212,191,0.08)", border: "1px solid rgba(45,212,191,0.22)" }}>
        <Home className="w-3.5 h-3.5 text-teal-300 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-teal-200">Boden/Wand/Fenster</span>
            <span className="text-[10px] font-bold text-teal-300 tabular-nums">Stufe {data.surfaceTier}/4</span>
          </div>
          <div className="mt-1 h-[3px] rounded-full overflow-hidden bg-white/10">
            <div className="h-full rounded-full transition-all"
              style={{ width: `${(data.surfaceTier / 4) * 100}%`, background: "linear-gradient(90deg,#14b8a6,#2dd4bf)" }} />
          </div>
        </div>
      </div>
      {data.devFreeMode && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] text-amber-200"
          style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}>
          <FlaskConical className="w-3 h-3 shrink-0" />
          Admin-Testmodus: Upgrades sind für dich kostenlos, Rückstufen ist möglich.
        </div>
      )}
      {error && <p className="text-[11px] text-rose-400">{error}</p>}
      <div className="space-y-1.5">
        {data.items.map(item => {
          const minTier = item.baseline ? 1 : 0;
          const canDowngrade = data.devFreeMode && item.tier > minTier;
          return (
          <div key={item.key} className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-white/[0.03]">
            <div className="min-w-0 flex items-center gap-2">
              {item.tier === 0 ? <Lock className="w-3.5 h-3.5 text-gray-500 shrink-0" /> : <ArrowUpCircle className="w-3.5 h-3.5 text-teal-400 shrink-0" />}
              <div className="min-w-0">
                <p className="text-xs text-gray-200 truncate">{item.label}</p>
                <p className="text-[10px] text-gray-500">{item.tier === 0 ? "Nicht freigeschaltet" : `Stufe ${item.tier}/${item.maxTier}`}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {canDowngrade && (
                <button
                  onClick={() => downgrade(item.key)}
                  disabled={pending === item.key}
                  aria-label={`${item.label} zurückstufen`}
                  className="flex items-center justify-center w-6 h-6 rounded-full disabled:opacity-50"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#9ca3af" }}
                >
                  <ArrowDownCircle className="w-3.5 h-3.5" />
                </button>
              )}
              {item.nextCost === null ? (
                <span className="text-[10px] text-amber-300/80 whitespace-nowrap">Max</span>
              ) : (
                <button
                  onClick={() => upgrade(item.key)}
                  disabled={pending === item.key}
                  className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap disabled:opacity-50"
                  style={{ background: "rgba(45,212,191,0.12)", border: "1px solid rgba(45,212,191,0.3)", color: "#5eead4" }}
                >
                  {item.nextCost === 0 ? null : <CoinIcon size={10} />}
                  {pending === item.key ? "…" : item.nextCost === 0 ? "Gratis" : item.nextCost.toLocaleString("de-DE")}
                  {item.tier === 0 && " · Freischalten"}
                </button>
              )}
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}

function StatTile({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white/[0.03]">
      <span className={color}>{icon}</span>
      <div className="min-w-0">
        <p className="text-sm font-bold text-white tabular-nums leading-none">{value}</p>
        <p className="text-[10px] text-gray-500 mt-0.5 truncate">{label}</p>
      </div>
    </div>
  );
}
