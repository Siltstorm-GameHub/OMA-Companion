/**
 * Angaben für Impressum und Datenschutzerklärung.
 *
 * ⚠ Vor dem 1.0-Release ausfüllen: Alle Werte, die noch mit "[" beginnen, sind
 * Platzhalter und werden auf den Seiten gelb markiert. Impressum (§ 5 DDG) und
 * Verantwortlicher (Art. 13 DSGVO) brauchen eine ladungsfähige Anschrift — ein
 * Postfach reicht nicht.
 */
export const LEGAL = {
  operatorName: "Sebastian Horn",
  street:       "Brechtelstraße 5",
  city:         "69126 Heidelberg",
  country:      "Deutschland",
  email:        "[horn.sebastian@yahoo.de]",
  /** Inhaltlich Verantwortlicher nach § 18 Abs. 2 MStV — meist dieselbe Person. */
  contentResponsible: "Sebastian Horn, Brechtelstr. 5, 69126 Heidelberg",
  /** Stand der Datenschutzerklärung. Bei inhaltlichen Änderungen anpassen. */
  privacyUpdated: "03.11.2026",
} as const;

export function isPlaceholder(value: string): boolean {
  return value.startsWith("[");
}
