import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { checkPlayable, defaultCustomWorldDoc, docToWorld, sanitizeCustomWorldDoc, validateForSubmit, type CustomWorldDoc } from "./custom-world";
import { bindTalkStep, placeActor, placeBuilding, removeBuilding, setInteriorFromTemplate } from "./custom-world-edit";
import { createGame, drainEvents, enterBuilding } from "./engine";

function base(): CustomWorldDoc {
  let d = defaultCustomWorldDoc("outdoor");
  d = placeBuilding(d, { x: 3, y: 3, w: 5, roofRows: 3, roof: { k: 0, r: 0 }, wall: { k: 0, r: 1 }, doorDx: 2, windowDx: [], name: "Taverne" });
  d = setInteriorFromTemplate(d, 0, "taverne");
  return d;
}

describe("Quest-Schritte: NPC, Gebäude, Location", () => {
  test("Gespräch mit bestimmtem NPC: der NPC bekommt den Dialog automatisch", () => {
    let d = base();
    const r = placeActor(d, "npc", 12, 12);
    d = r.doc;
    const q = d.quests[0];
    d = { ...d, quests: [{ ...q, steps: [{ kind: "talk", text: "Sprich mit dem Auftraggeber." }, { kind: "talk", text: "Sprich mit Hans.", actor: r.id! }] }] };
    d = bindTalkStep(d, q.id, 1, r.id!);
    const npc = d.actors.find((a) => a.id === r.id)!;
    assert.ok(npc.talk.some((t) => t.step === 1 && t.advance));
    // idempotent
    assert.equal(bindTalkStep(d, q.id, 1, r.id!).actors.find((a) => a.id === r.id)!.talk.length, npc.talk.length);
    const s = sanitizeCustomWorldDoc(d);
    assert.ok(s.ok);
    if (s.ok) assert.equal(s.doc.quests[0].steps[1].actor, r.id);
  });

  test("Gebäude betreten: bleibt beim Speichern erhalten, Engine schaltet den Schritt weiter", () => {
    let d = base();
    const q = d.quests[0];
    d = { ...d, quests: [{ ...q, steps: [{ kind: "talk", text: "Angebot" }, { kind: "enter", text: "Betritt die Taverne.", building: 0 }] }] };
    const s = sanitizeCustomWorldDoc(d);
    assert.ok(s.ok);
    if (!s.ok) return;
    assert.equal(s.doc.quests[0].steps[1].kind, "enter");
    assert.equal(s.doc.quests[0].steps[1].building, 0);
    const world = docToWorld(s.doc);
    const g = createGame(world, { [world.quest.slug]: 1 });
    enterBuilding(g, 0);
    const ev = drainEvents(g);
    assert.deepEqual(ev.find((e) => e.type === "advance"), { type: "advance", quest: world.quest.slug, from: 1, enter: 0 });
    assert.ok(ev.some((e) => e.type === "complete"));
    // Noch nicht angenommen (Schritt 0): kein Fortschritt
    const g2 = createGame(world, {});
    enterBuilding(g2, 0);
    assert.equal(drainEvents(g2).length, 0);
  });

  test("Prüfung: erster Schritt kein Betreten, Gebäude braucht Innenraum", () => {
    const d = base();
    const q = d.quests[0];
    const bad = sanitizeCustomWorldDoc({ ...d, quests: [{ ...q, steps: [{ kind: "enter", text: "x", building: 0 }] }] });
    assert.ok(!bad.ok || bad.warnings.length > 0);
    const noInterior = { ...d, buildings: [{ ...d.buildings[0], interior: undefined }], quests: [{ ...q, steps: [{ kind: "talk", text: "a" }, { kind: "enter", text: "b", building: 0 }] }] } as CustomWorldDoc;
    const v = validateForSubmit(noInterior);
    assert.ok(!v.ok && v.errors.some((e) => e.includes("Innenraum")));
  });

  test("Gebäude löschen: Schritte zeigen weiter auf das richtige Gebäude", () => {
    let d = base();
    d = placeBuilding(d, { x: 12, y: 3, w: 5, roofRows: 3, roof: { k: 0, r: 0 }, wall: { k: 0, r: 1 }, doorDx: 2, windowDx: [], name: "Laden" });
    d = setInteriorFromTemplate(d, 1, "laden");
    const q = d.quests[0];
    d = { ...d, quests: [{ ...q, steps: [{ kind: "talk", text: "a" }, { kind: "enter", text: "b", building: 1 }] }] };
    const gone0 = removeBuilding(d, 0);
    assert.equal(gone0.quests[0].steps[1].building, 0); // Laden rückt auf Index 0
    const goneLaden = removeBuilding(d, 1);
    assert.equal(goneLaden.quests[0].steps[1].building, undefined);
  });

  test("Ziel-Schritt (Kampf/Zähmen): braucht keinen Dialog, Monster wird geprüft, erster Schritt bleibt ein Gespräch", () => {
    const d = base();
    const q = d.quests[0];
    const s = sanitizeCustomWorldDoc({ ...d, quests: [{ ...q, steps: [{ kind: "talk", text: "a" }, { kind: "goal", text: "Besiege 3 Elite-Wölfe.", objectiveType: "MONSTER_SLAIN", targetRef: "wolf", tier: "elite", targetCount: 3 }] }] });
    assert.ok(s.ok);
    if (!s.ok) return;
    const goal = s.doc.quests[0].steps[1];
    assert.equal(goal.kind, "goal");
    assert.equal(goal.objectiveType, "MONSTER_SLAIN");
    assert.equal(goal.targetRef, "wolf");
    assert.equal(goal.tier, "elite");
    assert.equal(goal.targetCount, 3);
    assert.equal(checkPlayable(s.doc).length, 0); // kein Dialog nötig für den Ziel-Schritt

    const badMonster = sanitizeCustomWorldDoc({ ...d, quests: [{ ...q, steps: [{ kind: "talk", text: "a" }, { kind: "goal", text: "b", objectiveType: "MONSTER_SLAIN", targetRef: "quatsch" }] }] });
    assert.ok(badMonster.ok);
    if (badMonster.ok) { assert.ok(badMonster.warnings.length > 0); assert.equal(badMonster.doc.quests[0].steps[1].targetRef, undefined); }

    const firstStepGoal = sanitizeCustomWorldDoc({ ...d, quests: [{ ...q, steps: [{ kind: "goal", text: "a", objectiveType: "MONSTER_SLAIN" }] }] });
    assert.ok(!firstStepGoal.ok || firstStepGoal.warnings.length > 0);
  });

  test("Questreihe, Teil-Nummer und Voraussetzung bleiben beim Speichern erhalten", () => {
    const d = base();
    const q = d.quests[0];
    const s = sanitizeCustomWorldDoc({ ...d, quests: [{ ...q, questline: "Die Asche-Chroniken", part: 2, requires: "welt-hafenstadt" }] });
    assert.ok(s.ok);
    if (!s.ok) return;
    assert.equal(s.doc.quests[0].questline, "Die Asche-Chroniken");
    assert.equal(s.doc.quests[0].part, 2);
    assert.equal(s.doc.quests[0].requires, "welt-hafenstadt");
    // ohne Angabe bleiben die Felder weg (keine Hauptstory-Verwechslung)
    const plain = sanitizeCustomWorldDoc(d);
    assert.ok(plain.ok);
    if (plain.ok) assert.equal(plain.doc.quests[0].questline, undefined);
  });
});
