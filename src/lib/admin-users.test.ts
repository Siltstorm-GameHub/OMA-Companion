import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { filterCounts, relativeSince, visibleUsers, type AdminUserRow } from "./admin-users";

const NOW = new Date("2026-11-16T12:00:00Z").getTime();
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString();
const u = (id: string, o: Partial<AdminUserRow> = {}): AdminUserRow => ({
  id, name: null, username: id, email: null, image: null, role: "user", points: 0, rankPoints: 0,
  discordId: null, hasLogin: true, createdAt: daysAgo(400), lastLoginAt: daysAgo(1), leftServerAt: null, eventCount: 0, ...o,
});

const users = [
  u("Anna", { role: "admin", lastLoginAt: daysAgo(0.1), points: 1240, eventCount: 41 }),
  u("Dennis", { role: "moderator", lastLoginAt: daysAgo(1), points: 860, discordId: "284100" }),
  u("Hanna", { lastLoginAt: daysAgo(35), points: 95, email: "hanna@example.org" }),
  u("Jörg", { hasLogin: false, lastLoginAt: null }),
  u("Gero", { leftServerAt: daysAgo(40), lastLoginAt: daysAgo(50) }),
];

describe("Admin Nutzer: Filter, Suche, Sortierung", () => {
  test("Zahlen je Filter", () => {
    assert.deepEqual(filterCounts(users, NOW), { all: 5, team: 2, active: 2, never: 1, left: 1 });
  });

  test("Suche nach Name ohne Akzente, E-Mail und Discord-ID", () => {
    const q = (query: string) => visibleUsers(users, { query, filter: "all", sort: "name", now: NOW }).map(x => x.id);
    assert.deepEqual(q("jorg"), ["Jörg"]);
    assert.deepEqual(q("example"), ["Hanna"]);
    assert.deepEqual(q("2841"), ["Dennis"]);
  });

  test("Sortierung: zuletzt aktiv, nie eingeloggt am Ende", () => {
    const ids = visibleUsers(users, { query: "", filter: "all", sort: "recent", now: NOW }).map(x => x.id);
    assert.deepEqual(ids, ["Anna", "Dennis", "Hanna", "Gero", "Jörg"]);
    assert.deepEqual(visibleUsers(users, { query: "", filter: "team", sort: "coins", now: NOW }).map(x => x.id), ["Anna", "Dennis"]);
  });

  test("Relative Zeit", () => {
    assert.equal(relativeSince(null, NOW), "nie");
    assert.equal(relativeSince(daysAgo(0.1), NOW), "vor 2 Std");
    assert.equal(relativeSince(daysAgo(1), NOW), "gestern");
    assert.equal(relativeSince(daysAgo(35), NOW), "vor 5 Wochen");
  });
});
