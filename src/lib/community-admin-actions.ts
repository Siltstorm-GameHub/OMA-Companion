/** Aktionen im Admin-Protokoll der Community-Jobs (client-sicher, kein Prisma). */

export const ADMIN_ACTIONS: Record<string, string> = {
  application_approve: "Bewerbung genehmigt",
  application_reject: "Bewerbung abgelehnt",
  member_revoke: "Job entzogen",
  member_reassign: "Job übergeben",
  member_warn: "Verwarnung ausgesprochen",
  member_contract: "Vertrag angepasst",
  member_badge: "Abzeichen-Stufe gesetzt",
  dispute_upheld: "Anfechtung: Bewertung bestätigt",
  dispute_overturned: "Anfechtung: Bewertung gestrichen",
  content_hide: "Beitrag ausgeblendet",
  content_unhide: "Beitrag wieder eingeblendet",
  content_delete: "Inhalt gelöscht",
  marketing_confirm: "Marketing-Post als gepostet bestätigt",
  marketing_unconfirm: "Bestätigung zurückgenommen",
  idea_status: "Ideen-Status geändert",
  idea_event_draft: "Event-Entwurf aus Idee angelegt",
  slots_change: "Plätze geändert",
  tiers_change: "Gehaltsstufen geändert",
  bonus_change: "Aktivitäts-Bonus geändert",
  channel_change: "Ankündigungskanal geändert",
  testmode_change: "Testmodus geändert",
  texts_change: "Job-Texte geändert",
  payout_run: "Auszahlung manuell ausgeführt",
};

export function adminActionLabel(action: string): string {
  return ADMIN_ACTIONS[action] ?? action;
}
