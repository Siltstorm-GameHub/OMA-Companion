import { test } from "node:test";
import assert from "node:assert/strict";
import { actionForKey, bindKey, defaultKeyBindings, normalizeKeyBindings, unbindKey, MAX_KEYS_PER_ACTION } from "./settings";

test("Taste neu belegen entfernt sie bei der alten Aktion", () => {
  const { bindings, takenFrom } = bindKey(defaultKeyBindings(), "hard", "ArrowUp");
  assert.equal(takenFrom, "cw");
  assert.deepEqual(bindings.cw, ["KeyX"]);
  assert.deepEqual(bindings.hard, ["Space", "ArrowUp"]);
  assert.equal(actionForKey("ArrowUp", bindings), "hard");
});

test("Höchstens MAX_KEYS_PER_ACTION Tasten, älteste fällt raus", () => {
  const { bindings } = bindKey(defaultKeyBindings(), "ccw", "KeyQ");
  assert.equal(bindings.ccw.length, MAX_KEYS_PER_ACTION);
  assert.deepEqual(bindings.ccw, ["KeyY", "ControlLeft", "KeyQ"]);
});

test("Entfernen und gespeicherte Werte bereinigen", () => {
  const b = unbindKey(defaultKeyBindings(), "pause", "KeyP");
  assert.deepEqual(b.pause, ["Escape"]);
  const n = normalizeKeyBindings({ left: ["KeyA", "KeyA", 5, "Tab"], right: ["KeyA"], hard: "kaputt" });
  assert.deepEqual(n.left, ["KeyA"]);
  assert.deepEqual(n.right, []);
  assert.deepEqual(n.hard, ["Space"]);
  assert.deepEqual(n.r180, []); // Standard-A ist schon bei "Links" vergeben
});
