// ============================================
// OMA Gems — gelieferte SVG-Zeichnungen prüfen und in Teile-Daten umwandeln (Phase 10e)
// ============================================
// Nimmt nur, was eine Helden-Zeichnung braucht: Grundformen, Pfade, Gruppen, Farben, Konturen,
// Transformationen. Alles, was beim Einbetten Ärger macht (Bilder, Schriften, Filter, Verläufe, Skripte,
// Links), wird abgelehnt — mit einer Meldung, die der Zeichner versteht. Was Zeichenprogramme
// nebenbei schreiben (Metadaten, Inkscape-/Illustrator-Attribute, ids), wird still verworfen.
// Rein, ohne Dateisystem — das Einlesen macht scripts/import-hero-art.ts.

import { COLOR_SLOTS, PLACEHOLDER_COLORS, type ArtNode, type ColorSlot } from "./art";

const SHAPES = new Set(["g", "path", "circle", "ellipse", "rect", "line", "polyline", "polygon"]);
/** Still übergangen: Beiwerk von Zeichenprogrammen. */
const IGNORED = new Set(["title", "desc", "metadata", "defs", "style", "sodipodi:namedview", "inkscape:grid"]);
/** Abgelehnt, mit Grund. */
const FORBIDDEN: Record<string, string> = {
  image: "eingebettete Bilder",
  text: "Schrift (bitte in Pfade umwandeln)",
  tspan: "Schrift (bitte in Pfade umwandeln)",
  filter: "Filter",
  lineargradient: "Verläufe (bitte flache Farben)",
  radialgradient: "Verläufe (bitte flache Farben)",
  pattern: "Muster",
  mask: "Masken",
  clippath: "Beschneidungspfade",
  use: "verknüpfte Elemente (bitte auflösen)",
  script: "Skripte",
  foreignobject: "fremde Inhalte",
  a: "Links",
};

/** Erlaubte Attribute → React-Schreibweise. */
const ATTRS: Record<string, string> = {
  d: "d",
  cx: "cx",
  cy: "cy",
  r: "r",
  rx: "rx",
  ry: "ry",
  x: "x",
  y: "y",
  width: "width",
  height: "height",
  x1: "x1",
  y1: "y1",
  x2: "x2",
  y2: "y2",
  points: "points",
  transform: "transform",
  fill: "fill",
  stroke: "stroke",
  opacity: "opacity",
  "fill-opacity": "fillOpacity",
  "stroke-opacity": "strokeOpacity",
  "stroke-width": "strokeWidth",
  "stroke-linecap": "strokeLinecap",
  "stroke-linejoin": "strokeLinejoin",
  "stroke-miterlimit": "strokeMiterlimit",
  "fill-rule": "fillRule",
  "clip-rule": "clipRule",
};
const COLOR_ATTRS = new Set(["fill", "stroke"]);

export interface ArtImportResult {
  nodes: ArtNode[];
  errors: string[];
  warnings: string[];
}

interface RawElement {
  tag: string;
  attrs: Record<string, string>;
  children: RawElement[];
}

/** Kleiner XML-Leser für SVG: Elemente und Attribute; Text, Kommentare, CDATA und Deklarationen
 *  werden übersprungen. */
function parseXml(src: string): RawElement {
  const root: RawElement = { tag: "#root", attrs: {}, children: [] };
  const stack = [root];
  const re = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\?[\s\S]*?\?>|<![^>]*>|<\/\s*([\w:.-]+)\s*>|<([\w:.-]+)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    if (m[1]) {
      if (stack.length > 1 && stack[stack.length - 1].tag === m[1]) stack.pop();
      else throw new Error(`Schließendes </${m[1]}> passt nicht.`);
      continue;
    }
    if (!m[2]) continue;
    const attrs: Record<string, string> = {};
    for (const a of m[3].matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) attrs[a[1]] = (a[2] ?? a[3]).replace(/&quot;/g, '"').replace(/&amp;/g, "&");
    const el: RawElement = { tag: m[2], attrs, children: [] };
    stack[stack.length - 1].children.push(el);
    if (!m[4]) stack.push(el);
  }
  if (stack.length > 1) throw new Error(`<${stack[stack.length - 1].tag}> wird nicht geschlossen.`);
  return root;
}

/** Farbe → Palette-Platzhalter ("$main"), feste Farbe oder Fehler. */
function color(value: string, errors: string[]): string {
  const v = value.trim().toLowerCase();
  const slot = /^var\(--([a-z]+)\)$/i.exec(value.trim());
  if (slot) {
    const name = COLOR_SLOTS.find((s) => s.toLowerCase() === slot[1].toLowerCase());
    if (!name) errors.push(`Unbekannter Farbslot ${value} — erlaubt: ${COLOR_SLOTS.join(", ")}.`);
    return name ? `$${name}` : "none";
  }
  if (v.startsWith("url(")) {
    errors.push(`Farbe ${value} verweist auf Verlauf oder Muster — bitte flache Farben.`);
    return "none";
  }
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(v);
  const hex = short ? `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}` : v;
  const placeholder: ColorSlot | undefined = PLACEHOLDER_COLORS[hex];
  return placeholder ? `$${placeholder}` : value.trim();
}

function convert(el: RawElement, path: string, out: ArtImportResult): ArtNode | null {
  const tag = el.tag.toLowerCase();
  if (IGNORED.has(tag) || tag.includes(":")) return null;
  if (FORBIDDEN[tag]) {
    out.errors.push(`${path}<${el.tag}>: ${FORBIDDEN[tag]} sind nicht erlaubt.`);
    return null;
  }
  if (!SHAPES.has(tag)) {
    out.warnings.push(`${path}<${el.tag}> unbekannt — übergangen.`);
    return null;
  }
  // style="fill:#fff;stroke-width:5" wie Attribute behandeln (Inkscape, Illustrator).
  const merged: Record<string, string> = { ...el.attrs };
  for (const decl of (el.attrs.style ?? "").split(";")) {
    const [k, ...rest] = decl.split(":");
    if (k?.trim() && rest.length) merged[k.trim()] = rest.join(":").trim();
  }
  const attrs: Record<string, string | number> = {};
  for (const [name, raw] of Object.entries(merged)) {
    const reactName = ATTRS[name];
    if (!reactName) continue; // id, class, style, data-*, Programm-Attribute
    if (/javascript:|url\(\s*['"]?(?!#)/i.test(raw)) {
      out.errors.push(`${path}<${el.tag}> ${name}: unzulässiger Wert.`);
      continue;
    }
    const value = COLOR_ATTRS.has(name) ? color(raw, out.errors) : raw;
    attrs[reactName] = /^-?\d+(\.\d+)?$/.test(value) ? Number(value) : value;
  }
  const children = el.children.map((c, i) => convert(c, `${path}${el.tag}[${i}] › `, out)).filter((c): c is ArtNode => c !== null);
  return [tag, attrs, children];
}

/** Prüft eine gelieferte SVG-Datei gegen die erwartete Zeichenfläche und wandelt sie um. */
export function svgToArt(svg: string, expectedViewBox: string): ArtImportResult {
  const out: ArtImportResult = { nodes: [], errors: [], warnings: [] };
  let root: RawElement;
  try {
    root = parseXml(svg);
  } catch (e) {
    out.errors.push(`Datei ist kein gültiges SVG: ${(e as Error).message}`);
    return out;
  }
  const svgEl = root.children.find((c) => c.tag.toLowerCase() === "svg");
  if (!svgEl) {
    out.errors.push("Kein <svg>-Element gefunden.");
    return out;
  }
  const norm = (v: string) => v.trim().split(/[\s,]+/).map(Number).join(" ");
  if (!svgEl.attrs.viewBox) out.errors.push(`viewBox fehlt — erwartet "${expectedViewBox}".`);
  else if (norm(svgEl.attrs.viewBox) !== norm(expectedViewBox)) {
    out.errors.push(`viewBox ist "${svgEl.attrs.viewBox}", erwartet "${expectedViewBox}" (Gerüst siehe Vorgabe).`);
  }
  out.nodes = svgEl.children.map((c, i) => convert(c, `[${i}] `, out)).filter((c): c is ArtNode => c !== null);
  if (out.nodes.length === 0 && out.errors.length === 0) out.errors.push("Die Zeichnung ist leer.");
  return out;
}
