import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { awardProfileCompletionIfNeeded } from "@/lib/profile-completion";

/**
 * Setzt oder entfernt das eigene Profil-Banner.
 *
 * Nimmt bewusst nur eine URL entgegen, nicht die Datei selbst — hochgeladen
 * wird über /api/upload (kind: "profile-banner"), das den Blob-Store und die
 * Grössen-/Formatprüfung übernimmt.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

  const { bannerUrl } = await req.json();

  // Nur https zulassen. Ohne diese Prüfung liessen sich hier javascript:- oder
  // data:-URLs hinterlegen, die später ungefiltert in ein src-Attribut wandern.
  let cleaned: string | null = null;
  if (typeof bannerUrl === "string" && bannerUrl.trim()) {
    const value = bannerUrl.trim();
    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      return NextResponse.json({ error: "Ungültige URL" }, { status: 400 });
    }
    if (parsed.protocol !== "https:") {
      return NextResponse.json({ error: "Nur https-URLs erlaubt" }, { status: 400 });
    }
    cleaned = value;
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data:  { bannerUrl: cleaned },
  });

  if (cleaned) await awardProfileCompletionIfNeeded(session.user.id, "PROFILE_BANNER");

  return NextResponse.json({ ok: true, bannerUrl: cleaned });
}
