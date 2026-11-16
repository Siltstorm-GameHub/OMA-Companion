import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { ADMIN_NAV, EMPTY_COUNTS, activeAdminChild, activeAdminItem, itemCount, searchAdminNav, visibleAdminNav } from "./admin-nav";

const keys = (role: string) => visibleAdminNav(role).flatMap((g) => g.items.map((i) => i.key));
const items = Object.fromEntries(ADMIN_NAV.flatMap((g) => g.items).map((i) => [i.key, i]));

describe("Admin-Menü", () => {
  test("Mitglieder sehen den Admin-Bereich nicht (Event-Verwaltung liegt unter /events/verwalten)", () => {
    assert.deepEqual(keys("user"), []);
  });

  test("Moderatoren sehen Community-Jobs, aber keine Admin-Einstellungen", () => {
    const k = keys("moderator");
    assert.ok(k.includes("jobs"));
    assert.ok(k.includes("limits"));
    assert.ok(!k.includes("users"));
    assert.ok(!k.includes("shop"));
  });

  test("Admins sehen alles, jeder Punkt genau einmal; Einstellungen stehen unten", () => {
    const all = ADMIN_NAV.flatMap((g) => g.items.map((i) => i.key));
    assert.deepEqual(keys("admin"), all);
    assert.equal(new Set(all).size, all.length);
    assert.equal(ADMIN_NAV[ADMIN_NAV.length - 1].key, "settings");
    assert.equal(items.events.href, "/events/verwalten");
  });

  test("Aktiver Punkt: längster passender Pfad, Übersicht nur exakt", () => {
    const g = visibleAdminNav("admin");
    assert.equal(activeAdminItem(g, "/admin")?.key, "overview");
    assert.equal(activeAdminItem(g, "/admin/community-jobs/moderation")?.key, "jobs");
    assert.equal(activeAdminItem(g, "/admin/partners")?.key, "partners");
    assert.equal(activeAdminItem(g, "/admin/sharks"), null);
  });

  test("Unterseiten der Community-Jobs", () => {
    assert.equal(activeAdminChild(items.jobs, "/admin/community-jobs")?.label, "Verwaltung");
    assert.equal(activeAdminChild(items.jobs, "/admin/community-jobs/auszahlungen")?.label, "Auszahlungen");
    assert.equal(activeAdminChild(items.squads, "/admin/squads"), null);
  });

  test("Zähler je Punkt, Übersicht summiert", () => {
    const counts = { ...EMPTY_COUNTS, eventActions: 2, eventApprovals: 1, gameSuggestions: 3 };
    assert.equal(itemCount(items.events, counts), 3);
    assert.equal(itemCount(items.games, counts), 3);
    assert.equal(itemCount(items.overview, counts), 6);
    assert.equal(itemCount(items.squads, counts), 0);
  });

  test("Schnellsuche über Namen und Suchbegriffe, Umlaute egal", () => {
    const g = visibleAdminNav("admin");
    assert.deepEqual(searchAdminNav(g, "glucksrad").map((i) => i.key), ["shop"]);
    assert.deepEqual(searchAdminNav(g, "minigames").map((i) => i.key), ["blocks"]);
    assert.ok(searchAdminNav(g, "umfrage").some((i) => i.key === "messages"));
    assert.ok(searchAdminNav(g, "twitch").some((i) => i.key === "partners"));
    assert.deepEqual(searchAdminNav(g, "  "), []);
  });
});
