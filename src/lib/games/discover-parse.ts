/**
 * GameSwipe-Entdecken: reine Auswertungen ohne Netzwerk (siehe deck-plan.test.ts) — Epic-Gratisspiele,
 * Steam-Suchergebnisse und die Drop-Woche (Europe/Berlin).
 */

// ── Epic Games Store: aktuelle Gratisspiele ─────────────────────────────────────

interface EpicOffer { startDate?: string; endDate?: string; discountSetting?: { discountType?: string; discountPercentage?: number } }
interface EpicElement {
  title?: string;
  productSlug?: string | null;
  urlSlug?: string | null;
  offerType?: string;
  keyImages?: { type?: string; url?: string }[];
  catalogNs?: { mappings?: { pageSlug?: string; pageType?: string }[] | null };
  offerMappings?: { pageSlug?: string; pageType?: string }[] | null;
  price?: { totalPrice?: { discountPrice?: number; originalPrice?: number } };
  promotions?: { promotionalOffers?: { promotionalOffers?: EpicOffer[] }[] } | null;
}
export interface EpicFreeGame {
  title: string;
  startsAt: string;
  endsAt: string;
  imageUrl: string | null;
  storeUrl: string;
}

const EPIC_WIDE = ["OfferImageWide", "DieselStoreFrontWide", "featuredMedia", "Thumbnail"];

/** Antwort von freeGamesPromotions → Spiele, die gerade 100 % reduziert sind. */
export function parseEpicFreeGames(json: unknown, now = new Date()): EpicFreeGame[] {
  const elements = (json as { data?: { Catalog?: { searchStore?: { elements?: EpicElement[] } } } })
    ?.data?.Catalog?.searchStore?.elements;
  if (!Array.isArray(elements)) return [];
  const out: EpicFreeGame[] = [];
  for (const el of elements) {
    const title = el.title?.trim();
    if (!title || /mystery game/i.test(title)) continue;
    if (el.offerType && !["BASE_GAME", "BUNDLE", "OTHERS"].includes(el.offerType)) continue;
    const offer = (el.promotions?.promotionalOffers ?? [])
      .flatMap(p => p.promotionalOffers ?? [])
      .find(o => {
        const start = o.startDate ? Date.parse(o.startDate) : NaN;
        const end = o.endDate ? Date.parse(o.endDate) : NaN;
        return o.discountSetting?.discountPercentage === 0 && start <= now.getTime() && end > now.getTime();
      });
    if (!offer) continue;
    if (el.price?.totalPrice && el.price.totalPrice.discountPrice !== 0) continue;
    const page = [...(el.catalogNs?.mappings ?? []), ...(el.offerMappings ?? [])].find(m => m.pageType === "productHome")?.pageSlug
      ?? el.productSlug ?? el.urlSlug ?? null;
    const slug = page?.replace(/\/home$/, "");
    const img = EPIC_WIDE.map(t => el.keyImages?.find(k => k.type === t)?.url).find(u => u?.startsWith("https://")) ?? null;
    out.push({
      title,
      startsAt: new Date(offer.startDate!).toISOString(),
      endsAt: new Date(offer.endDate!).toISOString(),
      imageUrl: img,
      storeUrl: slug ? `https://store.epicgames.com/de/p/${encodeURIComponent(slug)}` : "https://store.epicgames.com/de/free-games",
    });
  }
  return out;
}

/** App-IDs aus Steams Suchergebnissen (json=1) — die ID steckt nur in der Bild-URL (…/apps/<id>/…). */
export function steamSearchAppIds(json: unknown): number[] {
  const items = (json as { items?: { logo?: string }[] })?.items ?? [];
  return items
    .map(i => Number(/\/apps\/(\d+)\//.exec(i.logo ?? "")?.[1]))
    .filter(id => Number.isInteger(id) && id > 0);
}

// ── Drop-Woche (Montag 00:00 bis Montag 00:00, Europe/Berlin) ────────────────────

function berlinParts(d: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(d);
  const n = (t: string) => Number(parts.find(p => p.type === t)?.value);
  return { y: n("year"), m: n("month"), d: n("day"), h: n("hour"), min: n("minute"), s: n("second") };
}

/** Mitternacht (Europe/Berlin) des Kalendertags y-m-d als Zeitpunkt. */
function berlinMidnight(y: number, m: number, d: number): Date {
  const guess = Date.UTC(y, m - 1, d);
  const p = berlinParts(new Date(guess));
  const offset = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s) - guess;
  return new Date(guess - offset);
}

export function berlinWeek(now = new Date()): { key: string; startsAt: Date; endsAt: Date } {
  const p = berlinParts(now);
  const day = new Date(Date.UTC(p.y, p.m - 1, p.d));
  const weekday = (day.getUTCDay() + 6) % 7; // 0 = Montag
  const monday = new Date(day.getTime() - weekday * 86_400_000);
  // ISO-Woche: die Woche gehört zum Jahr ihres Donnerstags
  const thursday = new Date(monday.getTime() + 3 * 86_400_000);
  const jan1 = Date.UTC(thursday.getUTCFullYear(), 0, 1);
  const week = Math.floor((thursday.getTime() - jan1) / (7 * 86_400_000)) + 1;
  const startsAt = berlinMidnight(monday.getUTCFullYear(), monday.getUTCMonth() + 1, monday.getUTCDate());
  const next = new Date(monday.getTime() + 7 * 86_400_000);
  const endsAt = berlinMidnight(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
  return { key: `${thursday.getUTCFullYear()}-W${String(week).padStart(2, "0")}`, startsAt, endsAt };
}
