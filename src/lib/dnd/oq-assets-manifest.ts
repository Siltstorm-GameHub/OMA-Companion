// Automatisch erzeugt von scripts/build-oq-assets.py — nicht von Hand ändern
export const AMBIENCE_LABELS = {
  "forest": "Wald",
  "birds": "Vogelgezwitscher",
  "wind": "Sanfter Wind",
  "mountain": "Bergwind",
  "creepy": "Unheimlicher Wind",
  "waves": "Meeresrauschen",
  "river": "Fluss",
  "waterfall": "Wasserfall",
  "fountain": "Brunnen",
  "rain": "Regen",
  "snowstorm": "Schneesturm",
  "sandstorm": "Sandsturm",
  "dungeon": "Verlies",
  "cave": "Tiefe Höhle",
  "rocks": "Felsen",
  "town": "Stadt",
  "nightbirds": "Nacht mit Eule",
  "tavern": "Stimmengewirr",
  "forge": "Schmiede / Werkstatt",
  "swamp": "Sumpf",
  "magic": "Magische Aura",
  "dark": "Düstere Stimmung",
  "ominous": "Bedrohlich",
  "rumble": "Grollende Erde"
} as const;
export type AmbienceKey = keyof typeof AMBIENCE_LABELS;

export const TEXTURES = {
  "gras": {
    "label": "Gras",
    "avg": "#324929"
  },
  "wiese": {
    "label": "Wiese",
    "avg": "#3e5b02"
  },
  "waldboden": {
    "label": "Waldboden",
    "avg": "#612c00"
  },
  "erde": {
    "label": "Erde",
    "avg": "#522c14"
  },
  "sand": {
    "label": "Sand",
    "avg": "#d79446"
  },
  "duenen": {
    "label": "Dünensand",
    "avg": "#dfaa57"
  },
  "schnee": {
    "label": "Schnee",
    "avg": "#d4e0f4"
  },
  "eis": {
    "label": "Eis",
    "avg": "#60c8ed"
  },
  "lava": {
    "label": "Lava",
    "avg": "#96360d"
  },
  "kristall": {
    "label": "Kristall",
    "avg": "#2a5870"
  },
  "fels": {
    "label": "Fels",
    "avg": "#64664e"
  },
  "klippe": {
    "label": "Klippe",
    "avg": "#484b40"
  },
  "dielen": {
    "label": "Holzdielen",
    "avg": "#4a2312"
  },
  "holz": {
    "label": "Holz",
    "avg": "#3d1f11"
  },
  "fliesen": {
    "label": "Fliesen",
    "avg": "#8c6b47"
  },
  "marmor": {
    "label": "Steinplatten",
    "avg": "#504c46"
  },
  "ziegel": {
    "label": "Ziegel",
    "avg": "#90683d"
  },
  "backstein": {
    "label": "Backstein",
    "avg": "#4f5353"
  },
  "metall": {
    "label": "Metall",
    "avg": "#3c3830"
  },
  "wasser": {
    "label": "Wasser",
    "avg": "#29b3e5"
  },
  "kies": {
    "label": "Kies",
    "avg": "#3e372f"
  },
  "kistenholz": {
    "label": "Kistenholz",
    "avg": "#755535"
  }
} as const;
export type TextureKey = keyof typeof TEXTURES;

export const MONSTER_SPRITES = {
  "leech": {
    "frames": 12,
    "w": 32,
    "h": 18,
    "atk": {
      "frames": 16,
      "w": 32,
      "h": 18
    }
  },
  "skullslime": {
    "frames": 18,
    "w": 48,
    "h": 34
  },
  "demoneye": {
    "frames": 16,
    "w": 64,
    "h": 64
  },
  "shrubtooth": {
    "frames": 30,
    "w": 52,
    "h": 48,
    "atk": {
      "frames": 13,
      "w": 52,
      "h": 48
    }
  },
  "mudman": {
    "frames": 16,
    "w": 48,
    "h": 48
  },
  "wingedskull": {
    "frames": 8,
    "w": 52,
    "h": 48,
    "atk": {
      "frames": 12,
      "w": 52,
      "h": 48
    }
  },
  "skullbeetle": {
    "frames": 12,
    "w": 96,
    "h": 48,
    "atk": {
      "frames": 9,
      "w": 96,
      "h": 48
    }
  },
  "wraith": {
    "frames": 10,
    "w": 128,
    "h": 64,
    "atk": {
      "frames": 17,
      "w": 128,
      "h": 64
    }
  },
  "hellskull": {
    "frames": 10,
    "w": 48,
    "h": 96
  },
  "bonestatue": {
    "frames": 8,
    "w": 64,
    "h": 48,
    "atk": {
      "frames": 14,
      "w": 64,
      "h": 48
    }
  },
  "frostwraith": {
    "frames": 10,
    "w": 128,
    "h": 64,
    "atk": {
      "frames": 17,
      "w": 128,
      "h": 64
    }
  },
  "firebeetle": {
    "frames": 12,
    "w": 96,
    "h": 48,
    "atk": {
      "frames": 9,
      "w": 96,
      "h": 48
    }
  },
  "iceslime": {
    "frames": 18,
    "w": 48,
    "h": 34
  },
  "darkeye": {
    "frames": 16,
    "w": 64,
    "h": 64
  },
  "bloodleech": {
    "frames": 12,
    "w": 32,
    "h": 18,
    "atk": {
      "frames": 16,
      "w": 32,
      "h": 18
    }
  },
  "sandspider": {
    "frames": 12,
    "w": 96,
    "h": 48,
    "atk": {
      "frames": 9,
      "w": 96,
      "h": 48
    }
  }
} as const;
export type MonsterSpriteKey = keyof typeof MONSTER_SPRITES;
