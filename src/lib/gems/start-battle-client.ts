// Startet einen Kampf aus dem Browser (Hub-Karte, „Nochmal“/„Nächste Stufe“ im Ergebnisbildschirm)
// und gibt die ID des neuen Live-Kampfs zurück.

export type GemsBattleTarget = { kind: "campaign"; levelId: string } | { kind: "daily" };

export async function startGemsBattle(target: GemsBattleTarget): Promise<string> {
  const res =
    target.kind === "daily"
      ? await fetch("/api/gems/daily-challenge", { method: "POST" })
      : await fetch("/api/gems/campaign-battle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ levelId: target.levelId }),
        });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || typeof data?.id !== "string") {
    throw new Error(data?.error ?? "Kampf konnte nicht gestartet werden.");
  }
  return data.id;
}
