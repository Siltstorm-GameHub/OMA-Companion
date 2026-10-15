import type { Metadata } from "next";
import { LEGAL } from "@/lib/legal";
import { LegalPage, LegalValue } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Impressum · OMA Companion" };

export default function ImpressumPage() {
  return (
    <LegalPage title="Impressum">
      <h2>Angaben gemäß § 5 DDG</h2>
      <p>
        <LegalValue value={LEGAL.operatorName} /><br />
        <LegalValue value={LEGAL.street} /><br />
        <LegalValue value={LEGAL.city} /><br />
        {LEGAL.country}
      </p>

      <h2>Kontakt</h2>
      <p>E-Mail: <LegalValue value={LEGAL.email} /></p>

      <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
      <p><LegalValue value={LEGAL.contentResponsible} /></p>

      <h2>Hinweis</h2>
      <p>
        Die OMA Companion App ist ein privates, nicht-kommerzielles Projekt der Discord-Community
        „Old Masters Ally“ und steht nur Mitgliedern des Community-Servers zur Verfügung.
      </p>

      <h2>Haftung für Links</h2>
      <p>
        Die App enthält Links zu externen Websites (z. B. Discord, Twitch, Steam), auf deren Inhalte wir
        keinen Einfluss haben. Für diese Inhalte ist der jeweilige Anbieter verantwortlich. Bei Bekanntwerden
        von Rechtsverletzungen entfernen wir entsprechende Links umgehend.
      </p>
    </LegalPage>
  );
}
