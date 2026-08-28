// Fortschritts-Anzeige "X/Y Duplikate" unter einer Karte — reiner Anzeige-Zweck,
// noch kein Upgrade-Button/-Flow (siehe PROJECT_CONTEXT.md Upgrade-System).
// Schwellen kumulativ pro Stufe, aus dem Kontext-Dokument:
//   Standard:  Stufe 1→5 braucht 1/3/6/10/15 Duplikate insgesamt
//   Community: reduziert,        1/2/4/6/9

const STANDARD_THRESHOLDS = [1, 3, 6, 10, 15];
const COMMUNITY_THRESHOLDS = [1, 2, 4, 6, 9];

export default function DuplicateProgress({
  rarity,
  level,
  duplicates,
}: {
  rarity: "STANDARD" | "COMMUNITY";
  level: number;
  duplicates: number;
}) {
  const thresholds = rarity === "COMMUNITY" ? COMMUNITY_THRESHOLDS : STANDARD_THRESHOLDS;

  if (level >= 5) {
    return <p className="text-[10px] text-amber-400 text-center mt-1">Maximale Stufe</p>;
  }

  const needed = thresholds[level] ?? thresholds[thresholds.length - 1];
  return (
    <p className="text-[10px] text-gray-500 text-center mt-1 tabular-nums">
      {duplicates}/{needed} Duplikate
    </p>
  );
}
