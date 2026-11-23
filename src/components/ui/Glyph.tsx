import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle, Award, Bell, Briefcase, CalendarDays, Check, CheckCircle2, Clapperboard, Clock, Coins, Crown, Dices,
  Eye, Flame, Gamepad2, Gem, Handshake, HelpCircle, Images, Lock, Megaphone, MessageCircle, Rocket, ScrollText, StickyNote,
  Sparkles, Star, Swords, Target, ThumbsUp, Trophy, Users, Vote, Volume2, X,
} from "@/components/icons";
import type { QuestType } from "@/lib/quests-meta";

/*
 * Glyph: die App-Icons (gefüllte Piktogramme) unter sprechenden Namen — Ersatz für Emojis, die in der
 * Oberfläche als Symbol dienen. Emojis sehen auf jedem Gerät anders aus und passen nicht zu den Icons.
 * Emojis in Inhalten (Beiträge, Reaktionen, Discord-/Push-Texte) bleiben bewusst Emojis.
 */
export const GLYPHS = {
  trophy: Trophy, handshake: Handshake, calendar: CalendarDays, voice: Volume2, chat: MessageCircle,
  swords: Swords, vote: Vote, target: Target, coins: Coins, scroll: ScrollText, gamepad: Gamepad2, bell: Bell,
  award: Award, check: CheckCircle2, tick: Check, cross: X, clock: Clock, clip: Clapperboard, megaphone: Megaphone,
  eye: Eye, fire: Flame, rocket: Rocket, star: Star, users: Users, crown: Crown, images: Images, lock: Lock,
  pin: StickyNote, warning: AlertTriangle, question: HelpCircle, sparkles: Sparkles, dice: Dices, briefcase: Briefcase,
  gem: Gem, thumbs: ThumbsUp,
} satisfies Record<string, LucideIcon>;

export type GlyphName = keyof typeof GLYPHS;

export function Glyph({ name, className = "size-4" }: { name: GlyphName; className?: string }) {
  const Icon = GLYPHS[name];
  return <Icon className={className} aria-hidden />;
}

/** Quest-Typ → Glyph (ersetzt die Emojis aus QUEST_TYPE_META.icon in der Oberfläche) */
export const QUEST_GLYPH: Record<QuestType, GlyphName> = {
  VOICE_MINUTES: "voice",
  MESSAGES: "chat",
  EVENT_ATTEND: "calendar",
  TOURNAMENT: "swords",
  POLL_VOTE: "vote",
  DAILY_SPIN: "dice",
  DUEL_PLAYED: "swords",
  PREDICTION_MADE: "target",
  JOB_CLAIM: "briefcase",
  BATTLE_CARD_DUEL: "gem",
  COMMUNITY_JOB_VOTE: "thumbs",
  GAME_SWIPE: "gamepad",
};

export function QuestGlyph({ type, className }: { type: string; className?: string }) {
  return <Glyph name={QUEST_GLYPH[type as QuestType] ?? "scroll"} className={className} />;
}

/** Benachrichtigungs-Typ → Glyph (Glocken-Panel und /benachrichtigungen) */
export const NOTIFICATION_GLYPH: Record<string, GlyphName> = {
  badge: "award", quest: "scroll", event_result: "check", event_start: "clock", points: "star",
  coins: "coins", clip: "clip", admin: "megaphone", game: "gamepad", event_comment: "chat",
};

export function NotificationGlyph({ type, className }: { type: string; className?: string }) {
  return <Glyph name={NOTIFICATION_GLYPH[type] ?? "bell"} className={className} />;
}
