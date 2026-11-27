import type { Metadata } from "next";
import { getSessionUser } from "@/lib/roles";
import WallpaperStudio from "@/components/hub/WallpaperStudio";
import { Wand2 } from "@/components/icons";

export const metadata: Metadata = { title: "Wallpaper-Studio | OMA Hub" };

/**
 * Profilbild über den Next-Bildoptimierer (same-origin) laden: Ein direkt vom Discord-CDN geladenes
 * Bild würde das Canvas "verschmutzen" (tainted) und den PNG-Export blockieren. Discord liefert
 * mit ?size=1024 eine ausreichend große Vorlage.
 */
function avatarProxy(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname === "cdn.discordapp.com") u.searchParams.set("size", "1024");
    return `/_next/image?url=${encodeURIComponent(u.toString())}&w=1080&q=75`;
  } catch {
    return null;
  }
}

export default async function HubWallpaperPage() {
  const user = await getSessionUser();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-primary">
          <Wand2 className="size-5" />
          <span className="text-xs font-semibold uppercase tracking-widest">Wallpaper-Studio</span>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-fg sm:text-3xl">Dein persönliches OMA-Wallpaper</h1>
        <p className="text-sm text-muted">
          Nimm dein Profilbild oder ein Bild deiner Wahl, such dir eine Vorlage aus und lade dein Hintergrundbild für Desktop oder Handy herunter.
        </p>
      </header>

      <WallpaperStudio userName={user?.name ?? user?.username ?? "OMA Member"} avatarSrc={avatarProxy(user?.image)} />
    </div>
  );
}
