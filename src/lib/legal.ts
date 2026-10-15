/**
 * Angaben für Impressum und Datenschutzerklärung.
 *
 * ⚠ Vor dem 1.0-Release ausfüllen: Alle Werte, die noch mit "[" beginnen, sind
 * Platzhalter und werden auf den Seiten gelb markiert. Impressum (§ 5 DDG) und
 * Verantwortlicher (Art. 13 DSGVO) brauchen eine ladungsfähige Anschrift — ein
 * Postfach reicht nicht.
 */
export const LEGAL = {
  operatorName: "[Vor- und Nachname]",
  street:       "[Straße Hausnummer]",
  city:         "[PLZ Ort]",
  country:      "Deutschland",
  email:        "[kontakt@oma-app.de]",
  /** Inhaltlich Verantwortlicher nach § 18 Abs. 2 MStV — meist dieselbe Person. */
  contentResponsible: "[Vor- und Nachname, Anschrift wie oben]",
  /** Stand der Datenschutzerklärung. Bei inhaltlichen Änderungen anpassen. */
  privacyUpdated: "15.10.2026",
} as const;

export function isPlaceholder(value: string): boolean {
  return value.startsWith("[");
}
