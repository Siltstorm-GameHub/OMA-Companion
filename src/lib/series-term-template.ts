// ============================================
// Termin-Vorlage einer Reihe — Einstellungen, die jeder neu angelegte Termin übernimmt
// ============================================
// Sichtbar und bearbeitbar im Reiter "Termine" der Reihen-Verwaltung (statt sie still vom letzten
// Termin zu erben). Datum und Dauer kommen aus der Terminplanung (lib/series-schedule.ts); Spiel,
// Format, Umfragen, Stat-Felder und Turniervorlage aus den übrigen Reihen-Einstellungen.
// Fehlt die Vorlage (ältere Reihen), gilt wie bisher der letzte Termin (lib/series-generate.ts).
// Reine Funktionen ohne DB, auch im Client nutzbar.

export type TermTemplate = {
  /** Höchstzahl Spieler je Termin (null = unbegrenzt) */
  maxPlayers: number | null;
  /** Zuschauer können sich anmelden */
  spectatorMode: boolean;
  /** Belohnung für Zuschauer (nur mit spectatorMode) */
  spectatorReward: { coins: number; rankPoints: number };
};

export const DEFAULT_TERM_TEMPLATE: TermTemplate = { maxPlayers: null, spectatorMode: false, spectatorReward: { coins: 5, rankPoints: 0 } };

const nonNegInt = (v: unknown, max: number) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(0, n)) : 0;
};

export function sanitizeTermTemplate(raw: unknown): TermTemplate | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const mp = r.maxPlayers == null || r.maxPlayers === "" ? null : Math.floor(Number(r.maxPlayers));
  const sr = (r.spectatorReward && typeof r.spectatorReward === "object" ? r.spectatorReward : {}) as Record<string, unknown>;
  return {
    maxPlayers: mp != null && Number.isFinite(mp) && mp >= 2 ? Math.min(mp, 10_000) : null,
    spectatorMode: r.spectatorMode === true,
    spectatorReward: { coins: nonNegInt(sr.coins, 1_000_000), rankPoints: nonNegInt(sr.rankPoints, 1_000) },
  };
}

export function parseTermTemplate(json: string | null | undefined): TermTemplate | null {
  if (!json) return null;
  try { return sanitizeTermTemplate(JSON.parse(json)); } catch { return null; }
}

/** Vorlage aus einem bestehenden Termin ablesen (Vorbelegung des Formulars bei älteren Reihen). */
export function templateFromEvent(ev: { maxPlayers: number | null; spectatorMode: boolean; spectatorRewardJson: string | null } | null | undefined): TermTemplate {
  if (!ev) return DEFAULT_TERM_TEMPLATE;
  let reward = DEFAULT_TERM_TEMPLATE.spectatorReward;
  try {
    const r = ev.spectatorRewardJson ? JSON.parse(ev.spectatorRewardJson) as { coins?: number; rankPoints?: number } : null;
    if (r) reward = { coins: nonNegInt(r.coins, 1_000_000), rankPoints: nonNegInt(r.rankPoints, 1_000) };
  } catch { /* Standard */ }
  return { maxPlayers: ev.maxPlayers ?? null, spectatorMode: ev.spectatorMode, spectatorReward: reward };
}

/** Event-Felder, die ein neuer Termin aus der Vorlage bekommt. */
export function templateTermFields(t: TermTemplate): { maxPlayers: number | null; spectatorMode: boolean; spectatorRewardJson: string | null } {
  return {
    maxPlayers: t.maxPlayers,
    spectatorMode: t.spectatorMode,
    spectatorRewardJson: t.spectatorMode ? JSON.stringify(t.spectatorReward) : null,
  };
}
