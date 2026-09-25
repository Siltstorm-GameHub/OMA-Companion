import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { TE_CATALOG, TE_FRAME, defaultTeConfig, randomTeConfig, resolveTeLayers, sanitizeTeConfig, attackAnimFor } from "./index";

const PUBLIC = path.join(process.cwd(), "public");
const exists = (src: string) => fs.existsSync(path.join(PUBLIC, src));

describe("Time-Elements-Assets", () => {
  test("jedes Teil existiert für JEDEN Hautton (kein Teil verschwindet bei einem anderen Hautton)", () => {
    const missing: string[] = [];
    for (let skin = 0; skin < TE_CATALOG.skinTones.length; skin++) {
      for (const cat of TE_CATALOG.categories) {
        for (const item of cat.items) {
          for (const variant of item.variants) {
            const cfg = { v: 1 as const, skin, layers: { head: TE_CATALOG.categories.find((c) => c.id === "head")!.items[0].variants[0], [cat.id]: variant } };
            for (const layer of resolveTeLayers(cfg)) if (!exists(layer.src)) missing.push(layer.src);
          }
        }
      }
    }
    assert.deepEqual([...new Set(missing)], [], `Fehlende Dateien: ${[...new Set(missing)].slice(0, 5).join(", ")}`);
  });

  test("Basisteile (Schatten, Körper) gibt es für alle Hauttöne", () => {
    for (let skin = 0; skin < TE_CATALOG.skinTones.length; skin++) {
      for (const layer of resolveTeLayers({ v: 1, skin, layers: { head: TE_CATALOG.categories.find((c) => c.id === "head")!.items[0].variants[0] } })) {
        assert.ok(exists(layer.src), layer.src);
      }
    }
  });

  test("jede Sheet-Datei hat die erwartete Größe (23 Bilder × 4 Richtungen à 48 px)", async () => {
    const sharp = (await import("sharp")).default;
    const sample = ["shadow/shadow.png", "top/top0.png", "bottom/bottom0.png", "top/top0.t3.png"];
    for (const f of sample) {
      const meta = await sharp(path.join(PUBLIC, "te", "char", f)).metadata();
      assert.equal(meta.width, TE_FRAME * TE_CATALOG.frames, f);
      assert.equal(meta.height, TE_FRAME * 4, f);
    }
  });

  test("Standard- und Zufallsfiguren sind gültig und vollständig auflösbar", () => {
    assert.ok(sanitizeTeConfig(defaultTeConfig()));
    for (let i = 0; i < 50; i++) {
      const cfg = randomTeConfig();
      assert.ok(sanitizeTeConfig(cfg), "Zufallsfigur gültig");
      for (const layer of resolveTeLayers(cfg)) assert.ok(exists(layer.src), layer.src);
    }
  });

  test("Angriffsanimation: Bogen → Bogen, Support → Zauber, sonst Angriff", () => {
    const bow = TE_CATALOG.categories.find((c) => c.id === "weapon")!.items.find((i) => i.id.startsWith("bow"))!.variants[0];
    assert.equal(attackAnimFor({ v: 1, skin: 0, layers: { weapon: bow } }, "TANK"), "bow");
    assert.equal(attackAnimFor(defaultTeConfig(), "SUPPORT"), "cast");
    assert.equal(attackAnimFor(defaultTeConfig(), "TANK"), "attack");
  });

  test("Rücken und Hinterhaar: hinter dem Körper von vorn/Seite, darüber bei Blick nach hinten", () => {
    const first = (id: string) => TE_CATALOG.categories.find((c) => c.id === id)!.items[0].variants[0];
    const cfg = { v: 1 as const, skin: 0, layers: { head: first("head"), top: first("top"), backextra: first("backextra"), backhair: first("backhair") } };
    const order = (dir: "down" | "left" | "right" | "up") => resolveTeLayers(cfg, dir).map((l) => l.src.split("/")[3]);
    for (const dir of ["down", "left", "right"] as const) {
      const o = order(dir);
      assert.ok(o.indexOf("backextra") < o.indexOf("top") && o.indexOf("backhair") < o.indexOf("top"), `${dir}: hinter dem Körper`);
    }
    const up = order("up");
    assert.ok(up.indexOf("backextra") > up.lastIndexOf("top") && up.indexOf("backhair") > up.lastIndexOf("top"), "up: vor dem Körper");
    assert.ok(up.indexOf("backhair") < up.indexOf("head"), "up: aber unter dem Kopf");
  });
});
