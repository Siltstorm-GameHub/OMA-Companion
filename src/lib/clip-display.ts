export function extractTwitchClipSlug(url: string): string | null {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    const clipIndex = parts.indexOf("clip");
    if (clipIndex !== -1 && parts[clipIndex + 1]) return parts[clipIndex + 1];
    if (parts.length > 0) return parts[parts.length - 1];
    return null;
  } catch {
    return null;
  }
}

type CreditableNomination = {
  submittedBy?: { name: string | null; username: string | null } | null;
  twitchCreatorLogin?: string | null;
  partnerTwitchLogin?: string | null;
};

// Für Partner-Clips: Kanal = Streamer, bei dem geclippt wurde; Clip-Ersteller nur zeigen, wenn abweichend.
// Für Community-Clips: kein separater Kanal, der Einreicher ist zugleich Streamer/Ersteller.
export function clipCredit(nom: CreditableNomination): { channel: string; creator: string | null } {
  if (nom.partnerTwitchLogin) {
    const channel = nom.partnerTwitchLogin;
    const creator = nom.twitchCreatorLogin;
    const sameAsChannel = !creator || creator.toLowerCase() === channel.toLowerCase();
    return { channel, creator: sameAsChannel ? null : creator };
  }
  const name = nom.submittedBy?.name ?? nom.submittedBy?.username ?? "Unbekannt";
  return { channel: name, creator: null };
}
