"use client";

import { useEffect, useRef, useState } from "react";
import { BRAND_LOGO } from "@/lib/brand";
import RankedAvatar from "@/components/RankedAvatar";
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from "lucide-react";

type OverlayEntry = {
  id: string;
  userId: string | null;
  teamId: string | null;
  placement: number | null;
  score: number | null;
  statsJson: string | null;
};

type OverlayMatch = {
  id: string;
  round: number;
  position: number;
  title: string | null;
  player1Id: string | null;
  player2Id: string | null;
  winnerId: string | null;
  score1: number | null;
  score2: number | null;
  playedAt: string | null;
  entries: OverlayEntry[];
};

type OverlayUser = { id: string; name: string | null; username: string | null; image: string | null; rankPoints: number };
type OverlayParticipant = { userId: string; user: OverlayUser };

/** In diesem Projekt hält `name` die rohe (meist kleingeschriebene) Discord-Login-Kennung,
 *  `username` den vom User selbst gepflegten Anzeigenamen mit korrekter Groß-/Kleinschreibung —
 *  daher hier wie im Rest der App `username` zuerst. */
function displayName(u: OverlayUser | undefined | null): string {
  return u?.username ?? u?.name ?? "Unbekannt";
}

type OverlayState = {
  id: string;
  title: string;
  status: string;
  format: string | null;
  tournamentStatus: string | null;
  game: string | null;
  statFields: string | null;
  matches: OverlayMatch[];
  participants: OverlayParticipant[];
};

type PanelKey = "bracket" | "table" | "participants";
export type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right" | "middle-left" | "middle-right";

/** Frei platzierbare Overlay-Elemente — jedes lässt sich in den Overlay-Einstellungen einzeln
 *  per Drag & Drop positionieren. */
export type ElementKey = "brand" | "ticker" | "panel";
export type LayoutPositions = Partial<Record<ElementKey, { x: number; y: number }>>; // Prozent von 1920×1080, oben links des Elements

/** Nominelle Kachelgrößen (px bei 1920×1080) — für die Kollisionsvermeidung beim Ziehen in
 *  den Einstellungen. Etwas großzügiger als die tatsächliche Mindestgröße bemessen (Ticker/
 *  Panel-Breite variiert mit Inhalt), damit sich Elemente auch bei mehr Inhalt nie berühren. */
export const ELEMENT_SIZE: Record<ElementKey, { width: number; height: number }> = {
  brand: { width: 300, height: 78 },
  ticker: { width: 620, height: 78 },
  panel: { width: 620, height: 360 },
};

const PANEL_FADE_MS = 900;
const EDGE_MARGIN = 28;    // Abstand aller Kacheln zum Bildschirmrand
const TICKER_BOTTOM = 48;  // Abstand des Lower-Thirds zum unteren Rand
const TICKER_CLEARANCE = 166; // Höhe des Lower-Thirds + Abstand — Panels in unteren Ecken schieben sich darüber
const PANEL_WIDTH = 620;
const PANEL_WIDTH_COMPACT = 460; // Tabelle/Teilnehmer wirken bei voller Panel-Breite unnötig groß
const PANEL_LIST_HEIGHT = 300; // Feste Höhe für Listen in Panels — lange Listen scrollen intern statt die Kachel wachsen zu lassen
const PANEL_LIST_HEIGHT_COMPACT = 250;
const TICKER_ENTRIES_WIDTH = 620; // Feste Breite für die FFA-Mitspielerliste im Match-Ticker

/** Absolute Positionierung für eine Ecke — Panels in den unteren Ecken rücken über den
 *  Ticker, damit sie ihn nicht überlappen. Welche Ecke beim jeweiligen Spiel HUD-frei ist,
 *  kann die Browser-Source nicht selbst erkennen (sie sieht das Gameplay-Bild nicht) —
 *  das legt der Streamer in den Overlay-Einstellungen einmalig fest.               */
function cornerStyle(corner: Corner): React.CSSProperties {
  const base: React.CSSProperties = { position: "absolute" };
  switch (corner) {
    case "top-left":     return { ...base, top: EDGE_MARGIN, left: EDGE_MARGIN };
    case "top-right":    return { ...base, top: EDGE_MARGIN, right: EDGE_MARGIN };
    case "bottom-left":  return { ...base, bottom: TICKER_CLEARANCE, left: EDGE_MARGIN };
    case "bottom-right": return { ...base, bottom: TICKER_CLEARANCE, right: EDGE_MARGIN };
    case "middle-left":  return { ...base, top: "50%", left: EDGE_MARGIN };
    case "middle-right": return { ...base, top: "50%", right: EDGE_MARGIN };
  }
}

/** Absolute Positionierung aus einer frei gezogenen Layout-Koordinate (Prozent von 1920×1080).
 *  Fehlt die Koordinate (Element aktiviert, aber noch nie positioniert), fällt es auf die
 *  Standard-Ecke oben rechts zurück statt unsichtbar zu bleiben. */
function elementPositionStyle(pos: { x: number; y: number } | undefined): React.CSSProperties {
  if (!pos) return { position: "absolute", top: EDGE_MARGIN, right: EDGE_MARGIN };
  return { position: "absolute", left: `${pos.x}%`, top: `${pos.y}%` };
}

/** Opacity/Blur/Versatz für eine Rotations-Phase, kombiniert mit der Basis-Zentrierung der
 *  Ecke (nur bei "middle-*" nötig — darf vom Versatz nicht überschrieben werden, siehe
 *  cornerStyle). "enter" kommt leicht aus Richtung Bildschirmmitte verschwommen herein,
 *  "leave" wandert in dieselbe Richtung weiter und verschwimmt wieder — zusammen eine klare
 *  Bewegungsrichtung statt eines reinen Stand-Fades. */
function panelMotionStyle(corner: Corner, phase: PanelPhase): React.CSSProperties {
  const centerY = corner.startsWith("middle") ? "translateY(-50%)" : "";
  if (phase === "settled") {
    return { opacity: 1, filter: "blur(0px)", transform: `${centerY} translateY(0) scale(1)`.trim() };
  }
  const towardEdge = corner.startsWith("bottom") ? 40 : -40;
  const offset = phase === "enter" ? -towardEdge : towardEdge;
  return { opacity: 0, filter: "blur(16px)", transform: `${centerY} translateY(${offset}px) scale(0.9)`.trim() };
}

/** Einmal eingebettete Keyframes für alle Bewegungs-Akzente im Overlay: Live-Puls, Score-Pop
 *  bei Änderung, Sieger-Glow, Kachel-Entrance bei neuem Match, sanftes Atmen der Ränder. */
function MotionStyles() {
  return (
    <style>{`
      @keyframes oma-pulse    { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
      @keyframes oma-pop      { 0% { transform: scale(0.6); opacity: 0; } 65% { transform: scale(1.18); } 100% { transform: scale(1); opacity: 1; } }
      @keyframes oma-flare    { 0% { box-shadow: 0 0 0 0 rgba(45,212,191,0); } 25% { box-shadow: 0 0 28px 6px rgba(45,212,191,0.55); } 100% { box-shadow: 0 0 0 0 rgba(45,212,191,0); } }
      @keyframes oma-slidein  { from { opacity: 0; transform: translateY(10px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
      @keyframes oma-breathe  { 0%,100% { opacity: 0.55; } 50% { opacity: 1; } }
      @keyframes oma-live-ring { 0% { transform: scale(1); opacity: 0.75; } 100% { transform: scale(2.8); opacity: 0; } }
      .oma-anim-pop     { animation: oma-pop 420ms cubic-bezier(0.16,1,0.3,1) both; }
      .oma-anim-flare   { animation: oma-flare 1100ms ease-out; }
      .oma-anim-slidein { animation: oma-slidein 480ms cubic-bezier(0.16,1,0.3,1) both; }
      .oma-anim-breathe { animation: oma-breathe 3.2s ease-in-out infinite; }
      .oma-live-ring    { animation: oma-live-ring 1.3s cubic-bezier(0,0,0.2,1) infinite; }
      @media (prefers-reduced-motion: reduce) {
        .oma-anim-pop, .oma-anim-flare, .oma-anim-slidein, .oma-anim-breathe, .oma-live-ring { animation: none !important; }
      }
    `}</style>
  );
}

const SCROLL_PAUSE_MS = 5200;
const SCROLL_TRANSITION_MS = 1600;
const SCROLL_HIGHLIGHT_MS = SCROLL_TRANSITION_MS + 250; // wie lange die aktive Pfeilrichtung aufleuchtet
const ARROW_STRIP = 22; // reservierter Streifen je Kante — Pfeile liegen hier, nie über dem Inhalt

/** Auto-Scroll für Inhalte, die nicht in eine feste Kachelgröße passen (lange Teilnehmer-
 *  /Ranking-Listen, viele FFA-Mitspieler im Ticker) — statt die Kachel selbst wachsen zu
 *  lassen: zeigt einen Ausschnitt, pausiert, scrollt eine "Seite" weiter, pausiert wieder;
 *  am Ende springt (scrollt) es in einer Bewegung zurück an den Anfang und der Zyklus beginnt
 *  von vorn. Die Content-Größe wird per ResizeObserver gemessen, da Turnierdaten sich laufend
 *  ändern (neue Matches, mehr Teilnehmer). Ein schmaler Streifen an beiden Kanten (außerhalb
 *  des eigentlichen Inhalts) trägt zwei dauerhaft sichtbare Pfeile — die aktive Richtung leuchtet
 *  beim Scrollen kurz auf, überlappt dabei aber nie die Liste selbst. */
function AutoScrollViewport({
  axis, size, gap = 0, children,
}: { axis: "x" | "y"; size: number; gap?: number; children: React.ReactNode }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);
  const [steps, setSteps] = useState<number[]>([0]);
  const [stepIndex, setStepIndex] = useState(0);
  const [highlight, setHighlight] = useState<"forward" | "backward" | null>(null);

  const contentSize = size - ARROW_STRIP * 2;

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const measure = () => {
      const trackSize = axis === "x" ? track.scrollWidth : track.scrollHeight;
      const max = Math.max(0, trackSize - contentSize);
      if (max <= 0) {
        setSteps([0]);
        setStepIndex(0);
        return;
      }
      const list: number[] = [];
      for (let o = 0; o < max; o += contentSize) list.push(o);
      list.push(max);
      setSteps(list);
      setStepIndex(0);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    return () => ro.disconnect();
  }, [axis, contentSize]);

  useEffect(() => {
    if (steps.length <= 1) return;
    const t = setInterval(() => setStepIndex(i => (i + 1) % steps.length), SCROLL_PAUSE_MS);
    return () => clearInterval(t);
  }, [steps.length]);

  // Highlight blitzt kurz während der Bewegung auf, die Pfeile selbst stehen dauerhaft —
  // nicht beim allerersten Render aufblitzen (kein Sprung direkt beim Laden).
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    setHighlight(stepIndex === 0 ? "backward" : "forward");
    const t = setTimeout(() => setHighlight(null), SCROLL_HIGHLIGHT_MS);
    return () => clearTimeout(t);
  }, [stepIndex]);

  const scrollable = steps.length > 1;
  const offset = steps[stepIndex] ?? 0;
  const translate = axis === "x" ? `translateX(-${offset}px)` : `translateY(-${offset}px)`;

  const outerStyle: React.CSSProperties = axis === "x"
    ? { display: "flex", alignItems: "center", width: size }
    : { display: "flex", flexDirection: "column", height: size };
  const viewportStyle: React.CSSProperties = axis === "x"
    ? { overflow: "hidden", width: contentSize, flexShrink: 0 }
    : { overflow: "hidden", height: contentSize, flexShrink: 0 };

  return (
    <div style={outerStyle}>
      {scrollable && <ScrollArrow axis={axis} direction="backward" active={highlight === "backward"} />}
      <div style={viewportStyle}>
        <div
          ref={trackRef}
          style={{
            display: axis === "x" ? "inline-flex" : "flex",
            flexDirection: axis === "x" ? "row" : "column",
            gap,
            transform: translate,
            transition: `transform ${SCROLL_TRANSITION_MS}ms cubic-bezier(0.16,1,0.3,1)`,
          }}
        >
          {children}
        </div>
      </div>
      {scrollable && <ScrollArrow axis={axis} direction="forward" active={highlight === "forward"} />}
    </div>
  );
}

/** Dauerhaft sichtbarer Richtungspfeil im reservierten Rand-Streifen — dezent, solange nicht
 *  gerade in diese Richtung gescrollt wird, hell und leicht vergrößert währenddessen. */
function ScrollArrow({ axis, direction, active }: { axis: "x" | "y"; direction: "forward" | "backward"; active: boolean }) {
  const Icon = axis === "x"
    ? (direction === "forward" ? ChevronRight : ChevronLeft)
    : (direction === "forward" ? ChevronDown : ChevronUp);

  return (
    <div
      style={{
        flexShrink: 0,
        width: axis === "x" ? ARROW_STRIP : "100%",
        height: axis === "y" ? ARROW_STRIP : "100%",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "opacity 300ms ease, transform 300ms ease",
        opacity: active ? 1 : 0.4,
        transform: active ? "scale(1.15)" : "scale(1)",
      }}
    >
      <Icon
        size={14}
        color="#5eead4"
        style={{ filter: active ? "drop-shadow(0 0 5px rgba(45,212,191,0.75))" : "none" }}
      />
    </div>
  );
}

export default function OverlayClient({
  eventId,
  token,
  eventTitle,
  format,
  requestedPanels,
  rotateSeconds,
  corner,
  showTicker,
  showBrand,
  layout,
}: {
  eventId: string;
  token: string;
  eventTitle: string;
  format: string | null;
  requestedPanels: PanelKey[] | null;
  rotateSeconds: number;
  corner: Corner;
  showTicker: boolean;
  showBrand: boolean;
  /** Frei per Drag & Drop platzierte Positionen aus den Overlay-Einstellungen (Prozent von
   *  1920×1080, oben links des Elements). Fehlt ein Eintrag oder ist `layout` ganz null,
   *  greift die alte gruppierte/Ecken-basierte Standardplatzierung — bestehende Links bleiben
   *  dadurch gültig. */
  layout: LayoutPositions | null;
}) {
  const [state, setState] = useState<OverlayState | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let cancelled = false;

    function connect() {
      if (cancelled) return;
      const es = new EventSource(`/api/overlay/${eventId}/stream?token=${encodeURIComponent(token)}`);
      esRef.current = es;
      es.addEventListener("update", (e) => {
        try { setState(JSON.parse((e as MessageEvent).data)); } catch { /* ignore */ }
      });
      es.onerror = () => {
        es.close();
        if (!cancelled) setTimeout(connect, 1500);
      };
    }

    connect();
    return () => {
      cancelled = true;
      esRef.current?.close();
    };
  }, [eventId, token]);

  const userByUserId = new Map((state?.participants ?? []).map(p => [p.userId, p.user]));
  const userOf = (userId: string | null): OverlayUser | undefined => (userId ? userByUserId.get(userId) : undefined);

  const fmt = state?.format ?? format;
  const matches = state?.matches ?? [];
  const participantCount = state?.participants.length ?? 0;

  const isElimination = fmt === "single_elimination" || fmt === "double_elimination";
  const defaultPanels: PanelKey[] = isElimination ? ["bracket", "participants"] : ["table", "participants"];
  const availablePanels = (requestedPanels ?? defaultPanels).filter(key => {
    if (key === "bracket") return matches.length > 0;
    if (key === "table") return matches.length > 0 || participantCount > 0;
    if (key === "participants") return participantCount > 0;
    return false;
  });

  const rotator = usePanelRotator(availablePanels, rotateSeconds);
  const ticker = pickTickerMatch(matches);

  return (
    <div
      style={{
        position: "relative",
        width: "1920px",
        height: "1080px",
        fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)",
        color: "#fff",
        overflow: "hidden",
      }}
    >
      <MotionStyles />

      {/* Ohne eigenes `layout` bleiben Brand- und Match-Kachel wie bisher als gemeinsame Reihe
         unten links gruppiert (alte Links funktionieren unverändert). Mit `layout` bekommt
         jedes Element seine frei gezogene Position — beide Zweige rendern dieselben
         Unterkomponenten, nur der Positionierungs-Wrapper unterscheidet sich. */}
      {!layout && state && (showBrand || (showTicker && ticker)) && (
        <div style={{ position: "absolute", left: EDGE_MARGIN, bottom: TICKER_BOTTOM, display: "flex", alignItems: "center", gap: 16 }}>
          {showBrand && (
            <BrandFlipTile
              eventTitle={state.title ?? eventTitle}
              game={state.game}
              isLive={ticker ? !ticker.winnerId && !ticker.playedAt : state.status === "active"}
            />
          )}
          {showTicker && ticker && <MatchTicker match={ticker} userOf={userOf} />}
        </div>
      )}

      {layout && state && showBrand && (
        <div style={elementPositionStyle(layout.brand)}>
          <BrandFlipTile
            eventTitle={state.title ?? eventTitle}
            game={state.game}
            isLive={ticker ? !ticker.winnerId && !ticker.playedAt : state.status === "active"}
          />
        </div>
      )}
      {layout && showTicker && ticker && (
        <div style={elementPositionStyle(layout.ticker)}>
          <MatchTicker match={ticker} userOf={userOf} />
        </div>
      )}

      {state && (rotator.active || rotator.previous) && (
        <div
          style={
            layout?.panel
              ? { ...elementPositionStyle(layout.panel), width: panelWidthFor((rotator.active ?? rotator.previous)!.key) }
              : { ...cornerStyle(corner), width: panelWidthFor((rotator.active ?? rotator.previous)!.key) }
          }
        >
          {/* Alte und neue Kachel überlappen sich für PANEL_FADE_MS — die alte blendet aus/verschwimmt,
             während die neue schon einblendet, statt einer sichtbaren Lücke dazwischen. */}
          {rotator.previous && (
            <div
              style={{
                position: rotator.active ? "absolute" : "static",
                inset: 0,
                transition: `opacity ${PANEL_FADE_MS}ms cubic-bezier(0.16,1,0.3,1), transform ${PANEL_FADE_MS}ms cubic-bezier(0.16,1,0.3,1), filter ${PANEL_FADE_MS}ms cubic-bezier(0.16,1,0.3,1)`,
                ...panelMotionStyle(corner, rotator.previous.phase),
              }}
            >
              <PanelContent panelKey={rotator.previous.key} matches={matches} userOf={userOf} format={fmt} statFields={state.statFields} participants={state.participants} />
            </div>
          )}
          {rotator.active && (
            <div
              style={{
                position: rotator.previous ? "absolute" : "static",
                inset: 0,
                transition: `opacity ${PANEL_FADE_MS}ms cubic-bezier(0.16,1,0.3,1), transform ${PANEL_FADE_MS}ms cubic-bezier(0.16,1,0.3,1), filter ${PANEL_FADE_MS}ms cubic-bezier(0.16,1,0.3,1)`,
                ...panelMotionStyle(corner, rotator.active.phase),
              }}
            >
              <PanelContent panelKey={rotator.active.key} matches={matches} userOf={userOf} format={fmt} statFields={state.statFields} participants={state.participants} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function panelWidthFor(key: PanelKey): number {
  return key === "bracket" ? PANEL_WIDTH : PANEL_WIDTH_COMPACT;
}

function PanelContent({
  panelKey, matches, userOf, format, statFields, participants,
}: {
  panelKey: PanelKey;
  matches: OverlayMatch[];
  userOf: (id: string | null) => OverlayUser | undefined;
  format: string | null;
  statFields: string | null;
  participants: OverlayParticipant[];
}) {
  if (panelKey === "bracket") return <BracketPanel matches={matches} userOf={userOf} />;
  if (panelKey === "table") return <TablePanel matches={matches} participants={participants} format={format} statFields={statFields} />;
  return <ParticipantsPanel participants={participants} />;
}

type PanelPhase = "enter" | "settled" | "leave";
type PanelSlot = { key: PanelKey; phase: PanelPhase };

/** Rotation als Crossfade: die neue Kachel beginnt einzublenden, während die alte noch
 *  ausblendet ("previous") — kein Zeitpunkt, an dem beide unsichtbar sind. Beide Seiten
 *  starten aus ihrem jeweiligen Zielzustand und flippen einen Tick später (setTimeout 30ms,
 *  React braucht einen Paint dazwischen, sonst überspringt der Browser die CSS-Transition)
 *  gleichzeitig in ihre Endposition. */
function usePanelRotator(panels: PanelKey[], rotateSeconds: number) {
  const [active, setActive] = useState<PanelSlot | null>(panels.length ? { key: panels[0], phase: "settled" } : null);
  const [previous, setPrevious] = useState<PanelSlot | null>(null);

  // Panel-Liste hat sich geändert (Format erkannt / Query-Param) — Zustand während des
  // Renders zurücksetzen statt in einem Effect, siehe react.dev "Adjusting state on prop change".
  const panelsKey = panels.join("|");
  const [prevPanelsKey, setPrevPanelsKey] = useState(panelsKey);
  if (panelsKey !== prevPanelsKey) {
    setPrevPanelsKey(panelsKey);
    setActive(panels.length ? { key: panels[0], phase: "settled" } : null);
    setPrevious(null);
  }

  useEffect(() => {
    if (panels.length <= 1) return;
    const showMs = Math.max(4, rotateSeconds) * 1000;
    let flipTimer: ReturnType<typeof setTimeout>;
    let clearTimer: ReturnType<typeof setTimeout>;

    const cycle = setInterval(() => {
      setActive(curr => {
        if (curr) setPrevious({ key: curr.key, phase: "settled" });
        // Nächsten Panel-Key aus der aktuellen Position in `panels` ableiten statt aus einem
        // separaten Ref-Zähler — Refs dürfen während des Renders nicht gelesen/geschrieben
        // werden, und dieser Callback läuft ohnehin außerhalb jedes Renders.
        const currIdx = curr ? panels.indexOf(curr.key) : -1;
        const nextIdx = (currIdx + 1) % panels.length;
        return { key: panels[nextIdx], phase: "enter" };
      });

      flipTimer = setTimeout(() => {
        setPrevious(p => (p ? { ...p, phase: "leave" } : p));
        setActive(a => (a ? { ...a, phase: "settled" } : a));
      }, 30);

      clearTimer = setTimeout(() => setPrevious(null), 30 + PANEL_FADE_MS);
    }, showMs);

    return () => {
      clearInterval(cycle);
      clearTimeout(flipTimer);
      clearTimeout(clearTimer);
    };
    // `panels` bewusst nicht in den Deps: ein neuer Array-Verweis bei gleichem Inhalt (jeder
    // Render erzeugt availablePanels neu) würde die Rotation ständig neu starten. panelsKey
    // oben fängt echte Änderungen ab.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panels.length, rotateSeconds]);

  return { active, previous };
}

function pickTickerMatch(matches: OverlayMatch[]): OverlayMatch | null {
  // FFA/Coop/Avg-Stats-Matches haben nie player1Id/player2Id gesetzt (die stecken in
  // entries) — ohne den entries-Fallback hier würde ein anstehendes FFA-Match nie als
  // "pending" erkannt und der Ticker zeigt nur je das zuletzt gespielte Match.
  const pending = matches
    .filter(m => (m.player1Id || m.player2Id || m.entries.length > 0) && !m.winnerId && !m.playedAt)
    .sort((a, b) => a.round - b.round || a.position - b.position);
  if (pending.length > 0) return pending[0];
  const played = [...matches].filter(m => m.playedAt).sort((a, b) =>
    new Date(b.playedAt!).getTime() - new Date(a.playedAt!).getTime()
  );
  return played[0] ?? null;
}

const FLIP_INTERVAL_MS = 6000;
const FLIP_DURATION_MS = 1100;
const FLIP_WIDTH = 300;
const FLIP_HEIGHT = 78;

/** Flip-Card statt zweier separater Elemente: Vorderseite zeigt Live-Status/Spiel/Event,
 *  Rückseite Logo + Wortmarke — beide Infos bleiben so "immer sichtbar" (abwechselnd), ohne
 *  permanent eigenen Platz neben dem Match zu beanspruchen.
 *
 *  Wichtig: Hintergrund/Rahmen/Schatten/TopEdge sitzen jetzt auf JEDER der beiden Flächen
 *  einzeln (siehe FlipFace), nicht mehr auf einem gemeinsamen, unbeweglichen Rahmen darum —
 *  sonst dreht sich nur der Text, während die Kachel selbst optisch stillsteht. */
function BrandFlipTile({ eventTitle, game, isLive }: { eventTitle: string; game: string | null; isLive: boolean }) {
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setFlipped(f => !f), FLIP_INTERVAL_MS);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ position: "relative", width: FLIP_WIDTH, height: FLIP_HEIGHT, perspective: 500 }}>
      <div
        className="oma-flip-inner"
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          transformStyle: "preserve-3d",
          transition: `transform ${FLIP_DURATION_MS}ms cubic-bezier(0.6,0.04,0.32,0.96)`,
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        <FlipFace breathe={isLive}>
          <LiveBadge live={isLive} />
          <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {eventTitle}
            </span>
            {game && (
              <span style={{ fontSize: 12, color: "rgba(94,234,212,0.75)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {game}
              </span>
            )}
          </div>
        </FlipFace>

        <FlipFace back justify="center">
          {/* eslint-disable-next-line @next/next/no-img-element -- OBS-Browser-Source, kein Next-Image-Optimierungspfad nötig */}
          <img src={BRAND_LOGO} alt="" width={32} height={32} style={{ display: "block", filter: "drop-shadow(0 0 8px rgba(20,184,166,0.4))" }} />
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#fff" }}>
            Old Masters Ally
          </span>
        </FlipFace>
      </div>
    </div>
  );
}

/** Eine vollständige "Kachel" als Flip-Fläche — trägt ihr eigenes Chrome (Glas-Hintergrund,
 *  Rahmen, Schatten, Farbverlauf-Kante), damit beim Drehen wirklich die ganze Karte kippt und
 *  nicht nur ihr Inhalt. */
function FlipFace({
  children, back, breathe, justify = "flex-start",
}: { children: React.ReactNode; back?: boolean; breathe?: boolean; justify?: React.CSSProperties["justifyContent"] }) {
  return (
    <div
      style={{
        position: "absolute", inset: 0,
        backfaceVisibility: "hidden",
        transform: back ? "rotateY(180deg)" : undefined,
        background: "rgba(9,9,14,0.82)",
        backdropFilter: "blur(18px) saturate(1.4)",
        WebkitBackdropFilter: "blur(18px) saturate(1.4)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 14,
        boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
        padding: "0 26px",
        display: "flex",
        alignItems: "center",
        justifyContent: justify,
        gap: 14,
        overflow: "hidden",
      }}
    >
      <TopEdge radius={14} breathe={breathe} />
      {children}
    </div>
  );
}

/** Deutlich kräftigerer Live-Indikator als der vorherige einfache Opacity-Puls: ein
 *  auslaufender Leuchtring hinter einem hellen Kernpunkt. Im "Zuletzt"-Zustand ruhig. */
function LiveBadge({ live }: { live: boolean }) {
  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 14, height: 14, flexShrink: 0 }}>
      {live && (
        <span
          className="oma-live-ring"
          style={{ position: "absolute", inset: 0, borderRadius: 999, background: "#f87171" }}
        />
      )}
      <span
        style={{
          position: "relative", width: 10, height: 10, borderRadius: 999,
          background: live ? "#f87171" : "#2dd4bf",
          boxShadow: live ? "0 0 10px 2px rgba(248,113,113,0.8)" : "0 0 8px 1px rgba(45,212,191,0.6)",
        }}
      />
    </span>
  );
}

/* ── Match-Kachel des Lower-Thirds. Steht neben der BrandFlipTile (Live/Event/Spiel ↔ Logo) —
   bewusst als eigene Kachel statt einer über die volle Breite reichenden Leiste, damit
   dazwischen wieder Gameplay durchscheint. ── */
function MatchTicker({
  match, userOf,
}: { match: OverlayMatch; userOf: (id: string | null) => OverlayUser | undefined }) {
  const p1Winner = !!match.winnerId && match.winnerId === match.player1Id;
  const p2Winner = !!match.winnerId && match.winnerId === match.player2Id;
  const hasDuel = !!(match.player1Id || match.player2Id);

  return (
    <div>
      {/* key=match.id lässt die Kachel bei jedem neuen laufenden/nächsten Match einmal
         einschweben, statt kommentarlos den Inhalt zu tauschen. */}
      <TickerTile key={match.id}>
        {hasDuel ? (
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <PlayerName user={userOf(match.player1Id)} winner={p1Winner} winnerKey={match.winnerId} align="right" />
            <Score score1={match.score1} score2={match.score2} />
            <PlayerName user={userOf(match.player2Id)} winner={p2Winner} winnerKey={match.winnerId} align="left" />
          </div>
        ) : (
          // Alle Mitspieler dieser Runde, nicht nur die ersten paar — bei vielen Teilnehmern
          // (z.B. Coop-Runden mit 8+ Leuten) übernimmt AutoScrollViewport das Durchblättern,
          // statt Namen stillschweigend abzuschneiden.
          <AutoScrollViewport axis="x" size={TICKER_ENTRIES_WIDTH}>
            {[...match.entries]
              .sort((a, b) => (a.placement ?? 99) - (b.placement ?? 99))
              .map((e, i) => {
                const u = userOf(e.userId);
                const first = e.placement === 1;
                return (
                  <div
                    key={e.id}
                    style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: i === 0 ? 0 : 16, flexShrink: 0 }}
                  >
                    <RankedAvatar rankPoints={u?.rankPoints ?? 0} src={u?.image} alt={displayName(u)} size={30} />
                    <span style={{ fontSize: 16, fontWeight: first ? 700 : 500, color: first ? "#5eead4" : "#fff", whiteSpace: "nowrap" }}>
                      {displayName(u)}{e.score != null ? ` · ${e.score}` : ""}
                    </span>
                  </div>
                );
              })}
          </AutoScrollViewport>
        )}
      </TickerTile>
    </div>
  );
}

function TickerTile({
  children, breathe, bodyStyle,
}: { children: React.ReactNode; breathe?: boolean; bodyStyle?: React.CSSProperties }) {
  return (
    <div
      className="oma-anim-slidein"
      style={{
        position: "relative",
        background: "rgba(9,9,14,0.82)",
        backdropFilter: "blur(18px) saturate(1.4)",
        WebkitBackdropFilter: "blur(18px) saturate(1.4)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 14,
        boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
        padding: "18px 26px",
        display: "flex",
        alignItems: "center",
        gap: 16,
        overflow: "hidden",
        ...bodyStyle,
      }}
    >
      <TopEdge radius={14} breathe={breathe} />
      {children}
    </div>
  );
}

/** Farbverlauf-Kante Teal → Weinrot oben an jeder Kachel — als eigenes Element statt
 *  `border-top`, weil ein CSS-Border keinen Verlauf einzeln je Seite unterstützt. */
function TopEdge({ radius, breathe }: { radius: number; breathe?: boolean }) {
  return (
    <div
      className={breathe ? "oma-anim-breathe" : undefined}
      style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 2,
        background: "linear-gradient(90deg, #14b8a6 0%, #5eead4 20%, #14b8a6 45%, #7a1f3d 75%, #9f2b52 100%)",
        borderTopLeftRadius: radius, borderTopRightRadius: radius,
      }}
    />
  );
}

function PlayerName({
  user, winner, winnerKey, align,
}: { user: OverlayUser | undefined; winner: boolean; winnerKey: string | null; align: "left" | "right" }) {
  const name = displayName(user);
  const row = (
    <>
      {/* key=winnerKey lässt den Glow einmal aufflackern, sobald ein Sieger feststeht,
         statt ihn dauerhaft leuchten zu lassen. */}
      <div key={winner ? winnerKey : "pending"} className={winner ? "oma-anim-flare" : undefined} style={{ borderRadius: 999 }}>
        <RankedAvatar rankPoints={user?.rankPoints ?? 0} src={user?.image} alt={name} size={40} />
      </div>
      <span
        style={{
          fontSize: 24, fontWeight: winner ? 700 : 500,
          color: winner ? "#5eead4" : "#fff",
          textShadow: winner ? "0 0 18px rgba(45,212,191,0.5)" : "none",
        }}
      >
        {name}
      </span>
    </>
  );
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 200, flexDirection: align === "right" ? "row-reverse" : "row" }}>
      {row}
    </div>
  );
}

function Score({ score1, score2 }: { score1: number | null; score2: number | null }) {
  if (score1 == null && score2 == null) {
    return <span style={{ fontSize: 22, color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>vs</span>;
  }
  return (
    <span style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.02em", display: "flex", gap: 10 }}>
      {/* key=score* lässt die Ziffer bei jeder Änderung einmal "poppen", statt sie
         unbemerkt auszutauschen — genau das Signal, das ein Live-Score braucht. */}
      <span key={`s1-${score1}`} className="oma-anim-pop">{score1 ?? 0}</span>
      <span style={{ opacity: 0.35 }}>:</span>
      <span key={`s2-${score2}`} className="oma-anim-pop">{score2 ?? 0}</span>
    </span>
  );
}

/* ── Panel-Shell: gemeinsamer Rahmen für Bracket/Tabelle/Teilnehmer ── */
function PanelShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "relative",
        background: "rgba(9,9,14,0.86)",
        backdropFilter: "blur(20px) saturate(1.4)",
        WebkitBackdropFilter: "blur(20px) saturate(1.4)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
        padding: "15px 18px",
        overflow: "hidden",
      }}
    >
      <TopEdge radius={16} />
      {/* Wasserzeichen — füllt die Kachel, bleibt aber weit im Hintergrund (niedrige Opacity,
         z-index 0) und stört den eigentlichen Inhalt (z-index 1) nicht beim Lesen. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- OBS-Browser-Source, kein Next-Image-Optimierungspfad nötig */}
      <img
        src={BRAND_LOGO}
        alt=""
        style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          objectFit: "contain", padding: 28,
          opacity: 0.05, filter: "grayscale(1)",
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative", zIndex: 1 }}>
        <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#5eead4", margin: "0 0 9px" }}>
          {title}
        </p>
        {children}
      </div>
    </div>
  );
}

/* ── Bracket-Panel: Runden nebeneinander, kompakt für Elimination-Formate ── */
function BracketPanel({ matches, userOf }: { matches: OverlayMatch[]; userOf: (id: string | null) => OverlayUser | undefined }) {
  const rounds = [...new Set(matches.map(m => m.round))].sort((a, b) => a - b);
  return (
    <PanelShell title="Turnierbaum">
      <AutoScrollViewport axis="y" size={PANEL_LIST_HEIGHT} gap={8}>
        {rounds.map(round => (
          <div key={round} style={{ width: "100%" }}>
            <p style={{ fontSize: 11, opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 3px" }}>
              Runde {round}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {matches.filter(m => m.round === round).map(m => (
                <BracketRow key={m.id} match={m} userOf={userOf} />
              ))}
            </div>
          </div>
        ))}
      </AutoScrollViewport>
    </PanelShell>
  );
}

function BracketRow({ match, userOf }: { match: OverlayMatch; userOf: (id: string | null) => OverlayUser | undefined }) {
  const p1Winner = !!match.winnerId && match.winnerId === match.player1Id;
  const p2Winner = !!match.winnerId && match.winnerId === match.player2Id;
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "7px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
      <Row user={userOf(match.player1Id)} score={match.score1} winner={p1Winner} />
      <Row user={userOf(match.player2Id)} score={match.score2} winner={p2Winner} />
    </div>
  );
}

function Row({ user, score, winner }: { user: OverlayUser | undefined; score: number | null; winner: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 17, fontWeight: winner ? 700 : 400, color: winner ? "#5eead4" : "rgba(255,255,255,0.85)" }}>
      <RankedAvatar rankPoints={user?.rankPoints ?? 0} src={user?.image} alt={displayName(user)} size={26} />
      <span style={{ flex: 1 }}>{displayName(user)}</span>
      {score != null && <span>{score}</span>}
    </div>
  );
}

type RankedRow = { userId: string; user: OverlayUser; primary: string; secondary: string };

/** Tabellen-Panel — die Berechnung unterscheidet sich bewusst je Turnierformat, weil die
 *  zugrunde liegenden Datenfelder unterschiedlich sind: Liga/Round-Robin tragen Sieger in
 *  `Match.winnerId`, FFA/Coop/Avg-Stats dagegen in `MatchEntry.placement`/`statsJson` — ein
 *  reiner winnerId-Sieg-Zähler zeigt bei FFA-Formaten für jeden Teilnehmer 0 an. Spiegelt
 *  die Logik aus LigaView/RoundRobinView/FfaView, nur kompakter fürs Overlay. */
function TablePanel({
  matches, participants, format, statFields,
}: { matches: OverlayMatch[]; participants: OverlayParticipant[]; format: string | null; statFields: string | null }) {
  const isFfaFamily = format === "ffa" || format === "coop_stats" || format === "avg_stats";
  const title = format === "liga" ? "Liga-Tabelle" : isFfaFamily ? "Gesamtranking" : "Tabelle";
  const ranked = isFfaFamily
    ? buildFfaRanking(matches, participants, format, statFields)
    : buildMatchRanking(matches, participants, format);

  return (
    <PanelShell title={title}>
      <AutoScrollViewport axis="y" size={PANEL_LIST_HEIGHT_COMPACT} gap={2}>
        {ranked.map((p, i) => (
          <div
            key={p.userId}
            style={{
              display: "flex", alignItems: "center", gap: 13, width: "100%",
              padding: "5px 8px", borderRadius: 7,
              background: i < 3 ? "rgba(20,184,166,0.06)" : "transparent",
            }}
          >
            <span style={{ width: 22, fontSize: 15, opacity: 0.4, textAlign: "right" }}>{i + 1}</span>
            <RankedAvatar rankPoints={p.user.rankPoints} src={p.user.image} alt={displayName(p.user)} size={30} />
            <span style={{ flex: 1, fontSize: 18, fontWeight: i < 3 ? 700 : 400, color: i < 3 ? "#5eead4" : "#fff" }}>
              {displayName(p.user)}
            </span>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", minWidth: 84 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: i < 3 ? "#5eead4" : "#fff" }}>{p.primary}</span>
              {p.secondary && <span style={{ fontSize: 13, opacity: 0.5 }}>{p.secondary}</span>}
            </div>
          </div>
        ))}
      </AutoScrollViewport>
    </PanelShell>
  );
}

/** Liga (mit Unentschieden) / Round-Robin (ohne) — Sieg=3, Unentschieden=1, sortiert nach
 *  Punkten, dann Siegen, dann Tordifferenz. Identische Punktelogik wie LigaView/RoundRobinView. */
function buildMatchRanking(matches: OverlayMatch[], participants: OverlayParticipant[], format: string | null): RankedRow[] {
  const supportsDraw = format === "liga";
  type Acc = { w: number; d: number; l: number; pts: number; scored: number; conceded: number };
  const map = new Map<string, Acc>(participants.map(p => [p.userId, { w: 0, d: 0, l: 0, pts: 0, scored: 0, conceded: 0 }]));

  for (const m of matches) {
    const isDraw = supportsDraw && !!m.playedAt && !m.winnerId;
    if (!m.winnerId && !isDraw) continue;

    if (isDraw) {
      for (const uid of [m.player1Id, m.player2Id]) {
        const s = uid ? map.get(uid) : undefined;
        if (s) { s.d += 1; s.pts += 1; }
      }
    } else if (m.winnerId) {
      const w = map.get(m.winnerId);
      if (w) { w.w += 1; w.pts += 3; }
      const loserId = m.player1Id === m.winnerId ? m.player2Id : m.player1Id;
      const l = loserId ? map.get(loserId) : undefined;
      if (l) l.l += 1;
    }

    if (m.player1Id && m.score1 != null) {
      const s = map.get(m.player1Id);
      if (s) { s.scored += m.score1; s.conceded += m.score2 ?? 0; }
    }
    if (m.player2Id && m.score2 != null) {
      const s = map.get(m.player2Id);
      if (s) { s.scored += m.score2; s.conceded += m.score1 ?? 0; }
    }
  }

  return participants
    .map(p => {
      const s = map.get(p.userId)!;
      const secondary = supportsDraw ? `${s.w}S · ${s.d}U · ${s.l}N` : `${s.w}S · ${s.l}N`;
      return { userId: p.userId, user: p.user, s, secondary, primary: `${s.pts} Pkt.` };
    })
    .sort((a, b) => b.s.pts - a.s.pts || b.s.w - a.s.w || (b.s.scored - b.s.conceded) - (a.s.scored - a.s.conceded));
}

/** FFA / Coop-Stats / Avg-Stats — Sieger stecken in MatchEntry, nicht in Match.winnerId.
 *  coop_stats zählt "Match Win"-Flags, avg_stats den Durchschnitt über alle Stat-Felder,
 *  ffa die Summe des ersten (primären) Stat-Felds — identische Sortierlogik wie FfaView. */
function buildFfaRanking(
  matches: OverlayMatch[], participants: OverlayParticipant[], format: string, statFieldsJson: string | null,
): RankedRow[] {
  let statFields: string[] = [];
  try { statFields = statFieldsJson ? JSON.parse(statFieldsJson) : []; } catch { /* ignore */ }
  const isAvg  = format === "avg_stats";
  const isCoop = format === "coop_stats";

  const totals = new Map<string, { stats: Record<string, number>; matchCount: number }>(
    participants.map(p => [p.userId, { stats: {}, matchCount: 0 }])
  );
  for (const m of matches) {
    if (!m.playedAt) continue;
    for (const e of m.entries) {
      if (!e.userId) continue;
      let t = totals.get(e.userId);
      if (!t) { t = { stats: {}, matchCount: 0 }; totals.set(e.userId, t); }
      t.matchCount += 1;
      if (e.statsJson) {
        try {
          const s = JSON.parse(e.statsJson) as Record<string, number>;
          for (const [k, v] of Object.entries(s)) t.stats[k] = (t.stats[k] ?? 0) + v;
        } catch { /* ignore */ }
      }
    }
  }

  return participants
    .map(p => {
      const t = totals.get(p.userId) ?? { stats: {}, matchCount: 0 };
      let primary: string;
      if (isCoop) {
        primary = `${t.stats["Match Win"] ?? 0} Siege`;
      } else if (isAvg) {
        const avg = statFields.length > 0 && t.matchCount > 0
          ? statFields.map(f => (t.stats[f] ?? 0) / t.matchCount).reduce((a, b) => a + b, 0) / statFields.length
          : 0;
        primary = t.matchCount > 0 ? `Ø ${avg.toFixed(1)}` : "–";
      } else {
        const primaryField = statFields[0];
        primary = primaryField ? `${t.stats[primaryField] ?? 0} ${primaryField}` : `${t.matchCount} Runden`;
      }
      return { userId: p.userId, user: p.user, t, primary, secondary: "" };
    })
    .sort((a, b) => {
      if (a.t.matchCount === 0 && b.t.matchCount === 0) return 0;
      if (a.t.matchCount === 0) return 1;
      if (b.t.matchCount === 0) return -1;
      if (isCoop) return (b.t.stats["Match Win"] ?? 0) - (a.t.stats["Match Win"] ?? 0);
      if (isAvg) {
        const avgOf = (t: typeof a.t) => statFields.length > 0
          ? statFields.map(f => (t.stats[f] ?? 0) / t.matchCount).reduce((s, v) => s + v, 0) / statFields.length
          : 0;
        return avgOf(b.t) - avgOf(a.t);
      }
      for (const f of statFields) {
        const diff = (b.t.stats[f] ?? 0) - (a.t.stats[f] ?? 0);
        if (diff !== 0) return diff;
      }
      return 0;
    });
}

/* ── Teilnehmer-Panel ── */
function ParticipantsPanel({ participants }: { participants: OverlayParticipant[] }) {
  return (
    <PanelShell title="Teilnehmer">
      <AutoScrollViewport axis="y" size={PANEL_LIST_HEIGHT_COMPACT}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px 14px", width: "100%" }}>
          {participants.map(p => (
            <div key={p.userId} style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
              <RankedAvatar rankPoints={p.user.rankPoints} src={p.user.image} alt={displayName(p.user)} size={28} />
              <span style={{ fontSize: 17, color: "rgba(255,255,255,0.85)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {displayName(p.user)}
              </span>
            </div>
          ))}
        </div>
      </AutoScrollViewport>
    </PanelShell>
  );
}
