const sharp = require("sharp");

async function build(inputPath, outputPath, brightness, saturation) {
  const darkened = await sharp(inputPath).modulate({ brightness, saturation }).toBuffer();
  const meta = await sharp(darkened).metadata();
  const { width, height } = meta;
  const mirrored = await sharp(darkened).flop().toBuffer();
  await sharp({ create: { width: width * 2, height, channels: 3, background: { r: 0, g: 0, b: 0 } } })
    .composite([{ input: darkened, left: 0, top: 0 }, { input: mirrored, left: width, top: 0 }])
    .png().toFile(outputPath);
  const outMeta = await sharp(outputPath).metadata();
  console.log(`OK: ${outputPath} -> ${outMeta.width}x${outMeta.height}`);
}
const [, , input, output, brightness, saturation] = process.argv;
build(input, output, Number(brightness), Number(saturation)).catch(e => { console.error(e.message); process.exit(1); });
