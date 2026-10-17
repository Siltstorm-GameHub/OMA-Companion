// ============================================
// GET /api/gems/campaign
// ============================================
// Liefert die komplette Kampagnen-Karte (Level-Namen, Sterne, Freischaltung)
// für den eingeloggten User — für die initiale Anzeige und zum Auffrischen
// nach einem abgeschlossenen Kampf (siehe CampaignMap.tsx).

import { auth } from "@/auth";
import { getCampaignBoard } from "@/lib/gems/campaign";
import { CAMPAIGN_CHAPTER_BACKGROUND, CAMPAIGN_CHAPTER_INTRO, CAMPAIGN_CHAPTER_NAME } from "@/lib/gems/campaign-levels";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Nicht eingeloggt." }, { status: 401 });

  const levels = await getCampaignBoard(session.user.id);
  return Response.json({
    chapterName: CAMPAIGN_CHAPTER_NAME,
    chapterIntro: CAMPAIGN_CHAPTER_INTRO,
    chapterBackground: CAMPAIGN_CHAPTER_BACKGROUND,
    levels,
  });
}
