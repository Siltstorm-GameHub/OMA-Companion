// ============================================
// Battle Cards — MOBA-Style-Skin-Wrapper
// ============================================
// Umschließt alle battle-cards-Routen (Hub, Kampf-Replays, Live-PvP,
// Challenges, Duel-Deck, Leaderboard, Lineup, My-Card) mit dem
// .moba-skin-Scope — siehe battle-cards-moba.css. Der Rest der App bleibt
// beim bestehenden dunklen Glass-Design; admin/battle-cards/* liegt
// außerhalb dieses Route-Segments und ist nicht betroffen.

import "@/app/battle-cards-moba.css";

export default function BattleCardsLayout({ children }: { children: React.ReactNode }) {
  return <div className="moba-skin">{children}</div>;
}
