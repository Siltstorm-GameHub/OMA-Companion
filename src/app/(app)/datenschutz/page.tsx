import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL } from "@/lib/legal";
import { LegalPage, LegalValue } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Datenschutz · OMA Companion" };

// Inhaltlich am tatsächlichen Datenfluss der App ausgerichtet (Stand siehe LEGAL.privacyUpdated).
// Kommt ein neuer Drittdienst oder eine neue Datenart dazu, bitte hier ergänzen.
export default function DatenschutzPage() {
  return (
    <LegalPage title="Datenschutzerklärung">
      <p className="text-xs text-gray-500">Stand: {LEGAL.privacyUpdated}</p>

      <h2>1. Verantwortlicher</h2>
      <p>
        <LegalValue value={LEGAL.operatorName} />, <LegalValue value={LEGAL.street} />,{" "}
        <LegalValue value={LEGAL.city} /><br />
        E-Mail: <LegalValue value={LEGAL.email} />
      </p>

      <h2>2. Worum es geht</h2>
      <p>
        Die OMA Companion App begleitet die Discord-Community „Old Masters Ally“: Events und Turniere,
        Punkte und Ranglisten, Profile, Mini-Games und Community-Aufgaben. Die Nutzung setzt einen
        Discord-Account und die Mitgliedschaft im Community-Server voraus. Wir nutzen keine Werbung und
        kein Tracking bzw. keine Analyse-Dienste.
      </p>

      <h2>3. Welche Daten wir verarbeiten</h2>

      <h3>Anmeldung über Discord</h3>
      <p>
        Beim Login erhalten wir von Discord deine Discord-ID, deinen Benutzernamen, dein Profilbild und deine
        E-Mail-Adresse. Die Liste deiner Server wird nur abgefragt, um die Mitgliedschaft im Community-Server
        zu prüfen, und nicht gespeichert. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Bereitstellung der App).
      </p>

      <h3>Aktivität auf dem Discord-Server</h3>
      <p>
        Ein Bot erfasst für das Punktesystem, Quests und die Community-Karten, <em>dass</em> du aktiv bist:
        Anzahl deiner Nachrichten (nicht deren Inhalt), Minuten in Sprachkanälen, Reaktionen, Einladungen,
        Interesse an Discord-Events sowie Server-Nickname und Rollen. Rechtsgrundlage: Art. 6 Abs. 1 lit. b
        bzw. lit. f DSGVO (berechtigtes Interesse am Betrieb des Community-Punktesystems).
      </p>

      <h3>Nutzung der App</h3>
      <ul>
        <li>Event- und Turnieranmeldungen, Ergebnisse, Platzierungen, Tipps und Abstimmungen</li>
        <li>Punkte- und Münz-Buchungen, Quest-Fortschritt, Spielstände (Battle Cards, OMA Quest)</li>
        <li>
          Screenshots als Ergebnis-Nachweis — werden 7 Tage nach Abschluss der Turnierphase, spätestens nach
          14 Tagen, automatisch gelöscht
        </li>
        <li>Lobby-Chat-Nachrichten — werden nach 7 Tagen automatisch gelöscht</li>
        <li>Beiträge, Kommentare, Ideen, Berichte, Fotos und Clips, die du selbst einstellst</li>
        <li>Zeitpunkt deiner letzten Aktivität (für den Online-Status)</li>
        <li>Spenden in den Community-Pool (Betrag und Monat; nur für Admins sichtbar)</li>
      </ul>

      <h3>Freiwillige Profilangaben</h3>
      <p>
        Geburtstag (nur Tag und Monat werden genutzt), Kurzbeschreibung, Profil-Banner, Lieblingsspiele und
        Twitch-Name. Diese Angaben sind freiwillig und jederzeit im Profil änderbar. Rechtsgrundlage:
        Art. 6 Abs. 1 lit. a DSGVO (Einwilligung).
      </p>

      <h3>Push-Benachrichtigungen</h3>
      <p>
        Wenn du Push aktivierst, speichern wir die von deinem Browser erzeugte Push-Adresse. Zugestellt werden
        die Nachrichten über den Push-Dienst deines Browsers (z. B. Google, Mozilla, Apple). Du kannst Push
        jederzeit im Profil oder im Browser abschalten.
      </p>

      <h3>Stream-Overlay</h3>
      <p>
        Für Streamer gibt es OBS-Overlays, die über einen geheimen Link ohne Login abrufbar sind. Sie zeigen
        Event-Stände und Profil-Infos (Name, Bild, Punkte) so, wie sie auch in der App sichtbar sind.
      </p>

      <h3>Technisch notwendige Daten</h3>
      <p>
        Beim Aufruf verarbeitet unser Hoster technisch notwendige Daten wie IP-Adresse, Zeitpunkt und
        aufgerufene Adresse (Server-Logs). Die IP-Adresse wird zusätzlich kurzzeitig im Arbeitsspeicher
        genutzt, um Anfrage-Spam zu begrenzen. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (sicherer Betrieb).
      </p>

      <h2>4. Cookies und lokaler Speicher</h2>
      <p>
        Wir setzen nur ein technisch notwendiges Sitzungs-Cookie für den Login. Im lokalen Speicher deines
        Browsers merken wir uns Einstellungen wie das Farbschema. Dafür ist keine Einwilligung nötig
        (§ 25 Abs. 2 Nr. 2 TDDDG).
      </p>

      <h2>5. Dienstleister und Empfänger</h2>
      <ul>
        <li><strong>Vercel Inc.</strong> (USA) — Hosting der App und Speicherung hochgeladener Bilder</li>
        <li><strong>Supabase</strong> — Datenbank</li>
        <li><strong>Railway</strong> — Betrieb des Discord-Bots</li>
        <li><strong>Discord Inc.</strong> (USA) — Login, Server-Anbindung, Benachrichtigungen per Discord</li>
        <li>
          <strong>Google (Gemini)</strong> — Admins können Event-Berichte automatisch formulieren lassen; dabei
          werden Event-Daten inkl. Benutzernamen und Platzierungen übermittelt
        </li>
        <li>
          <strong>Twitch</strong> (USA) — eingebettete Streams und Clips werden direkt von Twitch geladen; dabei
          erhält Twitch deine IP-Adresse. Live-Status wird über die Twitch-Schnittstelle abgefragt.
        </li>
        <li>
          Spiele-Plattformen (z. B. Steam, Epic, Xbox) — Cover-Bilder und Spielinfos werden von deren Servern
          geladen
        </li>
      </ul>
      <p>
        Mit den Dienstleistern bestehen, soweit erforderlich, Verträge zur Auftragsverarbeitung. Übermittlungen
        in die USA stützen sich auf das EU-US Data Privacy Framework bzw. Standardvertragsklauseln.
      </p>

      <h2>6. Speicherdauer</h2>
      <p>
        Wir speichern deine Daten, solange dein Konto besteht. Kürzere Fristen gelten für Screenshots,
        Lobby-Nachrichten und technische Logs (siehe oben). Verlässt du den Discord-Server, bleibt dein Konto
        mit Historie erhalten, bis du es löschst.
      </p>

      <h2>7. Deine Rechte</h2>
      <p>
        Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung,
        Datenübertragbarkeit und Widerspruch (Art. 15–21 DSGVO) sowie das Recht, eine erteilte Einwilligung
        jederzeit zu widerrufen. Außerdem kannst du dich bei einer Datenschutz-Aufsichtsbehörde beschweren.
      </p>
      <p>
        Selbst erledigen kannst du das im{" "}
        <Link href="/profile#account">Profil unter „Konto &amp; Daten“</Link>: Dort lädst du alle gespeicherten
        Daten herunter oder löschst dein Konto. Beim Löschen werden alle persönlichen Angaben entfernt;
        Turnierergebnisse und Beiträge bleiben für die Community anonym als „Gelöschtes Mitglied“ erhalten.
        Für alles andere schreib uns an <LegalValue value={LEGAL.email} />.
      </p>
    </LegalPage>
  );
}
