import { NextRequest, NextResponse } from "next/server";

/** Kurzlink für Einladungs-Sessions (/z/<slug>) — so kurz, dass Zuschauer ihn aus dem Overlay abtippen können. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const target = new URL("/zusammen", req.nextUrl.origin);
  target.searchParams.set("s", slug.toLowerCase());
  return NextResponse.redirect(target);
}
