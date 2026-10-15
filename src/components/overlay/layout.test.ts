import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  parseLayoutParam, serializeLayoutParam, legacyParamsToLayout, sanitizeLayout, sanitizePauseText,
  parseStreamerConfig, adaptEventLayout, defaultStreamerEventLayout,
  sanitizeControl, parseOverlayControl, activeZoom, sanitizeClipConfig, DEFAULT_CLIP_CONFIG,
} from "./layout";
import { spreadChannels } from "./clip-order";
import { ELEMENT_KEYS, type ElementKey } from "./types";
import { sameGame } from "../../lib/game-match";

describe("Overlay-Layout", () => {
  test("URL-Layout: Hin- und Rückweg inkl. Größe und Zyklus", () => {
    const parsed = parseLayoutParam<ElementKey>("brand:1.5,90.6;table:74.6,2.6,s1.30,c8-4;unbekannt:1,1", ELEMENT_KEYS)!;
    assert.deepEqual(parsed, { brand: { x: 1.5, y: 90.6 }, table: { x: 74.6, y: 2.6, scale: 1.3, cycle: { onSec: 8, offSec: 4 } } });
    assert.deepEqual(parseLayoutParam(serializeLayoutParam(parsed), ELEMENT_KEYS), parsed);
  });

  test("Werte werden begrenzt, Unsinn verworfen", () => {
    const parsed = parseLayoutParam<ElementKey>("brand:150,-5,s9;ticker:abc,1", ELEMENT_KEYS)!;
    assert.deepEqual(parsed, { brand: { x: 100, y: 0, scale: 2 } });
    assert.equal(parseLayoutParam("", ELEMENT_KEYS), null);
  });

  test("alte Links ohne layout: Panels stapeln sich an der gewählten Ecke", () => {
    const layout = legacyParamsToLayout({ panels: "table,participants", pos: "top-left", rotate: "6" }, "liga");
    assert.deepEqual(layout.elements.table, layout.elements.participants);
    assert.equal(layout.elements.table!.x, 1.5);
    assert.ok(layout.elements.liveinfo && layout.elements.ticker);
    assert.equal(layout.rotateSeconds, 6);
    const noBrand = legacyParamsToLayout({ brand: "0", ticker: "0" }, "single_elimination");
    assert.ok(noBrand.elements.bracket && !noBrand.elements.liveinfo && !noBrand.elements.ticker);
  });

  test("Streamer-Layout passt sich dem Turnierformat an", () => {
    const base = defaultStreamerEventLayout();
    assert.ok(!adaptEventLayout(base, "liga").elements.bracket);
    assert.ok(adaptEventLayout(base, "liga").elements.table);
    assert.ok(!adaptEventLayout(base, "single_elimination").elements.table);
    assert.ok(!adaptEventLayout(base, null).elements.table);
  });

  test("gespeicherte Einstellungen: entfernte Elemente fallen still heraus", () => {
    const cfg = parseStreamerConfig(JSON.stringify({
      event: { elements: { brand: { x: 1, y: 1 }, favorites: { x: 5, y: 40 } }, rotateSeconds: 999 },
      profile: { elements: { favorites: { x: 1, y: 1 } }, rotateSeconds: 10 },
      pauseText: "  Gleich   zurück  ", lite: true,
    }));
    assert.deepEqual(cfg.event, { elements: { brand: { x: 1, y: 1 } }, rotateSeconds: 60 });
    assert.equal(cfg.profile, null);
    assert.equal(cfg.pauseText, "Gleich zurück");
    assert.equal(cfg.lite, true);
    assert.equal(cfg.pauseBackground, "dark");
    assert.deepEqual(parseStreamerConfig("kaputt"), { event: null, profile: null, pauseText: null, lite: false, pauseBackground: "dark", clips: DEFAULT_CLIP_CONFIG });
    assert.equal(parseStreamerConfig(JSON.stringify({ pauseBackground: "space" })).pauseBackground, "space");
    assert.equal(parseStreamerConfig(JSON.stringify({ pauseBackground: "gibtsnicht" })).pauseBackground, "dark");
    assert.equal(sanitizeLayout({ elements: {} }, ELEMENT_KEYS), null);
  });

  test("Pausentext: Leerzeichen zusammengefasst, Buchstaben bleiben, Länge begrenzt", () => {
    assert.equal(sanitizePauseText("Kurze Pause – bin gleich zurück!"), "Kurze Pause – bin gleich zurück!");
    assert.equal(sanitizePauseText("   "), null);
    assert.equal(sanitizePauseText(42), null);
    assert.equal(sanitizePauseText("x".repeat(100))!.length, 60);
  });

  test("Spielabgleich Twitch ↔ Event", () => {
    assert.ok(sameGame("Rocket League", "rocket league"));
    assert.ok(sameGame("EA Sports FC 25", "EA SPORTS FC"));
    assert.ok(!sameGame("Rocket League", "Trackmania"));
    assert.ok(!sameGame("", "Trackmania"));
  });

  test("Live-Steuerung: unbekannte Elemente fliegen raus, Zoom läuft ab", () => {
    const c = sanitizeControl({ hidden: ["table", "table", "favorites", 3, "community"], zoom: "seriesTable", zoomUntil: 5000, pause: true });
    assert.deepEqual(c, { hidden: ["table", "community"], zoom: "seriesTable", zoomUntil: 5000, pause: true, countdownUntil: null });
    assert.equal(activeZoom(c, 4999), "seriesTable");
    assert.equal(activeZoom(c, 5000), null);
    assert.equal(activeZoom({ ...c, zoomUntil: null }, 9e15), "seriesTable");
    assert.deepEqual(sanitizeControl({ zoom: "badges" }), { hidden: [], zoom: null, zoomUntil: null, pause: false, countdownUntil: null });
    assert.deepEqual(parseOverlayControl("{kaputt"), { hidden: [], zoom: null, zoomUntil: null, pause: false, countdownUntil: null });
  });

  test("Clip-Szenen: Standard, Teil-Update, ungültige Werte", () => {
    assert.deepEqual(parseStreamerConfig(null).clips, DEFAULT_CLIP_CONFIG);
    assert.deepEqual(parseStreamerConfig('{"clips":{"source":"game","muted":false}}').clips, { source: "game", muted: false, introText: null, outroText: null });
    const base = sanitizeClipConfig({ source: "recent", introText: "  Los   gehts " });
    assert.deepEqual(base, { source: "recent", muted: true, introText: "Los gehts", outroText: null });
    assert.deepEqual(sanitizeClipConfig({ source: "quatsch", outroText: "Tschüss" }, base), { ...base, outroText: "Tschüss" });
    assert.equal(sanitizeClipConfig({ introText: "" }, base).introText, null);
  });

  test("Intro-Countdown in der Live-Steuerung", () => {
    assert.equal(sanitizeControl({ countdownUntil: 123456 }).countdownUntil, 123456);
    assert.equal(sanitizeControl({ countdownUntil: "abc" }).countdownUntil, null);
    assert.equal(sanitizeControl({ countdownUntil: -5 }).countdownUntil, null);
  });

  test("Clip-Loop: gleicher Kanal möglichst nie direkt hintereinander", () => {
    const order = spreadChannels(["a", "a", "a", "b", "b", "c"].map(channelLogin => ({ channelLogin })));
    for (let i = 1; i < order.length; i++) assert.notEqual(order[i].channelLogin, order[i - 1].channelLogin);
    assert.equal(spreadChannels([{ channelLogin: "a" }, { channelLogin: "a" }]).length, 2);
  });
});
