import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { getGameDetail } from "@/lib/games/service";
import GameCover from "@/components/GameCover";
import RankedAvatar from "@/components/RankedAvatar";
import IdeaFromButton from "@/components/community-jobs/IdeaFromButton";
import GameReactionPanel from "./GameReactionPanel";
import MissingFieldsPanel from "./MissingFieldsPanel";
import CorrectFieldsPanel from "./CorrectFieldsPanel";
import TipPanel from "./TipPanel";
import { squadMatchesFor } from "@/lib/games/matches";
import { planRoundUrl } from "@/lib/games/swipe";
import { missingFields } from "@/lib/games/edits";
import { ArrowLeft, CalendarDays, CalendarPlus, ChevronRight, ExternalLink, Pencil, Server, Users } from "@/components/icons";
import {
  GAME_GENRES, GAME_MODES, GAME_PLATFORMS, GAME_SUBSCRIPTIONS, GAME_TAGS, SESSION_LENGTHS, formatPlayers, formatPrice, labelOf,
} from "@/lib/games/options";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const game = await prisma.game.findUnique({ where: { slug }, select: { name: true, status: true } });
  return { title: game?.status === "APPROVED" ? `${game.name} · Spieleliste | OMA` : "Spieleliste | OMA" };
}

const fmtDate = (d: Date) =>
  d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "Europe/Berlin" });

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-gray-500">{label}</p>
      <p className="text-sm text-white mt-0.5">{children}</p>
    </div>
  );
}

export default async function GameDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getSessionUser();
  const detail = await getGameDetail(slug, user?.id);
  if (!detail) notFound();

  const { game, fields } = detail;
  const isModerator = !!user && hasMinRole(user.role, "moderator");
  const isAdder = !!user && game.addedById === user.id;
  // Nicht freigeschaltete Einträge sehen nur das Team und wer sie eingetragen hat
  if (game.status !== "APPROVED" && !isModerator && !(isAdder && game.status === "PENDING")) notFound();

  const players = formatPlayers(fields.minPlayers, fields.maxPlayers);
  const modes = fields.modes.map(m => GAME_MODES[m]).join(", ");
  const platforms = fields.platforms.map(p => GAME_PLATFORMS[p]).join(", ");
  const session = labelOf(SESSION_LENGTHS, fields.sessionLength);
  const chips = [...fields.genres.map(g => GAME_GENRES[g]), ...fields.tags.map(t => GAME_TAGS[t])];
  const steamUrl = game.steamAppId ? `https://store.steampowered.com/app/${game.steamAppId}/` : null;
  const addedByName = game.addedBy ? game.addedBy.username ?? game.addedBy.name : null;
  const missing = missingFields(fields);
  // Matches: genug aus einem eigenen Squad sind am Start → "Runde planen"
  const matches = user && game.status === "APPROVED" && detail.myReaction.status === "in" ? await squadMatchesFor(user.id, game.id) : [];
  // Offene Empfehlung für den GameSwipe-Drop der Woche?
  const openTip = user && game.status === "APPROVED"
    ? await prisma.gameTip.findFirst({ where: { gameId: game.id, status: { in: ["pending", "approved"] } }, select: { status: true } })
    : null;

  return (
    <div className="p-3 sm:p-6 max-w-4xl mx-auto space-y-4 sm:space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-2">
        <Link href="/spiele" className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Spieleliste
        </Link>
        {isModerator && (
          <Link href={`/admin/spiele?edit=${game.id}`} className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors">
            <Pencil className="w-3.5 h-3.5" /> Bearbeiten
          </Link>
        )}
      </div>

      {game.status !== "APPROVED" && (
        <div className="rounded-xl px-3 py-2.5 text-xs bg-amber-500/10 border border-amber-500/20 text-amber-200">
          {game.status === "PENDING"
            ? "Wartet auf Freischaltung durch das Team — erst danach erscheint das Spiel in der Liste."
            : "Ausgeblendet — nur für das Team sichtbar."}
        </div>
      )}

      {/* Kopf */}
      <div className="surface rounded-2xl overflow-hidden">
        <GameCover game={game.name} coverUrl={game.coverUrl} className="w-full aspect-[46/21] max-h-80" rounded="rounded-none" fallbackVariant="plain" brandBadge />
        <div className="p-4 sm:p-5 space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">{game.name}</h1>
              <p className="text-xs text-gray-500 mt-1">
                {[game.releaseYear, fields.isFree === true ? "Kostenlos" : fields.isFree === false ? "Kostenpflichtig" : null].filter(Boolean).join(" · ")}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              {game.status === "APPROVED" && user && (
                <Link href={`/admin/events/new?mode=event&game=${encodeURIComponent(game.slug)}`}
                  className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white transition-colors">
                  <CalendarPlus className="w-3.5 h-3.5" /> Event anlegen
                </Link>
              )}
              <IdeaFromButton
                label="Event-Idee vorschlagen"
                prefill={{
                  title: `Event-Idee: ${game.name}`,
                  ...(steamUrl ? { link: steamUrl, linkLabel: "dem Spiel" } : {}),
                  ...(game.coverUrl ? { imageUrl: game.coverUrl } : {}),
                }}
              />
            </div>
          </div>
          {(game.priceCents !== null || game.subscriptions.length > 0) && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              {game.priceCents !== null && steamUrl && (
                <a href={steamUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl px-3 py-1.5 bg-white/[0.04] border border-white/[0.08] hover:border-white/20 transition-colors">
                  {game.discountPercent > 0 && (
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded-md bg-amber-400 text-gray-950">−{game.discountPercent} %</span>
                  )}
                  <span className="text-sm font-semibold text-white">{formatPrice(game.priceCents, game.priceCurrency)}</span>
                  {game.discountPercent > 0 && game.priceInitialCents !== null && (
                    <span className="text-xs text-gray-500 line-through">{formatPrice(game.priceInitialCents, game.priceCurrency)}</span>
                  )}
                  <span className="text-[11px] text-gray-400 inline-flex items-center gap-1">auf Steam <ExternalLink className="w-3 h-3" /></span>
                </a>
              )}
              {game.subscriptions.length > 0 && (
                <span className="inline-flex flex-wrap items-center gap-1.5 text-xs text-gray-400">
                  Im Abo:
                  {game.subscriptions.map(s => (
                    <span key={s} className="px-2 py-0.5 rounded-full bg-lime-400/10 border border-lime-400/25 text-lime-200 text-[11px]">
                      {labelOf(GAME_SUBSCRIPTIONS, s) ?? s}
                    </span>
                  ))}
                </span>
              )}
            </div>
          )}
          {game.aliases.length > 0 && <p className="text-[11px] text-gray-500 -mt-1">Auch bekannt als: {game.aliases.join(", ")}</p>}
          {fields.description && <p className="text-sm text-gray-300 leading-relaxed">{fields.description}</p>}
          {chips.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {chips.map(c => (
                <span key={c} className="text-[11px] px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-gray-300">{c}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Steckbrief */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Fact label="Spielmodus">{modes || <span className="text-gray-600">unbekannt</span>}</Fact>
        <Fact label="Spieler">{players ?? <span className="text-gray-600">unbekannt</span>}</Fact>
        <Fact label="Plattformen">
          {platforms || <span className="text-gray-600">unbekannt</span>}
          {fields.crossplay && <span className="text-teal-300 text-xs"> · Crossplay</span>}
        </Fact>
        <Fact label="Rundenlänge">{session ?? <span className="text-gray-600">unbekannt</span>}</Fact>
      </div>

      <GameReactionPanel
        slug={game.slug}
        initialStats={{ ratingSum: game.ratingSum, ratingCount: game.ratingCount, inCount: game.inCount, wishCount: game.wishCount }}
        initialMine={detail.myReaction}
        initialDistribution={detail.distribution}
        canReact={game.status === "APPROVED" && !!user}
      />

      {matches.map(m => (
        <div key={m.squadId} className="rounded-2xl border border-emerald-400/30 p-4 flex items-center gap-3 flex-wrap"
          style={{ background: "linear-gradient(110deg, rgba(16,185,129,0.14), transparent 70%)" }}>
          <span className="text-2xl leading-none" aria-hidden>🎮</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">Match mit {m.squadName}: {m.count} sind am Start</p>
            <p className="text-xs text-gray-400 truncate">Mit dir: {m.others.map(o => o.name).join(", ")}</p>
          </div>
          <Link href={planRoundUrl(game.slug, m.squadId)}
            className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors">
            <CalendarPlus className="w-4 h-4" /> Runde planen
          </Link>
        </div>
      ))}

      {game.status === "APPROVED" && !!user && missing.length > 0 && (
        <MissingFieldsPanel slug={game.slug} current={fields} missing={missing} />
      )}
      {game.status === "APPROVED" && !!user && <CorrectFieldsPanel slug={game.slug} current={fields} />}
      {game.status === "APPROVED" && !!user && (
        <TipPanel slug={game.slug} initial={(openTip?.status as "approved" | "pending" | undefined) ?? null} isModerator={isModerator} />
      )}

      {/* Am Start (aus GameSwipe, öffentlich) */}
      <section className="surface rounded-2xl p-4 space-y-3">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-emerald-500/80" /> Am Start ({detail.inPeople.length})
        </h2>
        {detail.inPeople.length === 0 ? (
          <p className="text-xs text-gray-500">Noch niemand. Hast du es und würdest spielen? Dann sag oben „Am Start“.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {detail.inPeople.slice(0, 24).map(p => (
              <Link key={p.id} href={`/profile/${p.id}`} title={p.name} className="flex items-center gap-1.5 rounded-full pr-2.5 bg-white/[0.04] hover:bg-white/[0.08] transition-colors">
                <RankedAvatar userId={p.id} src={p.image} alt={p.name} size={26} />
                <span className="text-xs text-gray-200 max-w-[7rem] truncate">{p.name}</span>
              </Link>
            ))}
            {detail.inPeople.length > 24 && <span className="text-xs text-gray-500 self-center">+{detail.inPeople.length - 24}</span>}
          </div>
        )}
      </section>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Wer zockt das? */}
        <section className="surface rounded-2xl p-4 space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-teal-500/70" /> Zockt gerade
          </h2>
          {detail.players.length === 0 ? (
            <p className="text-xs text-gray-500">
              Noch niemand hat es in seinen Lieblingsspielen. Zockst du es? <Link href="/profile" className="text-teal-400 hover:text-teal-300">Im Profil eintragen →</Link>
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {detail.players.slice(0, 18).map(p => (
                <Link key={p.id} href={`/profile/${p.id}`} title={p.name} className="flex items-center gap-1.5 rounded-full pr-2.5 bg-white/[0.04] hover:bg-white/[0.08] transition-colors">
                  <RankedAvatar userId={p.id} src={p.image} alt={p.name} size={26} />
                  <span className="text-xs text-gray-200 max-w-[7rem] truncate">{p.name}</span>
                </Link>
              ))}
              {detail.players.length > 18 && <span className="text-xs text-gray-500 self-center">+{detail.players.length - 18}</span>}
            </div>
          )}
        </section>

        {/* Events & Gameserver */}
        <section className="surface rounded-2xl p-4 space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-teal-500/70" /> In der Community
          </h2>
          {detail.stats.pastEvents > 0 && (
            <p className="text-xs text-gray-400">
              Bei <span className="text-white font-semibold">{detail.stats.pastEvents}</span> {detail.stats.pastEvents === 1 ? "Event" : "Events"} gespielt
              {detail.stats.participations > 0 && <> · <span className="text-white font-semibold">{detail.stats.participations}</span> Teilnahmen</>}
              {detail.stats.lastPlayedAt && <> · zuletzt {fmtDate(detail.stats.lastPlayedAt)}</>}
            </p>
          )}
          {detail.events.length === 0 && detail.servers.length === 0 ? (
            <p className="text-xs text-gray-500">Noch kein Event und kein Gameserver zu diesem Spiel.</p>
          ) : (
            <ul className="space-y-1">
              {detail.servers.map(s => (
                <li key={s.id}>
                  <Link href="/servers" className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/[0.04] text-sm text-gray-200">
                    <Server className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    <span className="flex-1 truncate">{s.name}</span>
                    <span className={`text-[10px] ${s.isOnline ? "text-teal-300" : "text-gray-600"}`}>{s.isOnline ? "Online" : "Offline"}</span>
                  </Link>
                </li>
              ))}
              {detail.events.map(e => {
                const isNext = e.id === detail.stats.nextEvent?.id;
                return (
                <li key={e.id}>
                  <Link href={`/tournament/${e.id}`}
                    className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-200 ${isNext ? "bg-teal-500/10 border border-teal-500/25 hover:bg-teal-500/15" : "hover:bg-white/[0.04]"}`}>
                    <CalendarDays className={`w-3.5 h-3.5 shrink-0 ${isNext ? "text-teal-300" : "text-gray-500"}`} />
                    <span className="flex-1 truncate">
                      {isNext && <span className="text-[10px] font-semibold text-teal-300 mr-1.5">NÄCHSTES</span>}
                      {e.title}
                    </span>
                    <span className="text-[10px] text-gray-500 shrink-0">{fmtDate(e.startAt)}</span>
                    <ChevronRight className="w-3 h-3 text-gray-600 shrink-0" />
                  </Link>
                </li>
                );
              })}
              {detail.eventCount > detail.events.length && (
                <li className="text-[11px] text-gray-500 px-2">… und {detail.eventCount - detail.events.length} weitere Events</li>
              )}
            </ul>
          )}
        </section>
      </div>

      <div className="text-[11px] text-gray-600 flex flex-wrap items-center gap-x-3 gap-y-1">
        {addedByName && <span>Hinzugefügt von {addedByName}</span>}
        {steamUrl && (
          <a href={steamUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-gray-300">
            Angaben teils von Steam <ExternalLink className="w-3 h-3" />
          </a>
        )}
        {game.igdbId && <span>Angaben teils von IGDB.com</span>}
      </div>
    </div>
  );
}
