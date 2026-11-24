import type { Metadata } from "next";
import { Glyph } from "@/components/ui/Glyph";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { getGameDetail } from "@/lib/games/service";
import GameCover from "@/components/GameCover";
import { buttonClasses } from "@/components/ui/button-styles";
import RankedAvatar from "@/components/RankedAvatar";
import IdeaFromButton from "@/components/community-jobs/IdeaFromButton";
import GameReactionPanel from "./GameReactionPanel";
import MissingFieldsPanel from "./MissingFieldsPanel";
import CorrectFieldsPanel from "./CorrectFieldsPanel";
import TipPanel from "./TipPanel";
import { userMatchFor } from "@/lib/games/matches";
import { othersLabel, planRoundUrl } from "@/lib/games/swipe";
import { missingFields } from "@/lib/games/edits";
import { ArrowLeft, CalendarDays, CalendarPlus, ChevronRight, ExternalLink, Pencil, Server, Users } from "@/components/icons";
import {
  GAME_GENRES, GAME_MODES, GAME_PLATFORMS, GAME_SUBSCRIPTIONS, GAME_TAGS, SESSION_LENGTHS, formatPlayers, formatPrice, labelOf,
} from "@/lib/games/options";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const game = await prisma.game.findUnique({ where: { slug }, select: { name: true, status: true } });
  return { title: game?.status === "APPROVED" ? `${game.name} · OMA GameSwipe | OMA` : "OMA GameSwipe | OMA" };
}

const fmtDate = (d: Date) =>
  d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "Europe/Berlin" });

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-control bg-surface-2 border border-line px-3 py-2">
      <p className="text-xs uppercase tracking-wider text-subtle">{label}</p>
      <p className="text-sm text-fg mt-0.5">{children}</p>
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
  // Match: man ist am Start und andere User auch → "Runde planen"
  const match = user && game.status === "APPROVED" && detail.myReaction.status === "in" ? await userMatchFor(user.id, game.id) : null;
  // Offene Empfehlung für den GameSwipe-Drop der Woche?
  const openTip = user && game.status === "APPROVED"
    ? await prisma.gameTip.findFirst({ where: { gameId: game.id, status: { in: ["pending", "approved"] } }, select: { status: true } })
    : null;

  return (
    <div className="p-3 sm:p-6 max-w-4xl mx-auto space-y-4 sm:space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-2">
        <Link href="/spiele" className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-fg transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> GameSwipe
        </Link>
        {isModerator && (
          <Link href={`/admin/spiele?edit=${game.id}`} className="inline-flex items-center gap-1.5 text-xs text-subtle hover:text-fg transition-colors">
            <Pencil className="w-3.5 h-3.5" /> Bearbeiten
          </Link>
        )}
      </div>

      {game.status !== "APPROVED" && (
        <div className="rounded-control px-3 py-2.5 text-xs bg-warning-soft border border-warning/20 text-warning">
          {game.status === "PENDING"
            ? "Wartet auf Freischaltung durch das Team — erst danach erscheint das Spiel in der Liste."
            : "Ausgeblendet — nur für das Team sichtbar."}
        </div>
      )}

      {/* Kopf */}
      <div className="surface rounded-card overflow-hidden">
        <GameCover game={game.name} coverUrl={game.coverUrl} className="w-full aspect-[46/21] max-h-80" rounded="rounded-none" fallbackVariant="plain" brandBadge />
        <div className="p-4 sm:p-5 space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-fg tracking-tight leading-tight">{game.name}</h1>
              <p className="text-xs text-subtle mt-1">
                {[game.releaseYear, fields.isFree === true ? "Kostenlos" : fields.isFree === false ? "Kostenpflichtig" : null].filter(Boolean).join(" · ")}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              {game.status === "APPROVED" && user && (
                <Link href={`/events/verwalten/neu?mode=event&game=${encodeURIComponent(game.slug)}`}
                  className={buttonClasses("primary", "md")}>
                  <CalendarPlus className="size-4" /> Event anlegen
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
                  className="inline-flex items-center gap-2 rounded-control px-3 py-1.5 bg-line border border-line hover:border-line-strong transition-colors max-lg:min-h-10">
                  {game.discountPercent > 0 && (
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded-md bg-warning text-canvas">−{game.discountPercent} %</span>
                  )}
                  <span className="text-sm font-semibold text-fg">{formatPrice(game.priceCents, game.priceCurrency)}</span>
                  {game.discountPercent > 0 && game.priceInitialCents !== null && (
                    <span className="text-xs text-subtle line-through">{formatPrice(game.priceInitialCents, game.priceCurrency)}</span>
                  )}
                  <span className="text-xs text-muted inline-flex items-center gap-1">auf Steam <ExternalLink className="w-3 h-3" /></span>
                </a>
              )}
              {game.subscriptions.length > 0 && (
                <span className="inline-flex flex-wrap items-center gap-1.5 text-xs text-muted">
                  Im Abo:
                  {game.subscriptions.map(s => (
                    <span key={s} className="px-2 py-0.5 rounded-full bg-lime-400/10 border border-lime-400/25 text-lime-200 text-xs">
                      {labelOf(GAME_SUBSCRIPTIONS, s) ?? s}
                    </span>
                  ))}
                </span>
              )}
            </div>
          )}
          {game.aliases.length > 0 && <p className="text-xs text-subtle -mt-1">Auch bekannt als: {game.aliases.join(", ")}</p>}
          {fields.description && <p className="text-sm text-fg/85 leading-relaxed">{fields.description}</p>}
          {chips.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {chips.map(c => (
                <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-line border border-line text-fg/85">{c}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Deine Reaktion direkt unter dem Kopf: das, was man hier am häufigsten tut */}
      <GameReactionPanel
        slug={game.slug}
        initialStats={{ ratingSum: game.ratingSum, ratingCount: game.ratingCount, inCount: game.inCount, wishCount: game.wishCount }}
        initialMine={detail.myReaction}
        initialDistribution={detail.distribution}
        canReact={game.status === "APPROVED" && !!user}
      />

      {match && (
        <div className="rounded-card border border-success/30 bg-success-soft p-4 flex items-center gap-3 flex-wrap">
          <Glyph name="gamepad" className="size-6 text-primary-fg" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-fg">Match: {match.count} sind am Start</p>
            <p className="text-xs text-muted truncate">Mit dir: {othersLabel(match)}</p>
          </div>
          <Link href={planRoundUrl(game.slug)} className={buttonClasses("primary", "md")}>
            <CalendarPlus className="w-4 h-4" /> Runde planen
          </Link>
        </div>
      )}

      {/* Steckbrief */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Fact label="Spielmodus">{modes || <span className="text-subtle">unbekannt</span>}</Fact>
        <Fact label="Spieler">{players ?? <span className="text-subtle">unbekannt</span>}</Fact>
        <Fact label="Plattformen">
          {platforms || <span className="text-subtle">unbekannt</span>}
          {fields.crossplay && <span className="text-primary-fg text-xs"> · Crossplay</span>}
        </Fact>
        <Fact label="Rundenlänge">{session ?? <span className="text-subtle">unbekannt</span>}</Fact>
      </div>

      {/* Leute: wer ist am Start, wer zockt es gerade */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Am Start (aus GameSwipe, öffentlich) */}
        <section className="surface rounded-card p-4 space-y-3">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-widest flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-success" /> Am Start ({detail.inPeople.length})
          </h2>
          {detail.inPeople.length === 0 ? (
            <p className="text-xs text-subtle">Noch niemand. Hast du es und würdest spielen? Dann sag oben „Am Start“.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {detail.inPeople.slice(0, 24).map(p => (
                <Link key={p.id} href={`/profile/${p.id}`} title={p.name} className="flex items-center gap-1.5 rounded-full pr-2.5 bg-line hover:bg-line transition-colors">
                  <RankedAvatar userId={p.id} src={p.image} alt={p.name} size={26} />
                  <span className="text-xs text-fg/90 max-w-[7rem] truncate">{p.name}</span>
                </Link>
              ))}
              {detail.inPeople.length > 24 && <span className="text-xs text-subtle self-center">+{detail.inPeople.length - 24}</span>}
            </div>
          )}
        </section>

        {/* Wer zockt das? */}
        <section className="surface rounded-card p-4 space-y-3">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-widest flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-primary/70" /> Zockt gerade
          </h2>
          {detail.players.length === 0 ? (
            <p className="text-xs text-subtle">
              Noch niemand hat es in seinen Lieblingsspielen. Zockst du es? <Link href="/profile" className="text-primary hover:text-primary-fg">Im Profil eintragen →</Link>
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {detail.players.slice(0, 18).map(p => (
                <Link key={p.id} href={`/profile/${p.id}`} title={p.name} className="flex items-center gap-1.5 rounded-full pr-2.5 bg-line hover:bg-line transition-colors">
                  <RankedAvatar userId={p.id} src={p.image} alt={p.name} size={26} />
                  <span className="text-xs text-fg/90 max-w-[7rem] truncate">{p.name}</span>
                </Link>
              ))}
              {detail.players.length > 18 && <span className="text-xs text-subtle self-center">+{detail.players.length - 18}</span>}
            </div>
          )}
        </section>

      </div>

      {/* Events & Gameserver */}
      <section className="surface rounded-card p-4 space-y-3">
        <h2 className="text-xs font-semibold text-muted uppercase tracking-widest flex items-center gap-1.5">
          <CalendarDays className="w-3.5 h-3.5 text-primary/70" /> In der Community
        </h2>
        {detail.stats.pastEvents > 0 && (
          <p className="text-xs text-muted">
            Bei <span className="text-fg font-semibold">{detail.stats.pastEvents}</span> {detail.stats.pastEvents === 1 ? "Event" : "Events"} gespielt
            {detail.stats.participations > 0 && <> · <span className="text-fg font-semibold">{detail.stats.participations}</span> Teilnahmen</>}
            {detail.stats.lastPlayedAt && <> · zuletzt {fmtDate(detail.stats.lastPlayedAt)}</>}
          </p>
        )}
        {detail.events.length === 0 && detail.servers.length === 0 ? (
          <p className="text-xs text-subtle">Noch kein Event und kein Gameserver zu diesem Spiel.</p>
        ) : (
          <ul className="space-y-1">
            {detail.servers.map(s => (
              <li key={s.id}>
                <Link href="/servers" className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-line text-sm text-fg/90 max-lg:min-h-10">
                  <Server className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="flex-1 truncate">{s.name}</span>
                  <span className={`text-xs ${s.isOnline ? "text-primary-fg" : "text-subtle"}`}>{s.isOnline ? "Online" : "Offline"}</span>
                </Link>
              </li>
            ))}
            {detail.events.map(e => {
              const isNext = e.id === detail.stats.nextEvent?.id;
              return (
              <li key={e.id}>
                <Link href={`/tournament/${e.id}`}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-fg/90 ${isNext ? "bg-primary/10 border border-primary/25 hover:bg-primary/15" : "hover:bg-line"} max-lg:min-h-10`}>
                  <CalendarDays className={`w-3.5 h-3.5 shrink-0 ${isNext ? "text-primary-fg" : "text-subtle"}`} />
                  <span className="flex-1 truncate">
                    {isNext && <span className="text-xs font-semibold text-primary-fg mr-1.5">NÄCHSTES</span>}
                    {e.title}
                  </span>
                  <span className="text-xs text-subtle shrink-0">{fmtDate(e.startAt)}</span>
                  <ChevronRight className="w-3 h-3 text-subtle shrink-0" />
                </Link>
              </li>
              );
            })}
            {detail.eventCount > detail.events.length && (
              <li className="text-xs text-subtle px-2">… und {detail.eventCount - detail.events.length} weitere Events</li>
            )}
          </ul>
        )}
      </section>

      {/* Mithelfen: fehlende Angaben, Korrekturen, Empfehlung für den Drop — gesammelt am Ende */}
      {game.status === "APPROVED" && !!user && (
        <section aria-labelledby="help-title" className="space-y-3">
          <h2 id="help-title" className="text-xs font-semibold uppercase tracking-widest text-subtle">Mithelfen</h2>
          {missing.length > 0 && (
            <MissingFieldsPanel slug={game.slug} current={fields} missing={missing} />
          )}
          <CorrectFieldsPanel slug={game.slug} current={fields} />
          <TipPanel slug={game.slug} initial={(openTip?.status as "approved" | "pending" | undefined) ?? null} isModerator={isModerator} />
        </section>
      )}

      <div className="text-xs text-subtle flex flex-wrap items-center gap-x-3 gap-y-1">
        {addedByName && <span>Hinzugefügt von {addedByName}</span>}
        {steamUrl && (
          <a href={steamUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-fg/85">
            Angaben teils von Steam <ExternalLink className="w-3 h-3" />
          </a>
        )}
        {game.igdbId && <span>Angaben teils von IGDB.com</span>}
      </div>
    </div>
  );
}
