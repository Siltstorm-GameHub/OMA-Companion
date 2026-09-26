"""
OMA Quest — Assets aufbereiten (Ambiente-Loops, Pixel-Texturen, Pixel-Monster) aus dem Asset-Ordner „Battle Cards".

Aufruf (im Projektordner):  python scripts/build-oq-assets.py ["<Pfad zum Ordner Battle Cards>"]

Erzeugt:
  public/oq/amb/<key>.wav            Ambiente-Loops (Mono, 11 kHz, höchstens 24 s, Ende blendet ins Anfang über → nahtlos)
  public/oq/tex/<key>.png            32×32-Pixel-Texturen (aus den 2048er-Farbkarten, 16 Farben, kachelbar als 2×2)
  public/oq/mon/<key>.png            Monster-Ruhe-Animation (waagerechter Streifen)
  public/oq/mon/<key>-atk.png        Monster-Angriffs-Animation (falls vorhanden)
  public/oq/fx/<key>.png             Kampf-Effekte (Treffer, Zauber, Heilung …)  +  src/lib/dnd/oq-fx-manifest.ts
  src/lib/dnd/oq-assets-manifest.ts  Kennzahlen (Bildgrößen, Anzahl, Durchschnittsfarbe) für den Code

Nutzungsrechte der Pakete sind vom Projektinhaber zu bestätigen.
"""
import audioop
import glob
import json
import os
import re
import sys
import wave

from PIL import Image

ROOT = sys.argv[1] if len(sys.argv) > 1 else 'C:/Users/sebas/OneDrive/Gaming/Gaming Community/Old Masters Ally/Battle Cards'
OUT = 'public/oq'
for d in ('amb', 'tex', 'mon'):
    os.makedirs(f'{OUT}/{d}', exist_ok=True)

# ── Ambiente ────────────────────────────────────────────────
AMB_DIR = f'{ROOT}/Assets/Effects/Guild Ambience SFX/WAV - 44100 Hz - 16 Bit/'
AMBIENCE = {
    'forest': ('Ambience_Forest_Loop', 'Wald'),
    'birds': ('Ambience_Group_Of_Birds_Loop', 'Vogelgezwitscher'),
    'wind': ('Ambience_Wind_Low_Loop', 'Sanfter Wind'),
    'mountain': ('Ambience_Wind_Mountain_Loop', 'Bergwind'),
    'creepy': ('Ambience_Wind_Creepy_Loop', 'Unheimlicher Wind'),
    'waves': ('Ambience_Waves_Loop', 'Meeresrauschen'),
    'river': ('Ambience_River_Big_Flow_Loop', 'Fluss'),
    'waterfall': ('Ambience_Waterfall_01_Loop', 'Wasserfall'),
    'fountain': ('Ambience_Fountain_Water_01_Loop', 'Brunnen'),
    'rain': ('Ambience_Rain_Intense_Loop', 'Regen'),
    'snowstorm': ('Ambience_Snowstorm_Loop', 'Schneesturm'),
    'sandstorm': ('Ambience_Sandstorm_Loop', 'Sandsturm'),
    'dungeon': ('Ambience_Dungeon_01_Loop', 'Verlies'),
    'cave': ('Ambience_Deep_Loop', 'Tiefe Höhle'),
    'rocks': ('Ambience_Rocks_Loop', 'Felsen'),
    'town': ('Ambience_City_01_Loop', 'Stadt'),
    'nightbirds': ('Ambience_City_Outskirts_Birds_Owl_Loop', 'Nacht mit Eule'),
    'tavern': ('Ambience_Crowd_03_Loop', 'Stimmengewirr'),
    'forge': ('Ambience_Industrial_01_Loop', 'Schmiede / Werkstatt'),
    'swamp': ('Liquid_Strange_Loop', 'Sumpf'),
    'magic': ('Magic_Ethereal_Aura_Loop', 'Magische Aura'),
    'dark': ('Dark_Fantasy_01_Loop', 'Düstere Stimmung'),
    'ominous': ('Ominous_Loop', 'Bedrohlich'),
    'rumble': ('Earth_Rumbling_Loop', 'Grollende Erde'),
}
RATE = 11025
MAX_S = 24.0
XFADE_S = 1.5
amb_manifest = {}
for key, (name, label) in AMBIENCE.items():
    path = AMB_DIR + name + '.wav'
    if not os.path.exists(path):
        print('FEHLT', path)
        continue
    w = wave.open(path)
    ch, width, rate, n = w.getnchannels(), w.getsampwidth(), w.getframerate(), w.getnframes()
    keep = min(n, int(MAX_S * rate) + int(XFADE_S * rate)) if n / rate > MAX_S else n
    data = w.readframes(keep)
    w.close()
    if ch == 2:
        data = audioop.tomono(data, width, 0.5, 0.5)
    data, _ = audioop.ratecv(data, width, 1, rate, RATE, None)
    if width != 2:
        data = audioop.lin2lin(data, width, 2)
    samples = len(data) // 2
    if n / rate > MAX_S:
        # Nahtlos machen: die letzten XFADE_S Sekunden werden ins Anfangsstück eingeblendet, danach abgeschnitten
        xf = int(XFADE_S * RATE)
        body = bytearray(data[: (samples - xf) * 2])
        tail = data[(samples - xf) * 2:]
        for i in range(xf):
            t = i / xf
            a = int.from_bytes(tail[2 * i:2 * i + 2], 'little', signed=True) * (1 - t) ** 0.5
            b = int.from_bytes(body[2 * i:2 * i + 2], 'little', signed=True) * t ** 0.5
            body[2 * i:2 * i + 2] = int(max(-32768, min(32767, a + b))).to_bytes(2, 'little', signed=True)
        data = bytes(body)
    peak = audioop.max(data, 2) or 1
    data = audioop.mul(data, 2, min(3.0, 0.7 * 32767 / peak))
    o = wave.open(f'{OUT}/amb/{key}.wav', 'wb')
    o.setnchannels(1)
    o.setsampwidth(2)
    o.setframerate(RATE)
    o.writeframes(data)
    o.close()
    amb_manifest[key] = label

# ── Texturen ────────────────────────────────────────────────
TEX_DIR = f'{ROOT}/Texturen/'
TEXTURES = {
    'gras': ('Vol3Grass', 'Grass1', 'Gras'),
    'wiese': ('Vol12Grass 2', 'Grass1', 'Wiese'),
    'waldboden': ('Vol26Forest', 'Forest10', 'Waldboden'),
    'erde': ('Vol2Dirt', 'Dirt1', 'Erde'),
    'sand': ('Vol1Sand', 'Sand1', 'Sand'),
    'duenen': ('Vol16Sand 2', 'Sand1', 'Dünensand'),
    'schnee': ('Vol22Snow', 'Snow1', 'Schnee'),
    'eis': ('Vol23Ice', 'Ice1', 'Eis'),
    'lava': ('Vol18Lava', 'Lava1', 'Lava'),
    'kristall': ('Vol27Crystals', 'Crystals1', 'Kristall'),
    'fels': ('Vol4Rocks 1', 'Rocks1', 'Fels'),
    'klippe': ('Vol29Cliffs', 'Cliffs1', 'Klippe'),
    'dielen': ('Vol19Planks', 'Planks10', 'Holzdielen'),
    'holz': ('Vol34Wood', 'Wood1', 'Holz'),
    'fliesen': ('Vol11Tiles 2', 'Tiles1', 'Fliesen'),
    'marmor': ('Vol31Tiles 3', 'Tiles10', 'Steinplatten'),
    'ziegel': ('Vol10Bricks 3', 'Bricks1', 'Ziegel'),
    'backstein': ('Vol8Bricks 1', 'Bricks1', 'Backstein'),
    'metall': ('Vol32Metal', 'Metal1', 'Metall'),
    'wasser': ('Vol15Water', 'Water4', 'Wasser'),
    'kies': ('Vol7Ground 1', 'Ground1', 'Kies'),
    'kistenholz': ('Vol20Walls 1', 'Walls10', 'Kistenholz'),
}
tex_manifest = {}
for key, (vol, setname, label) in TEXTURES.items():
    folder = None
    for cand in glob.glob(f'{TEX_DIR}{vol}/{setname}Texture*'):
        folder = cand
        break
    if not folder:
        print('FEHLT Textur', key)
        continue
    colors = sorted(glob.glob(folder + '/*_Color*.png'))
    if not colors:
        print('KEINE Farbkarte', key)
        continue
    im = Image.open(colors[0]).convert('RGB')
    im = im.resize((64, 64), Image.BOX).resize((32, 32), Image.BOX)
    # Pixel-Look: wenige Farben, leicht kontrastreicher
    im = im.quantize(colors=14, method=Image.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
    im.save(f'{OUT}/tex/{key}.png', optimize=True)
    px = list(im.getdata())
    avg = tuple(sum(c[i] for c in px) // len(px) for i in range(3))
    tex_manifest[key] = {'label': label, 'avg': '#%02x%02x%02x' % avg}

# ── Monster ─────────────────────────────────────────────────
MON_DIR = f'{ROOT}/Pixel Character/Super Pixel Monsters Pack 1/spritesheet/'
MONSTERS = {
    'leech': 'leech_green', 'skullslime': 'skull_slime_green', 'demoneye': 'demon_eye_red', 'shrubtooth': 'shrubtooth_yellow',
    'mudman': 'mudman_brown', 'wingedskull': 'winged_skull_gray', 'skullbeetle': 'skull_beetle_green', 'wraith': 'wraith_violet',
    'hellskull': 'hell_skull_orange', 'bonestatue': 'bone_statue_gray', 'frostwraith': 'wraith_blue', 'firebeetle': 'skull_beetle_red',
    'iceslime': 'skull_slime_blue', 'darkeye': 'demon_eye_violet', 'bloodleech': 'leech_red',
}
mon_manifest = {}


def strip(rects, sheet, name_out):
    fw, fh = rects[0][2], rects[0][3]
    S = Image.new('RGBA', (fw * len(rects), fh), (0, 0, 0, 0))
    for i, (x, y, w, h) in enumerate(rects):
        S.alpha_composite(sheet.crop((x, y, x + w, y + h)), (i * fw, 0))
    S.save(name_out, optimize=True)
    return {'frames': len(rects), 'w': fw, 'h': fh}


for key, folder in MONSTERS.items():
    d = MON_DIR + folder
    if not os.path.exists(d + '/spritesheet.png'):
        print('FEHLT Monster', key)
        continue
    sheet = Image.open(d + '/spritesheet.png').convert('RGBA')
    groups = {}
    for line in open(d + '/spritesheet.txt', encoding='utf-8').read().splitlines():
        m = re.match(r'(.+?)/(?:(.+?)/)?frame(\d+)\.png = (\d+) (\d+) (\d+) (\d+)', line)
        if not m:
            continue
        anim = m.group(2) or 'main'
        groups.setdefault(anim, []).append((int(m.group(3)), *[int(m.group(i)) for i in (4, 5, 6, 7)]))
    for g in groups.values():
        g.sort()
    idle = next((groups[k] for k in ('idle', 'idle_A', 'main', 'fly', 'move', 'walk') if k in groups), next(iter(groups.values())))
    info = strip([r[1:] for r in idle], sheet, f'{OUT}/mon/{key}.png')
    if 'attack' in groups:
        info['atk'] = strip([r[1:] for r in groups['attack']], sheet, f'{OUT}/mon/{key}-atk.png')
    mon_manifest[key] = info


# ── Kampf-Effekte (Pixel-Spritesheets, waagerechte Streifen quadratischer Bilder) ──
FX_DIR = f'{ROOT}/Assets/Effects/'
FX = {
    'hit': ('Pixel Fight FX/Super Pixel Impact FX Pack 1', 'impfx1_quick_impact_A_large_red'),
    'crit': ('Pixel Fight FX/Super Pixel Impact FX Pack 1', 'impfx1_quick_impact_A_large_yellow'),
    'miss': ('Pixel Fight FX/Super Pixel Impact FX Pack 1', 'impfx1_dust_impact_A_small_white'),
    'arcane': ('Pixel Fight FX/Super Pixel Impact FX Pack 1', 'impfx1_quick_impact_B_large_blue'),
    'fire': ('Pixel Fight FX/Super Pixel Explosion FX Pack 1', 'expfx1_epic_explosion_A_large_orange'),
    'ice': ('Pixel Fight FX/Super Pixel Explosion FX Pack 1', 'expfx1_epic_explosion_A_large_blue'),
    'heal': ('Pixel Fight FX/Super Pixel Fantasy FX Pack 1', 'fanfx1_magic_burst_A_large_green'),
    'guard': ('Pixel Fight FX/Super Pixel Fantasy FX Pack 1', 'fanfx1_magic_burst_A_large_blue'),
    'holy': ('Pixel Fight FX/Super Pixel Fantasy FX Pack 1', 'fanfx1_magic_burst_A_large_yellow'),
    'buff': ('Pixel Fight FX/Super Pixel Fantasy FX Pack 1', 'fanfx1_magic_puff_A_large_violet'),
    'hurt': ('Pixel Fight FX/Super Pixel Blood FX Pack 1', 'bldfx1_blood_burst_A_large_red'),
    'death': ('Super Pixel Fantasy FX Pack 3', 'fanfx3_death_large_violet'),
    'barrier': ('Super Pixel Fantasy FX Pack 3', 'fanfx3_barrier_large_blue'),
    'attackup': ('Super Pixel Fantasy FX Pack 3', 'fanfx3_attack_up_large_red'),
    'rejuvenate': ('Super Pixel Fantasy FX Pack 3', 'fanfx3_rejuvenate_large_green'),
    'arrow': ('Super Pixel Projectiles Pack 3', 'pj3_arrow_impact_large_orange'),
    'bite': ('Super Pixel Projectiles Pack 3', 'pj3_demon_bite_impact_large_red'),
}
os.makedirs(f'{OUT}/fx', exist_ok=True)
fx_lines = []
for key, (pack, name) in FX.items():
    src = f'{FX_DIR}{pack}/spritesheet/{name}/spritesheet.png'
    if not os.path.exists(src):
        print('FEHLT Effekt', key)
        continue
    im = Image.open(src)
    im.save(f'{OUT}/fx/{key}.png', optimize=True)
    fx_lines.append(f'  {key}: {{ frames: {im.width // im.height}, size: {im.height} }},')
with open('src/lib/dnd/oq-fx-manifest.ts', 'w', encoding='utf-8') as f:
    f.write('// Automatisch erzeugt von scripts/build-oq-assets.py (Effekt-Spritesheets in public/oq/fx: waagerechte Streifen quadratischer Bilder)\n')
    f.write('export const FX_SHEETS = {\n' + '\n'.join(fx_lines) + '\n} as const;\nexport type FxKind = keyof typeof FX_SHEETS;\n')

with open('src/lib/dnd/oq-assets-manifest.ts', 'w', encoding='utf-8') as f:
    f.write('// Automatisch erzeugt von scripts/build-oq-assets.py — nicht von Hand ändern\n')
    f.write('export const AMBIENCE_LABELS = ' + json.dumps(amb_manifest, ensure_ascii=False, indent=2) + ' as const;\n')
    f.write('export type AmbienceKey = keyof typeof AMBIENCE_LABELS;\n\n')
    f.write('export const TEXTURES = ' + json.dumps(tex_manifest, ensure_ascii=False, indent=2) + ' as const;\n')
    f.write('export type TextureKey = keyof typeof TEXTURES;\n\n')
    f.write('export const MONSTER_SPRITES = ' + json.dumps(mon_manifest, ensure_ascii=False, indent=2) + ' as const;\n')
    f.write('export type MonsterSpriteKey = keyof typeof MONSTER_SPRITES;\n')
total = sum(os.path.getsize(os.path.join(dp, fn)) for dp, _, fs in os.walk(OUT) for fn in fs) // 1024
print(len(amb_manifest), 'Ambiente,', len(tex_manifest), 'Texturen,', len(mon_manifest), 'Monster;', total, 'KB in public/oq')
