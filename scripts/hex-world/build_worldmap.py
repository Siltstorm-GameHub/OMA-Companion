"""Baut eine Hex-Weltkarte aus den Assets in ../Hex Map. Aufruf: python build_worldmap.py [seed] [scale]"""
import sys, os, glob, random
import numpy as np
from PIL import Image

SEED = int(sys.argv[1]) if len(sys.argv) > 1 else 7
SCALE = float(sys.argv[2]) if len(sys.argv) > 2 else 0.5
COLS, ROWS = 56, 40
HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.environ.get("HEX_ASSETS") or os.path.join(HERE, "..", "Hex Map")
rng = random.Random(SEED)
nrng = np.random.default_rng(SEED)

# ---------- Tile-Bibliothek ----------
_cache = {}
def variants(folder, prefix):
    """alle Dateien <prefix>NN.png (nur Ziffern hinter dem Prefix)"""
    out = []
    for f in sorted(glob.glob(os.path.join(ASSETS, folder, prefix + "*.png"))):
        stem = os.path.basename(f)[:-4]
        if stem[len(prefix):].isdigit():
            out.append(f)
    if not out:
        raise SystemExit(f"Keine Tiles fuer {folder}/{prefix}")
    return out

def load(path):
    if path not in _cache:
        im = Image.open(path).convert("RGBA")
        if SCALE != 1:
            im = im.resize((round(im.width * SCALE), round(im.height * SCALE)), Image.LANCZOS)
        _cache[path] = im
    return _cache[path]

def pick(folder, prefix):
    return rng.choice(variants(folder, prefix))

# ---------- Noise ----------
def fbm(shape, base, octaves=5):
    h, w = shape
    total = np.zeros(shape)
    amp, norm = 1.0, 0.0
    for o in range(octaves):
        n = base * 2 ** o
        g = nrng.random((n + 2, n + 2))
        ys = np.linspace(0, n, h, endpoint=False)
        xs = np.linspace(0, n, w, endpoint=False)
        y0, x0 = ys.astype(int), xs.astype(int)
        fy, fx = ys - y0, xs - x0
        fy, fx = fy * fy * (3 - 2 * fy), fx * fx * (3 - 2 * fx)
        a = g[np.ix_(y0, x0)]; b = g[np.ix_(y0, x0 + 1)]
        c = g[np.ix_(y0 + 1, x0)]; d = g[np.ix_(y0 + 1, x0 + 1)]
        top = a + (b - a) * fx[None, :]
        bot = c + (d - c) * fx[None, :]
        total += (top + (bot - top) * fy[:, None]) * amp
        norm += amp
        amp *= 0.5
    return total / norm

shape = (ROWS, COLS)
yy, xx = np.mgrid[0:ROWS, 0:COLS]
edge = np.minimum.reduce([xx, COLS - 1 - xx, yy, ROWS - 1 - yy]).astype(float)
edge = np.clip(edge / 5.0, 0, 1)
elev = fbm(shape, 3, 5) * 0.8 + fbm(shape, 6, 3) * 0.2
cd = np.hypot((xx - COLS / 2) / (COLS / 2), (yy - ROWS / 2) / (ROWS / 2))
elev = (elev + 0.45 * (1 - np.clip(cd, 0, 1))) * (0.2 + 0.8 * edge)
sea = np.quantile(elev, 0.52)
detail = fbm(shape, 6, 3)
moist = fbm(shape, 3, 4)
lat = yy / (ROWS - 1)                                   # 0 = Norden, 1 = Sueden
temp = lat + (fbm(shape, 3, 3) - 0.5) * 0.3            # 1 = heiss (Sueden)

land = elev > sea
h = np.where(land, (elev - sea) / (elev.max() - sea), 0)

# Vulkanregion im Suedosten
vcy, vcx = ROWS * 0.72, COLS * 0.78
vdist = np.hypot((yy - vcy) * 1.3, xx - vcx)
volcanic = land & (vdist < 5.5)

# ---------- Tile-Auswahl ----------
def choose(r, c):
    if not land[r, c]:
        t = temp[r, c]
        roll = rng.random()
        if t < 0.18 and roll < 0.55:
            return pick("Tiles", "hexOceanIceBergs")
        if roll < 0.006: return pick("Tiles", "hexOceanWhirlpool")
        if roll < 0.012: return pick("Tiles", "hexOceanShipWreck")
        return pick("Tiles", "hexOceanCalm")
    t, hh, m = temp[r, c], h[r, c], moist[r, c]
    special = rng.random()
    if volcanic[r, c]:
        d = vdist[r, c]
        if d < 1.2: return pick("Hexes", "hexVolcanoActive")
        if d < 2.4: return pick("Hexes", rng.choice(["hexLavaFieldActive", "hexLavaField", "hexLavaSea"]))
        if d < 3.6: return pick("Hexes", rng.choice(["hexLavaField", "hexFumarolePlains", "hexAshPlains"]))
        return pick("Hexes", rng.choice(["hexAshPlains", "hexForestBurnedAsh", "hexForestBurnedDirt", "hexVolcanoDormant"]))
    if hh < 0.10 and m > 0.55 and edge[r, c] > 0.6 and t > 0.25:
        return pick("Tiles", "hexLake")
    ridge = hh * 0.6 + detail[r, c] * 0.55
    mountain = ridge > 0.72
    hills = ridge > 0.56
    if t < 0.30:  # Schnee
        if mountain:
            return pick("Tiles", "hexMountainSnowCave" if special < 0.05 else "hexMountainSnow")
        if hills:
            return pick("Tiles", "hexHillsColdSnowCoveredCave" if special < 0.04 else "hexHillsColdSnowCovered")
        if m > 0.5:
            return pick("Tiles", "hexForestPineSnowCoveredLoggingCamp" if special < 0.03 else "hexForestPineSnowCovered")
        if special < 0.02: return pick("Tiles", "hexSnowFieldGiantSkeleton")
        if special < 0.04: return pick("Tiles", "hexSnowFieldIcePalace")
        return pick("Tiles", rng.choice(["hexSnowField", "hexPlainsColdSnowCovered"]))
    if t < 0.42:  # Uebergang Schnee <-> kalt
        if mountain: return pick("Tiles", "hexMountainSnow")
        if hills: return pick("Tiles", "hexHillsColdSnowTransition")
        if m > 0.5: return pick("Tiles", "hexForestPineSnowTransition")
        return pick("Tiles", "hexPlainsColdSnowTransitionPond" if special < 0.05 else "hexPlainsColdSnowTransition")
    if t < 0.62:  # kalt
        if mountain:
            return pick("Tiles", "hexMountainSnowCave" if special < 0.05 else "hexMountainSnow")
        if hills:
            return pick("Tiles", "hexHillsColdCave" if special < 0.04 else "hexHillsCold")
        if m > 0.5:
            if special < 0.03: return pick("Tiles", "hexForestPineLoggingCamp")
            if special < 0.06: return pick("Tiles", "hexForestPineClearing")
            return pick("Tiles", "hexForestPine")
        if special < 0.03: return pick("Tiles", "hexPlainsColdRuin")
        if special < 0.06: return pick("Tiles", "hexPlainsColdPond")
        return pick("Tiles", rng.choice(["hexPlainsCold", "hexPlainsCold", "hexDirtCold"]))
    red = xx[r, c] < COLS * 0.5   # Wueste: rot im Westen, gelb im Osten
    if t < 0.72:
        if mountain: return pick("Hexes", "hexDesertRedMountains" if red else "hexDesertYellowMesas")
        if hills: return pick("Hexes", "hexDesertRedHills" if red else "hexDesertYellowHills")
        if m > 0.55: return pick("Hexes", "hexDesertRedForest" if red else "hexDesertYellowCactiForest")
        return pick("Hexes", "hexDesertRedGrass" if red else "hexDesertYellowDirt")
    if mountain:
        if red: return pick("Hexes", "hexDesertRedMountainsCave" if special < 0.06 else "hexDesertRedMountains")
        return pick("Hexes", rng.choice(["hexDesertYellowMesasCave", "hexDesertYellowMesas", "hexDesertYellowMesaLarge"]))
    if hills:
        if special < 0.05: return pick("Hexes", "hexDesertRedHillsOasis" if red else "hexDesertYellowHillsOasis")
        return pick("Hexes", "hexDesertRedHills" if red else "hexDesertYellowHills")
    if red:
        if special < 0.04: return pick("Hexes", "hexDesertRedGrassOasis")
        return pick("Hexes", rng.choice(["hexDesertRedBase", "hexDesertRedDirt", "hexDesertRedGrassDunes"]))
    if special < 0.02: return pick("Hexes", "hexDesertYellowSaltFlat")
    if special < 0.03: return pick("Hexes", "hexDesertYellowCrater")
    return pick("Hexes", rng.choice(["hexDesertYellowBase", "hexDesertYellowDirt", "hexDesertYellowDirtDunes"]))

# ---------- Gelaende-Klassen (fuer Reise-Logik) ----------
# Codes: o Ozean, l See, v Lava (alle drei gesperrt) | p Ebene, f Wald, h Huegel, m Berg, s Schnee, d Wueste, a Asche
def terrain_of(path):
    name = os.path.basename(path)[:-4].rstrip("0123456789")
    n = name.replace("hex", "", 1)
    if n.startswith(("Ocean", "Island")) and "Island" not in n: return "o"
    if n.startswith("Lake"): return "l"
    if n.startswith(("LavaSea", "LavaField")): return "v"
    if n.startswith(("Mountain", "Volcano", "DesertRedMountains", "DesertYellowMesa")): return "m"
    if n.startswith(("Hills", "DesertRedHills", "DesertYellowHills", "DesertRedMesa")): return "h"
    if n.startswith(("Forest", "DesertRedForest", "DesertYellowCacti")): return "f"
    if n.startswith(("ForestBurned", "Fumarole", "AshPlains")): return "a"
    if n.startswith(("SnowField", "PlainsColdSnow")): return "s"
    if n.startswith(("DesertRed", "DesertYellow")): return "d"
    return "p"

# Reihenfolge beachten: ForestBurned/Ash vor Forest
def terrain_of_fixed(path):
    n = os.path.basename(path)[:-4].rstrip("0123456789").replace("hex", "", 1)
    if n.startswith(("ForestBurned", "Fumarole", "AshPlains")): return "a"
    return terrain_of(path)

# ---------- Karte auswuerfeln (gleiche Reihenfolge wie bisher -> Seed bleibt reproduzierbar) ----------
tiles = [[choose(r, c) for c in range(COLS)] for r in range(ROWS)]
terr = [[terrain_of_fixed(tiles[r][c]) for c in range(COLS)] for r in range(ROWS)]

# ---------- Locations auf Felder setzen ----------
def neighbors(c, r):
    d = [(-1, 0), (1, 0)] + ([(0, -1), (1, -1), (0, 1), (1, 1)] if r % 2 else [(-1, -1), (0, -1), (-1, 1), (0, 1)])
    return [(c + dc, r + dr) for dc, dr in d if 0 <= c + dc < COLS and 0 <= r + dr < ROWS]

def coastal(c, r):
    return any(terr[nr][nc] == "o" for nc, nr in neighbors(c, r))

def hexdist(a, b):
    def cube(c, r):
        x = c - (r - (r & 1)) // 2
        return x, r, -x - r
    x1, y1, z1 = cube(*a); x2, y2, z2 = cube(*b)
    return max(abs(x1 - x2), abs(y1 - y2), abs(z1 - z2))

# slug: (Zielposition % von Breite/Hoehe, erlaubte Gelaende-Codes, nur Kueste?, Kartenmotiv je Gelaende-Code)
LOCS = {
    "hafenstadt":       ((50, 80), "pdfs", True,  {}),
    "waldpfad":         ((28, 58), "f",    False, {}),
    "kuestenstrasse":   ((75, 68), "pdfsh", True, {}),
    "bergpass":         ((55, 42), "m",    False, {}),
    "ruinen":           ((15, 40), "ps",   False, {"p": ("Tiles", "hexPlainsColdRuin"), "s": ("Tiles", "hexPlainsColdRuinSnow")}),
    "verlassenes_dorf": ((22, 25), "fp",   False, {"f": ("Tiles", "hexForestPineLoggingCamp")}),
    "schmugglerhoehle": ((90, 55), "hm",   True,  {"h": ("Tiles", "hexHillsColdCave")}),
    "zwergenfeste":     ((68, 22), "hm",   False, {"h": ("Tiles", "hexHillsColdCave"), "m": ("Tiles", "hexMountainSnowCave")}),
    "frostgipfel":      ((55, 10), "ms",   False, {"m": ("Tiles", "hexMountainSnowCave")}),
    "sumpf":            ((8, 10),  "psf",  False, {"p": ("Tiles", "hexPlainsColdPond"), "s": ("Tiles", "hexPlainsColdSnowCoveredPond")}),
}
placed = {}
art_rng = random.Random(SEED + 1)
for slug, (target, allowed, need_coast, art) in LOCS.items():
    tc, tr = target[0] / 100 * COLS, target[1] / 100 * ROWS
    best = None
    for r in range(ROWS):
        for c in range(COLS):
            if terr[r][c] not in allowed or (need_coast and not coastal(c, r)):
                continue
            if any(hexdist((c, r), p) < 4 for p in placed.values()):
                continue
            d = (c - tc) ** 2 + ((r - tr) * 1.4) ** 2
            if best is None or d < best[0]:
                best = (d, c, r)
    if best is None:
        raise SystemExit(f"Kein Feld fuer {slug}")
    _, c, r = best
    placed[slug] = (c, r)
    if terr[r][c] in art:
        folder, prefix = art[terr[r][c]]
        tiles[r][c] = art_rng.choice(variants(folder, prefix))

# ---------- Zusammensetzen (pointy-top, Zeilen versetzt, Ueberhang nach oben) ----------
S = SCALE
STEP_X, STEP_Y, OFF = round(256 * S), round(192 * S), round(128 * S)
W = COLS * STEP_X + OFF
H = (ROWS - 1) * STEP_Y + round(384 * S)
canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
for r in range(ROWS):
    for c in range(COLS):
        canvas.alpha_composite(load(tiles[r][c]), (c * STEP_X + (OFF if r % 2 else 0), r * STEP_Y))
name = f"worldmap_seed{SEED}"
png = os.path.join(HERE, name + ".png")
canvas.save(png, optimize=True)
webp = os.path.join(HERE, name + ".webp")
canvas.save(webp, "WEBP", quality=82, method=6)
data = {
    "seed": SEED, "cols": COLS, "rows": ROWS,
    "layout": {"width": W, "height": H, "stepX": STEP_X, "stepY": STEP_Y, "offX": OFF, "hexW": STEP_X,
               "faceCenterY": round(256 * S)},
    "terrain": ["".join(row) for row in terr],
    "locations": {k: list(v) for k, v in placed.items()},
}
import json
with open(os.path.join(HERE, name + ".json"), "w", encoding="utf-8") as f:
    json.dump(data, f, separators=(",", ":"))
print(webp, canvas.size, os.path.getsize(webp) // 1024, "KB")
print(placed)
