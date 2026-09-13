import sharp, { type OverlayOptions } from "sharp";
import { prisma } from "@/lib/prisma";

/**
 * Setzt eine Basis-Pose + ausgerüstete Accessoires serverseitig zu einem
 * flachen PNG zusammen -- das Gegenstück zur Live-CSS-Vorschau
 * (/heropaperdolltest, Admin-Slot-Dialog), für den
 * Fall, dass eine tatsächliche Bilddatei gebraucht wird (z.B. als
 * Card.imageUrl), nicht nur eine Browser-Darstellung.
 *
 * `equipment` bildet Slot-Kategorie (z.B. "weapon") auf eine HeroAccessory-ID
 * ab. Jedes Accessoire wird gemäß dem für diese Pose konfigurierten
 * HeroPoseSlot (Anker, Rotation, Skalierung) plaziert -- exakt dieselben drei
 * Werte, die auch die Live-Vorschau verwendet.
 */
export async function composeHeroImageBuffer(
  basePoseId: string,
  equipment: Record<string, string>,
): Promise<Buffer> {
  const basePose = await prisma.heroBasePose.findUnique({ where: { id: basePoseId } });
  if (!basePose) throw new Error("Basis-Pose nicht gefunden");

  const slots = await prisma.heroPoseSlot.findMany({ where: { basePoseId } });
  const accessoryIds = Object.values(equipment).filter(Boolean);
  const accessories = accessoryIds.length
    ? await prisma.heroAccessory.findMany({ where: { id: { in: accessoryIds } } })
    : [];

  const baseBuf = await fetchImageBuffer(basePose.imageUrl);
  const baseCanvas = await sharp(baseBuf).resize(basePose.width, basePose.height, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();

  const overlays: OverlayOptions[] = [];

  for (const [slotKey, accessoryId] of Object.entries(equipment)) {
    if (!accessoryId) continue;
    const poseSlot = slots.find(s => s.slot === slotKey);
    const accessory = accessories.find(a => a.id === accessoryId);
    if (!poseSlot || !accessory || accessory.slot !== slotKey) continue;

    const accBuf = await fetchImageBuffer(accessory.imageUrl);
    const placed = await placeAtAnchor(accBuf, {
      naturalWidth: accessory.width,
      naturalHeight: accessory.height,
      scale: poseSlot.scale,
      rotationDeg: poseSlot.rotation,
      anchorXPx: poseSlot.anchorX * basePose.width,
      anchorYPx: poseSlot.anchorY * basePose.height,
    });
    overlays.push(placed);
  }

  return sharp(baseCanvas).composite(overlays).png().toBuffer();
}

async function fetchImageBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Bild konnte nicht geladen werden: ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Skaliert ein Accessoire-Bild (Griff/Aufhängepunkt am linken Bildrand,
 * vertikal zentriert -- die etablierte Zeichenkonvention) und dreht es um
 * GENAU diesen Griffpunkt, nicht um die Bildmitte -- entspricht
 * `transform-origin: 0% 50%` + `rotate()` in der Live-CSS-Vorschau. sharp
 * kann nur um die Bildmitte rotieren, daher der Umweg: das Bild wird zuerst
 * so gepolstert, dass der Griffpunkt exakt in der Mitte der gepolsterten
 * Leinwand landet -- danach bleibt er beim Rotieren fix, und lässt sich in
 * der neuen (größeren) Leinwand wiederfinden, um die finale Composite-
 * Position gegen den Ziel-Anker auf der Basis-Pose zu berechnen.
 */
async function placeAtAnchor(
  buf: Buffer,
  opts: { naturalWidth: number; naturalHeight: number; scale: number; rotationDeg: number; anchorXPx: number; anchorYPx: number },
): Promise<OverlayOptions> {
  const W = Math.max(1, Math.round(opts.naturalWidth * opts.scale));
  const H = Math.max(1, Math.round(opts.naturalHeight * opts.scale));
  const resized = await sharp(buf).resize(W, H).png().toBuffer();

  const rotation = ((opts.rotationDeg % 360) + 360) % 360;
  if (rotation === 0) {
    // Kein Umweg nötig: Griffpunkt liegt direkt bei lokal (0, H/2).
    return {
      input: resized,
      left: Math.round(opts.anchorXPx),
      top: Math.round(opts.anchorYPx - H / 2),
    };
  }

  // Auf 2W x H polstern (Original rechts anfügen), damit der Griffpunkt
  // (lokal x=0, y=H/2) exakt in der Mitte dieser Zwischen-Leinwand liegt.
  const padded = await sharp({ create: { width: W * 2, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: resized, left: W, top: 0 }])
    .png()
    .toBuffer();

  const rotated = await sharp(padded)
    .rotate(rotation, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const rotatedMeta = await sharp(rotated).metadata();
  const rw = rotatedMeta.width!, rh = rotatedMeta.height!;

  // Rotation um die Mitte lässt den Griffpunkt exakt in der Mitte der neuen
  // (größeren) Leinwand -- von dort aus gegen den Ziel-Anker positionieren.
  return {
    input: rotated,
    left: Math.round(opts.anchorXPx - rw / 2),
    top: Math.round(opts.anchorYPx - rh / 2),
  };
}
