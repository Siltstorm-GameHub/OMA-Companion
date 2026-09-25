// ============================================
// Battle Cards — MOBA-Style-Skin-Wrapper
// ============================================
// Umschließt alle battle-cards-Routen (Hub, Kampf-Replays, Live-PvP,
// Challenges, Duel-Deck, Leaderboard, Lineup, My-Card) mit dem
// .moba-skin-Scope — siehe battle-cards-moba.css. Der Rest der App bleibt
// beim bestehenden dunklen Glass-Design; admin/battle-cards/* liegt
// außerhalb dieses Route-Segments und ist nicht betroffen.
//
// Eigene Schrift statt der App-weiten Russo One — vierter Anlauf: Cinzel (zu
// verspielt/mittelalterlich, bei kleinen Labels kaum lesbar) → Rajdhani (zu
// technisch/dünn) → Titan One (traf den Gold/Outline-Effekt, aber die runde
// Comic-Form passte nicht zum Diablo-artigen Vorbild) → jetzt Metamorphous:
// sturdy gotische Serifen im Stil klassischer Dark-Fantasy-RPG-UIs (Diablo/
// WoW-artig), bleibt zusammen mit dem Gold-Fill+dunklem-Outline-Textstil
// unten (.moba-skin .font-battle) auch bei kleinen Tab-Labels lesbar (lokal
// gegen 3 weitere Kandidaten geprüft). --font-battle wird nur INNERHALB von
// .moba-skin überschrieben — die bestehende .font-battle-Klasse greift
// dadurch automatisch überall.

import { Metamorphous } from "next/font/google";
import "@/app/battle-cards-moba.css";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getHeroSetup } from "@/lib/battle-cards/hero-setup";
import { resolveAvatarsForCards, toCardData } from "@/lib/battle-cards/card-view";
import { defaultTeConfig, sanitizeTeConfig } from "@/lib/te-character";
import HeroSetup from "@/components/battle-cards/HeroSetup";

const metamorphous = Metamorphous({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-battle",
  display: "swap",
});

// Solange die Helden-Einrichtung (Aussehen → Klasse & Werte → Start-Pack) offen ist, ersetzt sie ALLE
// Seiten dieses Bereichs — wer Battle Cards öffnet, erstellt zuerst seinen Charakter.
export default async function BattleCardsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const setup = session?.user?.id ? await getHeroSetup(session.user.id) : null;

  if (setup && setup.step !== "done") {
    const avatars = await resolveAvatarsForCards([setup.card]);
    const character = sanitizeTeConfig(setup.card.teCharacter);
    const standardCards = setup.step === "pack" ? await prisma.card.findMany({ where: { rarity: "STANDARD" }, orderBy: { name: "asc" } }) : [];
    return (
      <div className={`moba-skin ${metamorphous.variable}`}>
        <HeroSetup
          step={setup.step}
          hero={toCardData(setup.card, avatars)}
          character={character ?? defaultTeConfig()}
          hasCharacter={!!character}
          standardCards={standardCards.map((c) => toCardData(c))}
        />
      </div>
    );
  }

  return <div className={`moba-skin ${metamorphous.variable}`}>{children}</div>;
}
