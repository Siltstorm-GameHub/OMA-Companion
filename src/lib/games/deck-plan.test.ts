import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  countNewCards, highlightOf, planDeck, plannedKey, roundRobin,
  type DiscoverItem, type PlanGame, type PlanInput, type WeeklyDrop,
} from "./deck-plan";
import { berlinWeek, parseEpicFreeGames, steamSearchAppIds } from "./discover-parse";
import { gainedSubscription } from "./store-sync";
import { newCardsSince, shouldNotifyNewCards, NEW_CARDS_MIN } from "./swipe-notify";

const NOW = new Date("2026-11-18T12:00:00Z"); // Mittwoch
const DAY = 86_400_000;
const ago = (days: number) => new Date(NOW.getTime() - days * DAY);

function game(id: string, over: Partial<PlanGame> = {}): PlanGame {
  return {
    id, nameKey: id, aliases: [], steamAppId: null, igdbId: null, createdAt: ago(100), inCount: 0, wishCount: 0, ratingCount: 0,
    discountPercent: 0, saleStartedAt: null, subscriptions: [], subscriptionsAddedAt: null, ...over,
  };
}

function item(name: string, over: Partial<DiscoverItem> = {}): DiscoverItem {
  return {
    source: "steam_top", steamAppId: null, igdbId: null, name, coverUrl: null, releaseYear: null, releaseDate: null,
    description: null, genres: [], modes: [], platforms: [], crossplay: false, isFree: null, minPlayers: null, maxPlayers: null,
    sessionLength: null, priceCents: null, priceInitialCents: null, discountPercent: 0, priceCurrency: null,
    freeUntil: null, store: null, storeUrl: null, subscriptions: [], addedAt: ago(1).toISOString(), ...over,
  };
}

function input(over: Partial<PlanInput> = {}): PlanInput {
  return {
    now: NOW, games: [], nextEventAt: new Map(), discover: [], drop: null, reactions: [],
    steamSwiped: new Set(), igdbSwiped: new Set(), ...over,
  };
}

describe("GameSwipe-Planung", () => {
  test("Hinweise: Wunschliste bekommt Angebot/Abo/Gratis erneut, aber nur wenn vor dem Anlass entschieden", () => {
    const sale = game("a", { discountPercent: 40, saleStartedAt: ago(2) });
    assert.equal(highlightOf(sale, null, null, null, NOW)?.reason, "sale");
    assert.equal(highlightOf(sale, "wish", ago(10), null, NOW)?.reason, "sale");
    assert.equal(highlightOf(sale, "wish", ago(1), null, NOW), null, "nach Angebotsbeginn entschieden = schon gesehen");
    assert.equal(highlightOf(sale, "in", ago(10), null, NOW), null);
    assert.equal(highlightOf(game("b", { discountPercent: 10, saleStartedAt: ago(2) }), null, null, null, NOW), null, "zu wenig Rabatt");

    const sub = game("c", { subscriptions: ["gamepass_pc"], subscriptionsAddedAt: ago(3) });
    assert.equal(highlightOf(sub, "wish", ago(30), null, NOW)?.reason, "subscription");
    assert.equal(highlightOf(game("d", { subscriptions: ["gamepass_pc"], subscriptionsAddedAt: ago(40) }), null, null, null, NOW), null);

    const free = item("e", { source: "free", addedAt: ago(1).toISOString(), freeUntil: new Date(NOW.getTime() + DAY).toISOString() });
    assert.equal(highlightOf(sale, "wish", ago(10), free, NOW)?.reason, "free", "gratis schlägt Angebot");
    const expired = { ...free, freeUntil: ago(0.5).toISOString() };
    assert.equal(highlightOf(game("f"), null, null, expired, NOW), null);
  });

  test("Reihenfolge: Event → Hinweise → beliebt → neu → erneut fragen, Entdecken jede 4. Karte", () => {
    const games = [
      game("neu", { createdAt: ago(1) }),
      game("beliebt", { inCount: 3 }),
      game("event"),
      game("angebot", { discountPercent: 50, saleStartedAt: ago(1) }),
      game("alt"),
      game("raus"),
    ];
    const plan = planDeck(input({
      games,
      nextEventAt: new Map([["event", new Date(NOW.getTime() + 2 * DAY)]]),
      reactions: [
        { gameId: "alt", status: "in", decidedAt: ago(200) },
        { gameId: "raus", status: "out", decidedAt: ago(200) },
      ],
      discover: [item("trend", { steamAppId: 5 })],
    }));
    assert.deepEqual(plan.map(plannedKey), ["g:event", "g:angebot", "g:beliebt", "d:s:5", "g:neu", "g:alt"]);
    const last = plan[5];
    assert.ok(last.kind === "game" && last.reason === "recheck");
  });

  test("Entdecken: ohne Listen-Spiele, Entschiedenes, Dubletten und Abgelaufenes; gratis zuerst", () => {
    const plan = planDeck(input({
      games: [game("portal", { steamAppId: 400 })],
      steamSwiped: new Set([7]),
      igdbSwiped: new Set([9]),
      discover: [
        item("Portal", { steamAppId: 400 }),                       // schon in der Liste
        item("Weg", { steamAppId: 7 }),                            // schon entschieden
        item("Konsole", { igdbId: 9 }),                            // schon entschieden (IGDB)
        item("Trend", { steamAppId: 8 }),
        item("Trend doppelt", { steamAppId: 8, source: "steam_new" }),
        item("Bald", { igdbId: 11, source: "upcoming", releaseDate: new Date(NOW.getTime() + 5 * DAY).toISOString() }),
        item("Schon raus", { igdbId: 12, source: "upcoming", releaseDate: ago(1).toISOString() }),
        item("Gratis", { steamAppId: 13, source: "free" }),
        item("Ohne ID"),
      ],
    }));
    const keys = plan.map(plannedKey);
    assert.deepEqual(keys.filter(k => k.startsWith("d:")), ["d:s:13", "d:i:11", "d:s:8"]);
  });

  test("Gratis-Aktion zu einem Listen-Spiel wird zur Hinweis-Karte (über den Namen)", () => {
    const plan = planDeck(input({
      games: [game("rocketleague")],
      reactions: [{ gameId: "rocketleague", status: "wish", decidedAt: ago(30) }],
      discover: [item("Rocket League", { source: "free", store: "epic", storeUrl: "https://store.epicgames.com/x" })],
    }));
    assert.equal(plan.length, 1);
    const c = plan[0];
    assert.ok(c.kind === "game" && c.reason === "free" && c.promo?.store === "epic");
  });

  test("Drop der Woche kommt zuerst, nur offene Karten; aufgenommene Entdecken-Karten werden Listen-Karten", () => {
    const drop: WeeklyDrop = {
      week: "2026-W47", startsAt: ago(2).toISOString(), endsAt: new Date(NOW.getTime() + 5 * DAY).toISOString(),
      items: [
        { kind: "game", gameId: "tipp", tip: { by: "Anna", note: "Super mit 4 Leuten" } },
        { kind: "game", gameId: "entschieden", tip: null },
        { kind: "discover", item: item("Jetzt in Liste", { steamAppId: 77 }) },
        { kind: "discover", item: item("Extern", { igdbId: 88, source: "upcoming" }) },
      ],
    };
    const plan = planDeck(input({
      games: [game("tipp"), game("entschieden"), game("aufgenommen", { steamAppId: 77 }), game("sonst", { inCount: 5 })],
      reactions: [{ gameId: "entschieden", status: "in", decidedAt: ago(1) }],
      drop,
    }));
    assert.deepEqual(plan.slice(0, 3).map(plannedKey), ["g:tipp", "g:aufgenommen", "d:i:88"]);
    assert.ok(plan.slice(0, 3).every(c => c.drop));
    assert.equal(plan[0].kind === "game" && plan[0].tip?.by, "Anna");
    assert.equal(plan.filter(c => plannedKey(c) === "g:aufgenommen").length, 1, "keine Dublette im restlichen Stapel");
    assert.equal(countNewCards(plan, ago(3)), plan.filter(c => c.since && c.since > ago(3)).length);

    const expired = planDeck(input({ games: [game("tipp")], drop: { ...drop, endsAt: ago(0.1).toISOString() } }));
    assert.ok(expired.every(c => !c.drop));
  });

  test("roundRobin zieht reihum", () => {
    assert.deepEqual(roundRobin([[1, 2, 3], [4], [5, 6]]), [1, 4, 5, 2, 6, 3]);
    assert.deepEqual(roundRobin([]), []);
  });
});

describe("GameSwipe-Quellen", () => {
  test("Epic: nur laufende 100-%-Aktionen, mit Store-Link und Querformat-Bild", () => {
    const json = {
      data: { Catalog: { searchStore: { elements: [
        {
          title: "Cooles Spiel", offerType: "BASE_GAME", productSlug: "cooles-spiel",
          catalogNs: { mappings: [{ pageSlug: "cooles-spiel-abc", pageType: "productHome" }] },
          keyImages: [{ type: "Thumbnail", url: "https://img/thumb.jpg" }, { type: "OfferImageWide", url: "https://img/wide.jpg" }],
          price: { totalPrice: { discountPrice: 0, originalPrice: 1999 } },
          promotions: { promotionalOffers: [{ promotionalOffers: [{
            startDate: "2026-11-12T16:00:00.000Z", endDate: "2026-11-19T16:00:00.000Z",
            discountSetting: { discountType: "PERCENTAGE", discountPercentage: 0 },
          }] }] },
        },
        { title: "Bald gratis", promotions: { promotionalOffers: [] } },
        {
          title: "Nur reduziert", price: { totalPrice: { discountPrice: 999 } },
          promotions: { promotionalOffers: [{ promotionalOffers: [{ startDate: "2026-11-12T16:00:00Z", endDate: "2026-11-19T16:00:00Z", discountSetting: { discountPercentage: 50 } }] }] },
        },
        { title: "Mystery Game", promotions: { promotionalOffers: [{ promotionalOffers: [{ startDate: "2026-11-12T16:00:00Z", endDate: "2026-11-19T16:00:00Z", discountSetting: { discountPercentage: 0 } }] }] } },
      ] } } },
    };
    const free = parseEpicFreeGames(json, NOW);
    assert.equal(free.length, 1);
    assert.equal(free[0].title, "Cooles Spiel");
    assert.equal(free[0].storeUrl, "https://store.epicgames.com/de/p/cooles-spiel-abc");
    assert.equal(free[0].imageUrl, "https://img/wide.jpg");
    assert.equal(free[0].endsAt, "2026-11-19T16:00:00.000Z");
    assert.deepEqual(parseEpicFreeGames(json, new Date("2026-11-20T00:00:00Z")), [], "abgelaufen");
    assert.deepEqual(parseEpicFreeGames(null), []);
  });

  test("Steam-Suche: App-IDs aus den Bild-URLs", () => {
    assert.deepEqual(steamSearchAppIds({ items: [
      { logo: "https://cdn.akamai.steamstatic.com/steam/apps/1234/capsule_231x87.jpg" }, { logo: "kaputt" }, {},
    ] }), [1234]);
  });

  test("Drop-Woche: ISO-Woche und Montag 00:00 Europe/Berlin (Winter- und Sommerzeit)", () => {
    const w = berlinWeek(NOW);
    assert.equal(w.key, "2026-W47");
    assert.equal(w.startsAt.toISOString(), "2026-11-15T23:00:00.000Z");
    assert.equal(w.endsAt.toISOString(), "2026-11-22T23:00:00.000Z");
    // Sonntag 23:30 Berliner Zeit gehört noch zur alten Woche, Montag 00:30 zur neuen
    assert.equal(berlinWeek(new Date("2026-11-22T22:30:00Z")).key, "2026-W47");
    assert.equal(berlinWeek(new Date("2026-11-22T23:30:00Z")).key, "2026-W48");
    const summer = berlinWeek(new Date("2026-07-01T10:00:00Z"));
    assert.equal(summer.startsAt.toISOString(), "2026-06-28T22:00:00.000Z");
    assert.equal(berlinWeek(new Date("2027-01-01T12:00:00Z")).key, "2026-W53");
  });

  test("Neu im Abo: nur wenn ein Abo dazukommt", () => {
    assert.equal(gainedSubscription([], ["gamepass_pc"]), true);
    assert.equal(gainedSubscription(["gamepass_pc"], ["gamepass_pc", "gamepass_xbox"]), true);
    assert.equal(gainedSubscription(["gamepass_pc", "ea_play"], ["gamepass_pc"]), false);
  });
});

describe("GameSwipe-Benachrichtigungen", () => {
  test("neue Karten: Mindestanzahl und Abstand", () => {
    assert.equal(shouldNotifyNewCards(null, NEW_CARDS_MIN - 1, NOW), false);
    assert.equal(shouldNotifyNewCards(null, NEW_CARDS_MIN, NOW), true);
    assert.equal(shouldNotifyNewCards({ seenAt: null, notifiedAt: ago(2) }, 20, NOW), false);
    assert.equal(shouldNotifyNewCards({ seenAt: null, notifiedAt: ago(5) }, 20, NOW), true);
  });

  test("neu zählt ab dem letzten Besuch bzw. Hinweis", () => {
    assert.equal(newCardsSince({ seenAt: ago(3), notifiedAt: ago(5) }, NOW).getTime(), ago(3).getTime());
    assert.equal(newCardsSince({ seenAt: null, notifiedAt: ago(5) }, NOW).getTime(), ago(5).getTime());
    assert.equal(newCardsSince(null, NOW).getTime(), ago(7).getTime());
  });
});
