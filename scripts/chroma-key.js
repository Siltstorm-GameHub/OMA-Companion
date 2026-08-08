/**
 * Entfernt einen Chroma-Key-Hintergrund (Standard: Magenta #FF00FF) und
 * trimmt das Ergebnis auf den sichtbaren Inhalt.
 *
 * Grund: Canvas eigener "transparent_background"-Export-Schalter wird beim
 * generierten Design-Typ "logo" ignoriert — jeder Export kam mit fest
 * eingebranntem Studio-Hintergrund. Der Seitenhintergrund laesst sich aber
 * vor dem Export auf eine reine Flaechenfarbe umfaerben (recolor_element),
 * die sich danach zuverlaessig wegrechnen laesst.
 *
 * Nutzung: node scripts/chroma-key.js <input.png> <output.png> [innerThreshold] [outerThreshold]
 */
const sharp = require("sharp");

async function chromaKey(inputPath, outputPath, innerThreshold = 65, outerThreshold = 150) {
  const { data, info } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const KR = 255, KG = 0, KB = 255; // reines Magenta

  // EINE Kennzahl für Alpha UND Entfärben: der Euclidische Farbabstand zum
  // exakten Magenta-Ton, nicht nur "wie grün-arm ist der Pixel". Eine frühere
  // Fassung nutzte min(r,b)-g als Kennzahl ("Spill") — das erkennt zuverlässig
  // Magenta-Nähe, klassifiziert aber JEDE grün-arme Farbe mit, auch warme
  // Brauntöne (Kork, Holz) und Violett-Töne (Neon-Rückplatten, RGB-Akzente),
  // die im Katalog ständig vorkommen. Ergebnis: ein Kork-Brett wurde komplett
  // durchsichtig, eine violette Neon-Rückplatte verschwand. Der tatsächliche
  // 3D-Abstand zu (255,0,255) ist deutlich strenger — Braun und Violett liegen
  // weit genug von reinem Magenta entfernt, um nicht mitgenommen zu werden.
  for (let i = 0; i < data.length; i += channels) {
    let r = data[i], g = data[i + 1], b = data[i + 2];
    const dist = Math.sqrt((r - KR) ** 2 + (g - KG) ** 2 + (b - KB) ** 2);

    let t; // 0 = Motiv, 1 = reiner Hintergrund
    if (dist >= outerThreshold) t = 0;
    else if (dist <= innerThreshold) t = 1;
    else t = (outerThreshold - dist) / (outerThreshold - innerThreshold);

    const alpha = Math.round((1 - t) * 255);
    data[i + 3] = Math.min(data[i + 3], alpha);

    // Entfärben NICHT proportional zu t skaliert: ein Kantenpixel mit
    // niedrigem t (knapp jenseits der inneren Schwelle, fast deckend)
    // behält sonst einen sichtbaren Magenta-Stich, obwohl es schon als
    // Übergangspixel erkannt wurde — bei kleinem t war der Korrekturbetrag
    // (excess * t * 1.6) schlicht zu klein, um den Farbstich zu entfernen.
    // Jedes Pixel in der Übergangszone (t > 0) wird deshalb vollständig
    // entfärbt, unabhängig von seinem konkreten Alpha-Wert.
    if (t > 0) {
      const excess = Math.min(r, b) - g;
      if (excess > 0) {
        data[i]     = Math.max(0, Math.round(r - excess));
        data[i + 2] = Math.max(0, Math.round(b - excess));
      }
    }
  }

  await sharp(data, { raw: { width, height, channels } })
    .trim()
    .png()
    .toFile(outputPath);
}

const [, , input, output, inner, outer] = process.argv;
chromaKey(input, output, inner ? Number(inner) : undefined, outer ? Number(outer) : undefined)
  .then(async () => {
    const meta = await sharp(output).metadata();
    console.log(`OK: ${output} -> ${meta.width}x${meta.height}, alpha: ${meta.hasAlpha}`);
  })
  .catch(e => { console.error("FEHLER:", e.message); process.exit(1); });
