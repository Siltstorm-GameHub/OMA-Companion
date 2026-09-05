import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/roles";
import { getMancaveConfig, mancaveVisibleFor } from "@/lib/mancave-config";
import { loadMancaveData } from "@/lib/mancave-data-loader";
import MancaveClient from "./MancaveClient";

export default async function MancavePage() {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  // Solange mancave_enabled aus ist, ist die Mancave admin-only — Nicht-Admins
  // landen unauffällig auf der ganz normalen Profilseite, ganz wie /zimmer.
  const mancaveCfg = await getMancaveConfig();
  if (!mancaveVisibleFor(mancaveCfg, me.role)) redirect("/profile");

  const data = await loadMancaveData(me.id);

  return <MancaveClient data={data} />;
}
