// Erkennt Protokoll-Links wie steam://connect/host:port oder minecraft://host:port
// und extrahiert Host + Port daraus (z.B. für Auto-Fill im Admin-Formular).
const CONNECT_LINK = /^[a-z][a-z0-9+.-]*:\/\/(?:[^/]*\/)?([a-zA-Z0-9.-]+):(\d{2,5})(?:[/?#].*)?$/i;

export function parseConnectLink(link: string): { host: string; port: string } | null {
  const match = CONNECT_LINK.exec(link.trim());
  if (!match) return null;
  return { host: match[1], port: match[2] };
}
