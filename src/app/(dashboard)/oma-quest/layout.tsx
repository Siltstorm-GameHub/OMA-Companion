import type { ReactNode } from "react";
import "@/app/oma-quest-game.css";

// Spiel-Look für alle OMA-Quest-Seiten (Weltkarte, Locations, Editor); siehe app/oma-quest-game.css.
export default function OmaQuestLayout({ children }: { children: ReactNode }) {
  return <div className="oq-skin">{children}</div>;
}
