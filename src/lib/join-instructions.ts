/**
 * Kurzanleitung, wie man einem Gameserver beitritt — abhängig vom Spiel.
 * Minecraft läuft über den eigenen Multiplayer-Client, alle anderen (Steam-)Spiele
 * i.d.R. über Direct-Connect per IP; ein steam://connect-Link überspringt den Schritt.
 */

export type JoinInstructions = {
  steps: string[];
  deepLink?: (host: string, port?: string | null) => string;
  deepLinkLabel?: string;
};

const MINECRAFT: JoinInstructions = {
  steps: [
    "Minecraft starten → „Mehrspieler“ → „Server hinzufügen“",
    "Serveradresse einfügen (oben kopiert)",
    "Server in der Liste auswählen und beitreten",
  ],
};

const STEAM_DIRECT_CONNECT: JoinInstructions = {
  steps: [
    "Spiel starten und den Mehrspieler-/Server-Browser öffnen",
    "„Direct Connect“ bzw. „Server per IP beitreten“ wählen",
    "Adresse einfügen (oben kopiert) und verbinden",
  ],
  deepLink: (host, port) => `steam://connect/${host}${port ? `:${port}` : ""}`,
  deepLinkLabel: "Direkt über Steam beitreten",
};

export function getJoinInstructions(game: string): JoinInstructions {
  if (/minecraft/i.test(game)) return MINECRAFT;
  return STEAM_DIRECT_CONNECT;
}
