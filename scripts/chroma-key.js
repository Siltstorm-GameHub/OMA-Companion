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

async function chromaKey(inputPath, outputPath, keyColor = [255, 0, 255], innerThreshold = 55, outerThreshold = 140) {
  const { data, info } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const [kr, kg, kb] = keyColor; // Magenta: kr=255, kg=0, kb=255 — der "Spill"-Kanal ist Grün.

  for (let i = 0; i < data.length; i += channels) {
    let r = data[i], g = data[i + 1], b = data[i + 2];
    const dist = Math.sqrt((r - kr) ** 2 + (g - kg) ** 2 + (b - kb) ** 2);
    let alpha;
    if (dist <= innerThreshold) alpha = 0;
    else if (dist >= outerThreshold) alpha = 255;
    else alpha = Math.round(((dist - innerThreshold) / (outerThreshold - innerThreshold)) * 255);
    data[i + 3] = Math.min(data[i + 3], alpha);

    // Entfärben (Despill): Halbtransparente Randpixel sind eine Mischung aus
    // Motiv- und Magenta-Farbe. Ohne Korrektur bleibt ein magentafarbener
    // Saum sichtbar, egal wie transparent der Pixel ist — Alpha allein
    // schneidet nur, färbt aber nicht um. Magenta = Rot+Blau ohne Grün, also
    // werden Rot/Blau so weit auf das Grün-Niveau gekappt, wie sie es
    // überschreiten (der klassische Grün-Spill-Fix, gespiegelt auf Magenta).
    if (alpha < 255) {
      const excess = Math.min(r, b) - g;
      if (excess > 0) {
        const pull = excess * (1 - alpha / 255);
        r = Math.max(0, r - pull);
        b = Math.max(0, b - pull);
        data[i] = Math.round(r);
        data[i + 2] = Math.round(b);
      }
    }
  }

  await sharp(data, { raw: { width, height, channels } })
    .trim()
    .png()
    .toFile(outputPath);
}

const [, , input, output, inner, outer] = process.argv;
chromaKey(input, output, [255, 0, 255], inner ? Number(inner) : undefined, outer ? Number(outer) : undefined)
  .then(async () => {
    const meta = await sharp(output).metadata();
    console.log(`OK: ${output} -> ${meta.width}x${meta.height}, alpha: ${meta.hasAlpha}`);
  })
  .catch(e => { console.error("FEHLER:", e.message); process.exit(1); });
