/**
 * Verarbeitet ein flach beleuchtetes Canva-Texturfoto zu einer nahtlos
 * kachelbaren, an die dunkle Zimmer-Stimmung angepassten Wand-/Bodentextur.
 * Siehe Kommentar in RoomStage.tsx (room-*-photo Patterns) für den Kontext.
 *
 * Nutzung: node scripts/build-surface-texture.js <input.png> <output.png> <r> <g> <b> [brightness] [saturation]
 */
const sharp = require("sharp");

async function build(inputPath, outputPath, r, g, b, brightness = 0.4, saturation = 1.1) {
  const tinted = await sharp(inputPath)
    .modulate({ brightness, saturation })
    .tint({ r, g, b })
    .toBuffer();

  const meta = await sharp(tinted).metadata();
  const { width, height } = meta;

  const mirrored = await sharp(tinted).flop().toBuffer();

  await sharp({
    create: { width: width * 2, height, channels: 3, background: { r: 0, g: 0, b: 0 } },
  })
    .composite([
      { input: tinted, left: 0, top: 0 },
      { input: mirrored, left: width, top: 0 },
    ])
    .png()
    .toFile(outputPath);

  const outMeta = await sharp(outputPath).metadata();
  console.log(`OK: ${outputPath} -> ${outMeta.width}x${outMeta.height}`);
}

const [, , input, output, r, g, b, brightness, saturation] = process.argv;
build(input, output, Number(r), Number(g), Number(b),
  brightness ? Number(brightness) : undefined, saturation ? Number(saturation) : undefined)
  .catch(e => { console.error("FEHLER:", e.message); process.exit(1); });
