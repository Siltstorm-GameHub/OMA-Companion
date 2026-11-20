// Platzierung gibt es nur bei Turnieren. Community-Events (type "community") haben beim Abschluss
// keine Rangliste, keinen Sieger und keine Platzierungs-Belohnungen — nur Teilnahme-Münzen und
// Teilnahme-Rang-Punkte (bzw. in einer Eventreihe die Teilnahme-Tabellenpunkte).

/** Hat dieses Event eine Endplatzierung? Alles außer Community-Events (Turniere, Altbestand). */
export function eventHasPlacement(ev: { type?: string | null }): boolean {
  return ev.type !== "community";
}
