import { NextRequest, NextResponse } from "next/server";
import { requireWidgetKey } from "@/lib/widgetAuth";
import { loadSeriesRanking } from "@/lib/seriesRanking";

/**
 * GET /api/widget/series/[seriesId]/ranking
 *
 * Live-Gesamttabelle einer Event-Reihe fürs Widget — reine Auth-Huelle um loadSeriesRanking()
 * (src/lib/seriesRanking.ts), die auch die Overlay-Gesamttabelle nutzt, damit beide Ansichten
 * exakt dieselben Zahlen zeigen.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ seriesId: string }> }) {
  const unauthorized = requireWidgetKey(req);
  if (unauthorized) return unauthorized;

  const { seriesId } = await params;
  const result = await loadSeriesRanking(seriesId);
  if (!result) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  return NextResponse.json(result);
}
