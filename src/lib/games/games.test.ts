import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { gameNameKey, gameSlug, uniqueGameSlug } from "./slug";
import { averageRating, formatRating, isValidRating, weightedRating } from "./rating";
import { combineDrafts, computeFieldSources, emptyFields, mergeAutoFields, parseFieldSources, sanitizeGameFields } from "./draft";
import { rankForGroup } from "./group";
import { matchesGameName, sanitizeAliases } from "./match";
import { applicableFills, formatFieldValue, missingFields } from "./edits";
import { igdbString, parseIgdbGame, steamAppIdFromUrls } from "./igdb";
import { cleanSteamText, parseSteamAppData } from "./steam";
import { EMPTY_FILTERS, filterGames, fitsPlayerCount, sortGames, type GameListItem } from "./filter";
import { formatPlayers } from "./options";

describe("slug", () => {
  test("nameKey erkennt Schreibvarianten als dasselbe Spiel", () => {
    assert.equal(gameNameKey("Counter-Strike 2"), gameNameKey("counter strike 2"));
    assert.equal(gameNameKey("Counter‑Strike™ 2"), gameNameKey("Counter-Strike 2"));
    assert.equal(gameNameKey("Pokémon"), "pokemon");
    assert.equal(gameNameKey("Mörder & Co"), "moerderandco");
  });
  test("Nummern bleiben unterscheidbar", () => {
    assert.notEqual(gameNameKey("FIFA 23"), gameNameKey("FIFA 24"));
  });
  test("Slug ist URL-tauglich und weicht vergebenen/reservierten Slugs aus", () => {
    assert.equal(gameSlug("Rocket League®"), "rocket-league");
    assert.equal(gameSlug("!!!"), "spiel");
    const taken = new Set(["rocket-league", "rocket-league-2"]);
    assert.equal(uniqueGameSlug("Rocket League", s => taken.has(s)), "rocket-league-3");
    assert.equal(uniqueGameSlug("Finde", () => false), "finde-2");
  });
});

describe("rating", () => {
  test("Schnitt und gewichteter Schnitt", () => {
    assert.equal(averageRating(0, 0), null);
    assert.equal(averageRating(9, 2), 4.5);
    // Eine einzelne 5 liegt unter 30 Bewertungen mit Schnitt 4,6
    assert.ok(weightedRating(5, 1) < weightedRating(138, 30));
    assert.equal(weightedRating(0, 0), 3);
  });
  test("Format und Validierung", () => {
    assert.equal(formatRating(4.25), "4,3");
    assert.ok(isValidRating(1) && isValidRating(5));
    assert.ok(!isValidRating(0) && !isValidRating(6) && !isValidRating(3.5) && !isValidRating("4"));
  });
});

describe("sanitizeGameFields", () => {
  test("verwirft Unbekanntes, tauscht vertauschte Spielerzahlen", () => {
    const f = sanitizeGameFields({
      genres: ["shooter", "quatsch", "shooter"], modes: ["pvp", "coop"], platforms: ["pc", 3],
      minPlayers: "8", maxPlayers: 2, sessionLength: "ewig", crossplay: "ja", isFree: true, description: "  ",
    });
    assert.deepEqual(f.genres, ["shooter"]);
    assert.deepEqual(f.modes, ["coop", "pvp"]); // Reihenfolge der Optionsliste
    assert.deepEqual(f.platforms, ["pc"]);
    assert.equal(f.minPlayers, 2);
    assert.equal(f.maxPlayers, 8);
    assert.equal(f.sessionLength, null);
    assert.equal(f.crossplay, false);
    assert.equal(f.isFree, true);
    assert.equal(f.description, null);
  });
  test("Spielerzahl wird gekappt, 0 und Negatives verworfen", () => {
    const f = sanitizeGameFields({ minPlayers: 0, maxPlayers: 5000 });
    assert.equal(f.minPlayers, null);
    assert.equal(f.maxPlayers, 100);
  });
});

describe("fieldSources", () => {
  const steam = { ...emptyFields(), genres: ["action" as const], modes: ["coop" as const], isFree: true };
  test("übernommene Steam-Werte zählen als steam, Änderungen als user", () => {
    const final = { ...steam, modes: ["coop" as const, "pvp" as const], minPlayers: 2 };
    assert.deepEqual(computeFieldSources(final, steam), { genres: "steam", modes: "user", isFree: "steam", minPlayers: "user" });
    assert.deepEqual(computeFieldSources(final, null), { genres: "user", modes: "user", isFree: "user", minPlayers: "user" });
  });
  test("Steam-Abgleich überschreibt keine Menschen-Angaben", () => {
    const current = { ...emptyFields(), modes: ["pvp" as const], genres: ["shooter" as const] };
    const { fields, sources } = mergeAutoFields(current, { modes: "user", genres: "steam" }, steam);
    assert.deepEqual(fields.modes, ["pvp"]);
    assert.deepEqual(fields.genres, ["action"]);
    assert.equal(fields.isFree, true);
    assert.equal(sources.modes, "user");
    assert.equal(sources.isFree, "steam");
  });
  test("parseFieldSources ist defensiv", () => {
    assert.deepEqual(parseFieldSources(null), {});
    assert.deepEqual(parseFieldSources({ modes: "user", genres: "x", foo: "steam", tags: "igdb" }), { modes: "user", tags: "igdb" });
  });
});

describe("Steam-Auswertung", () => {
  test("cleanSteamText entfernt Tags und dekodiert Entities", () => {
    assert.equal(cleanSteamText("Fu&szlig;ball &quot;mit&quot;<br>Autos &amp; mehr &#8211; jetzt"), "Fu&szlig;ball \"mit\" Autos & mehr – jetzt");
  });

  test("Rocket-League-artige Daten", () => {
    const d = parseSteamAppData(252950, {
      type: "game",
      name: "Rocket League®",
      is_free: true,
      short_description: "Fußball trifft Autos &amp; Action.",
      header_image: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/252950/header.jpg",
      platforms: { windows: true, mac: false, linux: false },
      categories: [{ id: 2 }, { id: 1 }, { id: 49 }, { id: 36 }, { id: 9 }, { id: 38 }, { id: 24 }, { id: 39 }, { id: 27 }],
      genres: [{ id: "1" }, { id: "9" }, { id: "18" }, { id: "23" }, { id: "37" }],
      release_date: { coming_soon: false, date: "7. Juli 2015" },
    });
    assert.equal(d.name, "Rocket League®");
    assert.equal(d.steamAppId, 252950);
    assert.deepEqual(d.modes, ["solo", "coop", "pvp"]);
    assert.deepEqual(d.genres, ["action", "racing", "sport"]);
    assert.deepEqual(d.tags, ["couch"]);
    assert.deepEqual(d.platforms, ["pc"]);
    assert.equal(d.crossplay, true);
    assert.equal(d.isFree, true);
    assert.equal(d.minPlayers, 1);
    assert.equal(d.maxPlayers, null);
    assert.equal(d.releaseYear, 2015);
    assert.equal(d.description, "Fußball trifft Autos & Action.");
    assert.ok(d.coverUrl?.startsWith("https://"));
  });

  test("Reines Einzelspieler-Spiel → 1 Spieler, nur Solo", () => {
    const d = parseSteamAppData(1, { name: "Solo", is_free: false, categories: [{ id: 2 }], release_date: { coming_soon: true, date: "2027" } });
    assert.deepEqual(d.modes, ["solo"]);
    assert.equal(d.minPlayers, 1);
    assert.equal(d.maxPlayers, 1);
    assert.equal(d.isFree, false);
    assert.equal(d.releaseYear, null); // noch nicht erschienen
  });

  test("Nur Mehrspieler → ab 2 Spielern; unsichere Cover-URL wird verworfen", () => {
    const d = parseSteamAppData(2, { categories: [{ id: 1 }, { id: 36 }], header_image: "http://evil.example/x.jpg" });
    assert.equal(d.minPlayers, 2);
    assert.equal(d.coverUrl, null);
    assert.equal(d.name, "Steam-App 2");
    assert.equal(d.isFree, null);
  });
});

function item(over: Partial<GameListItem>): GameListItem {
  return {
    id: over.slug ?? "x", slug: "x", name: "X", coverUrl: null, genres: [], tags: [], modes: [], platforms: [],
    crossplay: false, isFree: null, minPlayers: null, maxPlayers: null, sessionLength: null,
    ratingSum: 0, ratingCount: 0, wantCount: 0, ownCount: 0, playingCount: 0, createdAt: "2026-01-01T00:00:00.000Z",
    myRating: null, myWant: false, myOwns: false, ...over,
  };
}

describe("Filter & Sortierung", () => {
  test("Spieleranzahl: unbekannte Grenzen passen, Solo-Spiele nicht für Gruppen", () => {
    assert.ok(fitsPlayerCount(item({}), 5));
    assert.ok(!fitsPlayerCount(item({ minPlayers: 1, maxPlayers: 4 }), 5));
    assert.ok(!fitsPlayerCount(item({ minPlayers: 6 }), 5));
    assert.ok(!fitsPlayerCount(item({ modes: ["solo"] }), 2));
    assert.ok(fitsPlayerCount(item({ modes: ["solo"] }), 1));
  });

  const games = [
    item({ slug: "rl", name: "Rocket League", modes: ["pvp"], isFree: true, ratingSum: 46, ratingCount: 10, wantCount: 1, platforms: ["pc"] }),
    item({ slug: "cs", name: "Counter-Strike 2", modes: ["pvp"], genres: ["shooter"], ratingSum: 5, ratingCount: 1, wantCount: 5, createdAt: "2026-03-01T00:00:00.000Z" }),
    item({ slug: "ow", name: "Overcooked 2", modes: ["coop"], tags: ["couch"], minPlayers: 1, maxPlayers: 4, myWant: true }),
  ];

  test("Suche ignoriert Schreibweise", () => {
    assert.deepEqual(filterGames(games, { ...EMPTY_FILTERS, q: "counter strike" }).map(g => g.slug), ["cs"]);
  });
  test("Filter kombinieren", () => {
    assert.deepEqual(filterGames(games, { ...EMPTY_FILTERS, modes: ["coop"] }).map(g => g.slug), ["ow"]);
    assert.deepEqual(filterGames(games, { ...EMPTY_FILTERS, freeOnly: true }).map(g => g.slug), ["rl"]);
    assert.deepEqual(filterGames(games, { ...EMPTY_FILTERS, players: 6 }).map(g => g.slug), ["rl", "cs"]);
    assert.deepEqual(filterGames(games, { ...EMPTY_FILTERS, mineOnly: true }).map(g => g.slug), ["ow"]);
    assert.deepEqual(filterGames(games, { ...EMPTY_FILTERS, genre: "shooter", platforms: ["pc"] }).map(g => g.slug), []);
  });
  test("Sortierungen", () => {
    assert.deepEqual(sortGames(games, "rating").map(g => g.slug), ["rl", "cs", "ow"]);
    // rl: 10 Bewertungen + 1×Würde-ich-zocken (12) vor cs: 5×Würde-ich-zocken + 1 Bewertung (11)
    assert.deepEqual(sortGames(games, "popular").map(g => g.slug), ["rl", "cs", "ow"]);
    assert.deepEqual(sortGames(games, "new").map(g => g.slug), ["cs", "ow", "rl"]);
    assert.deepEqual(sortGames(games, "name").map(g => g.slug), ["cs", "ow", "rl"]);
  });
});

describe("formatPlayers", () => {
  test("Varianten", () => {
    assert.equal(formatPlayers(null, null), null);
    assert.equal(formatPlayers(2, 8), "2–8 Spieler");
    assert.equal(formatPlayers(1, 1), "1 Spieler");
    assert.equal(formatPlayers(2, null), "ab 2 Spielern");
    assert.equal(formatPlayers(1, null), "ab 1 Spieler");
    assert.equal(formatPlayers(null, 100), "bis 100+ Spieler");
  });
});

describe("IGDB-Auswertung", () => {
  test("Valorant-artig: nur PvP, Plattformen, Spieleranzahl aus multiplayer_modes", () => {
    const d = parseIgdbGame({
      id: 126459,
      name: "Valorant",
      summary: "A 5v5 character-based tactical shooter.",
      first_release_date: 1590710400, // 2020-05-29
      artworks: [{ image_id: "ar123" }],
      cover: { image_id: "co2mvt" },
      platforms: [{ name: "PC (Microsoft Windows)" }, { name: "PlayStation 5" }, { name: "Xbox Series X|S" }],
      game_modes: [2],
      genres: [5, 24],
      multiplayer_modes: [{ onlinemax: 10, onlinecoopmax: 0 }],
      websites: [{ url: "https://playvalorant.com" }],
    });
    assert.equal(d.igdbId, 126459);
    assert.equal(d.steamAppId, null);
    assert.deepEqual(d.modes, ["pvp"]);
    assert.deepEqual(d.platforms, ["pc", "playstation", "xbox"]);
    assert.deepEqual(d.genres, ["shooter", "strategy"]);
    assert.equal(d.minPlayers, 2);
    assert.equal(d.maxPlayers, 10);
    assert.equal(d.releaseYear, 2020);
    assert.equal(d.coverUrl, "https://images.igdb.com/igdb/image/upload/t_screenshot_big/ar123.jpg");
  });

  test("Koop + Splitscreen + Switch/Handy, Steam-ID aus dem Link", () => {
    const d = parseIgdbGame({
      id: 1,
      name: "Overcooked! 2",
      cover: { image_id: "c1" },
      platforms: [{ name: "Nintendo Switch" }, { name: "iOS" }, { name: "Android" }, { name: "Mac" }],
      game_modes: [1, 2, 3, 4],
      themes: [27],
      multiplayer_modes: [{ offlinecoopmax: 4, onlinecoopmax: 4, splitscreen: true }],
      websites: [{ url: "https://store.steampowered.com/app/728880/Overcooked_2/" }],
    });
    assert.deepEqual(d.modes, ["solo", "coop"]);
    assert.deepEqual(d.platforms, ["switch", "mobile", "pc"]);
    assert.deepEqual(d.tags, ["couch", "funny"]);
    assert.equal(d.minPlayers, 1);
    assert.equal(d.maxPlayers, 4);
    assert.equal(d.steamAppId, 728880);
    assert.equal(d.coverUrl, "https://images.igdb.com/igdb/image/upload/t_cover_big/c1.jpg");
  });

  test("Steam-Link exakt, Abfrage-Strings sicher", () => {
    assert.equal(steamAppIdFromUrls(["https://x.de", "https://store.steampowered.com/app/7301/"]), 7301);
    assert.equal(steamAppIdFromUrls([undefined]), null);
    assert.equal(igdbString('Bad "Game"; fields *;'), '"Bad \\"Game\\"; fields *;"');
  });
});

describe("combineDrafts", () => {
  const base = { name: "X", steamAppId: null, igdbId: null, coverUrl: null, releaseYear: null };
  const steam = { ...emptyFields(), ...base, name: "Rocket League", steamAppId: 252950, coverUrl: "https://steam/c.jpg",
    description: "Deutsch", genres: ["sport" as const], modes: ["solo" as const, "pvp" as const], platforms: ["pc" as const],
    isFree: true, minPlayers: 1 };
  const igdb = { ...emptyFields(), ...base, name: "Rocket League", igdbId: 11198, coverUrl: "https://igdb/c.jpg",
    description: "English", genres: ["racing" as const], modes: ["coop" as const, "pvp" as const],
    platforms: ["pc" as const, "playstation" as const, "switch" as const], tags: ["couch" as const], minPlayers: 1, maxPlayers: 8, crossplay: false };

  test("Steam gewinnt bei Text/Genre/Cover, IGDB liefert Konsolen und Spieleranzahl", () => {
    const r = combineDrafts(steam, igdb)!;
    assert.equal(r.draft.description, "Deutsch");
    assert.deepEqual(r.draft.genres, ["sport"]);
    assert.equal(r.draft.coverUrl, "https://steam/c.jpg");
    assert.equal(r.draft.steamAppId, 252950);
    assert.equal(r.draft.igdbId, 11198);
    assert.deepEqual(r.draft.modes, ["solo", "coop", "pvp"]);
    assert.deepEqual(r.draft.platforms, ["pc", "playstation", "switch"]);
    assert.equal(r.draft.maxPlayers, 8);
    assert.equal(r.sources.description, "steam");
    assert.equal(r.sources.platforms, "igdb");
    assert.equal(r.sources.maxPlayers, "igdb");
    assert.equal(r.sources.isFree, "steam");
  });

  test("Nur eine Quelle / keine Quelle", () => {
    const r = combineDrafts(null, igdb)!;
    assert.equal(r.draft.name, "Rocket League");
    assert.equal(r.sources.platforms, "igdb");
    assert.equal(r.sources.isFree, undefined);
    assert.equal(combineDrafts(null, null), null);
  });

  test("computeFieldSources übernimmt die Quelle des Vorschlags", () => {
    const r = combineDrafts(steam, igdb)!;
    const final = { ...r.draft, sessionLength: "kurz" as const };
    const src = computeFieldSources(final, r.draft, r.sources);
    assert.equal(src.platforms, "igdb");
    assert.equal(src.genres, "steam");
    assert.equal(src.sessionLength, "user");
  });
});

describe("Gruppen-Finder", () => {
  const games = [
    item({ id: "rl", slug: "rl", name: "Rocket League", isFree: true, maxPlayers: 8 }),
    item({ id: "oc", slug: "oc", name: "Overcooked 2", maxPlayers: 4, modes: ["coop"] }),
    item({ id: "cs", slug: "cs", name: "CS2", maxPlayers: 10 }),
    item({ id: "solo", slug: "solo", name: "Solo", modes: ["solo"] }),
    item({ id: "none", slug: "none", name: "Keiner hat's" }),
  ];
  const info = {
    oc: { owners: ["a", "b", "c"], wanters: ["a"] },
    cs: { owners: ["a", "b"], wanters: ["c", "x"] },
  };

  test("kostenlos und von allen besessen → bereit; einem fehlt's → fast", () => {
    const r = rankForGroup(games, info, ["a", "b", "c"]);
    assert.deepEqual(r.ready.map(m => m.game.slug), ["oc", "rl"]);
    assert.deepEqual(r.almost.map(m => m.game.slug), ["cs"]);
    assert.deepEqual(r.almost[0].missing, ["c"]);
    assert.deepEqual(r.almost[0].wanters, ["c"]); // "x" ist nicht in der Gruppe
  });

  test("zu viele Leute → Spiel fällt raus; Solo-Spiele nie für Gruppen", () => {
    const r = rankForGroup(games, info, ["a", "b", "c", "d", "e"]);
    assert.ok(!r.ready.some(m => m.game.slug === "oc")); // max. 4
    assert.ok(![...r.ready, ...r.almost].some(m => m.game.slug === "solo" || m.game.slug === "none"));
  });

  test("leere Gruppe", () => {
    assert.deepEqual(rankForGroup(games, info, []), { ready: [], almost: [] });
  });
});

describe("Ergänzungen durch Mitglieder", () => {
  test("nur leere Felder, nie überschreiben", () => {
    const current = { ...emptyFields(), modes: ["pvp" as const], minPlayers: 2 };
    assert.deepEqual(missingFields(current), ["maxPlayers", "platforms", "sessionLength", "genres", "isFree"]);
    const proposed = { ...emptyFields(), modes: ["coop" as const], maxPlayers: 8, platforms: ["pc" as const], isFree: false };
    assert.deepEqual(applicableFills(current, proposed), { maxPlayers: 8, platforms: ["pc"], isFree: false });
  });
  test("Spieleranzahl darf der bekannten nicht widersprechen", () => {
    const current = { ...emptyFields(), minPlayers: 4 };
    assert.deepEqual(applicableFills(current, { ...emptyFields(), maxPlayers: 2 }), {});
  });
  test("Anzeige", () => {
    assert.equal(formatFieldValue("modes", ["coop", "pvp"]), "Koop, Gegeneinander");
    assert.equal(formatFieldValue("isFree", true), "Kostenlos");
    assert.equal(formatFieldValue("sessionLength", "kurz"), "Kurze Runden (< 20 Min.)");
    assert.equal(formatFieldValue("maxPlayers", null), "–");
  });
});

describe("Abgleich mit anderen Schreibweisen", () => {
  const cs = { name: "Counter-Strike 2", nameKey: "counterstrike2", aliases: ["CS2", "CS 2"] };
  test("Name und Aliase passen exakt, fuzzy nur auf Wunsch", () => {
    assert.ok(matchesGameName(cs, "counter strike 2"));
    assert.ok(matchesGameName(cs, "cs2"));
    assert.ok(!matchesGameName(cs, "Counter-Strike"));
    assert.ok(matchesGameName(cs, "Counter-Strike", true)); // grob ähnlich (wie bisher bei Events)
    assert.ok(!matchesGameName(cs, null, true));
  });
  test("sanitizeAliases: trimmen, Dubletten und eigener Name raus, Komma-Text erlaubt", () => {
    assert.deepEqual(sanitizeAliases(" CS2 , cs 2, Counter Strike 2,,  CSGO2 ", "Counter-Strike 2"), ["CS2", "CSGO2"]);
    assert.deepEqual(sanitizeAliases(["A", 3, "a"], "B"), ["A"]);
    assert.equal(sanitizeAliases(Array.from({ length: 20 }, (_, i) => `Alias ${i}`), "X").length, 10);
  });
});
