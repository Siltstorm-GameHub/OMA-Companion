import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { svgToArt } from "./art-import";
import { ART_SLOTS, ART_VIEWBOX } from "./art";
import { renderArt } from "./parts";

const FIGUR = ART_VIEWBOX.figur;

describe("Zeichnungen für Helden-Teile übernehmen", () => {
  test("Inkscape-Datei: style wird zu Attributen, Beiwerk fällt weg, Farbslots werden Platzhalter", () => {
    const svg = `<?xml version="1.0"?>
      <!-- Erstellt mit Inkscape -->
      <svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="x" viewBox="0 0 220 240" width="220">
        <metadata>egal</metadata>
        <sodipodi:namedview id="nv" />
        <g id="layer1" inkscape:label="Ebene 1">
          <path id="p1" d="M68 86 Q66 40 110 38 Z" style="fill:#FF00FF;stroke:#1b1326;stroke-width:5" />
          <circle cx="110" cy="26" r="10" fill="var(--light)" stroke="#1b1326" stroke-width="3.5" />
          <rect x="1" y="2" width="3" height="4" fill="#0f0" />
        </g>
      </svg>`;
    const r = svgToArt(svg, FIGUR);
    assert.deepEqual(r.errors, []);
    assert.deepEqual(r.nodes, [
      [
        "g",
        {},
        [
          ["path", { d: "M68 86 Q66 40 110 38 Z", fill: "$main", stroke: "#1b1326", strokeWidth: 5 }, []],
          ["circle", { cx: 110, cy: 26, r: 10, fill: "$light", stroke: "#1b1326", strokeWidth: 3.5 }, []],
          ["rect", { x: 1, y: 2, width: 3, height: 4, fill: "$hair" }, []],
        ],
      ],
    ]);
  });

  test("lehnt Bilder, Schrift, Verläufe, falsche Zeichenfläche und unbekannte Slots ab", () => {
    const bad = svgToArt(
      `<svg viewBox="0 0 200 200"><image href="a.png"/><text>Hi</text><path d="M0 0" fill="url(#g)"/><path d="M0 0" fill="var(--gold)"/></svg>`,
      FIGUR
    );
    assert.equal(bad.errors.length, 5, bad.errors.join("\n"));
    assert.ok(bad.errors.some((e) => e.includes("viewBox")));
    assert.ok(bad.errors.some((e) => e.includes("Schrift")));
    assert.ok(svgToArt(`<svg viewBox="0 0 220 240"><g></svg>`, FIGUR).errors[0].includes("kein gültiges SVG"));
    assert.ok(svgToArt(`<svg viewBox="0 0 220 240"></svg>`, FIGUR).errors[0].includes("leer"));
  });

  test("Zeichnung wird mit der Palette des Looks gefärbt", () => {
    const { nodes } = svgToArt(`<svg viewBox="0 0 220 240"><path d="M0 0" fill="var(--main)" stroke="#1b1326"/></svg>`, FIGUR);
    const html = renderToStaticMarkup(createElement("svg", null, ...nodes.map((n, i) => renderArt(n, { main: "#14b8a6" }, i))));
    assert.equal(html, '<svg><path d="M0 0" fill="#14b8a6" stroke="#1b1326"></path></svg>');
  });

  test("jedes Teil hat einen eindeutigen Dateinamen", () => {
    const keys = ART_SLOTS.map((s) => s.key);
    assert.equal(new Set(keys).size, keys.length);
    assert.ok(keys.includes("frisur-locken-vorn") && keys.includes("waffe-dd-klinge") && keys.includes("hintergrund-vulkan"));
  });
});
