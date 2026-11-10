import { NextRequest, NextResponse } from "next/server";
import { findGameSlug } from "@/lib/games/service";

/**
 * Kurzlink aus Profil/Events: /spiele/finde?name=Rocket+League&appId=252950
 * → Detailseite, wenn das Spiel in der Spieleliste steht, sonst die Liste mit vorausgefüllter Suche.
 */
export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name")?.trim().slice(0, 80) || null;
  const rawId = req.nextUrl.searchParams.get("appId") ?? "";
  const appId = /^\d{1,9}$/.test(rawId) ? Number(rawId) : null;

  const slug = await findGameSlug(name, appId);
  const target = new URL(slug ? `/spiele/${slug}` : "/spiele", req.nextUrl.origin);
  if (!slug && name) target.searchParams.set("q", name);
  return NextResponse.redirect(target);
}
