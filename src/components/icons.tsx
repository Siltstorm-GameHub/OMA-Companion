// AUTOMATISCH ZUSAMMENGESTELLT – Zuordnung Lucide-Name -> Pictoicon (public/icons/ui/).
// Drop-in-Ersatz für lucide-react: gleiche Namen, gleiche Nutzung (className für Größe,
// Farbe über currentColor). strokeWidth/fill werden ignoriert, die Glyphen sind gefüllt.
import type { LucideIcon, LucideProps } from "lucide-react";

/** Wie bei Lucide: className für Größe, size/width/height optional, Farbe über currentColor. */
function make(file: string): LucideIcon {
  const src = `url(/icons/ui/${file}.png)`;
  function Pi({ className = "", style, size, width, height, color }: LucideProps) {
    const hasSize = /(^|\s)(size|w)-/.test(className);
    const w = width ?? size ?? (hasSize ? undefined : 24);
    const h = height ?? size ?? (hasSize ? undefined : 24);
    return (
      <span
        aria-hidden
        className={`inline-block shrink-0 ${className}`}
        style={{
          width: w, height: h,
          backgroundColor: (color as string | undefined) ?? "currentColor",
          WebkitMaskImage: src, maskImage: src,
          WebkitMaskSize: "contain", maskSize: "contain",
          WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
          WebkitMaskPosition: "center", maskPosition: "center",
          ...style,
        }}
      />
    );
  }
  return Pi as unknown as LucideIcon;
}

export const AlertCircle = make("alert");
export const AlertTriangle = make("warning");
export const Archive = make("folder");
export const ArrowDown = make("arrow-down");
export const ArrowLeft = make("arrow-backward");
export const ArrowRight = make("arrow-forward");
export const ArrowUp = make("arrow-up");
export const AtSign = make("account");
export const Award = make("award");
export const BarChart2 = make("ranking");
export const Bell = make("bell");
export const BellOff = make("bell-mute");
export const BellRing = make("bell");
export const BookOpen = make("book-0");
export const Briefcase = make("bag");
export const Calendar = make("calendar");
export const CalendarDays = make("calendar");
export const Camera = make("camera");
export const Check = make("check");
export const CheckCircle = make("confirm");
export const CheckCircle2 = make("confirm");
export const CheckSquare = make("check");
export const Clapperboard = make("movie");
export const Clock = make("time");
export const Coins = make("coin-star");
export const Copy = make("copy");
export const Crown = make("crown");
export const Dice5 = make("dice");
export const Dices = make("dice");
export const Download = make("download");
export const Dumbbell = make("training");
export const Edit2 = make("pen");
export const Equal = make("equal");
export const ExternalLink = make("share");
export const Eye = make("view");
export const EyeOff = make("hide");
export const FileText = make("documnet");
export const Flag = make("flag-0");
export const Flame = make("fire");
export const FlaskConical = make("potion");
export const Gamepad2 = make("game");
export const Gem = make("gem-diamond");
export const Gift = make("gift");
export const Globe = make("globe");
export const GraduationCap = make("learn");
export const Heart = make("life");
export const HelpCircle = make("help");
export const History = make("history");
export const Home = make("home-1");
export const Images = make("photo");
export const Info = make("info");
export const Joystick = make("joystick");
export const LayoutDashboard = make("layout");
export const LayoutGrid = make("menu-0");
export const LayoutTemplate = make("layout");
export const Lightbulb = make("bulb");
export const Link2 = make("link");
export const List = make("list-1");
export const ListOrdered = make("list-0");
export const Loader2 = make("reload");
export const Lock = make("lock");
export const LogOut = make("quit");
export const Mail = make("mail");
export const Maximize2 = make("expand");
export const Medal = make("medal-0");
export const Megaphone = make("megaphone");
export const Menu = make("menu-1");
export const MessageCircle = make("talk-0");
export const MessageCircleMore = make("chat");
export const MessageSquare = make("chat");
export const Minus = make("minus");
export const Monitor = make("display");
export const Moon = make("moon");
export const Music = make("music");
export const Newspaper = make("post");
export const Pause = make("control-pause");
export const Pencil = make("pen");
export const Play = make("control-play");
export const Plus = make("plus");
export const Puzzle = make("puzzle");
export const RefreshCw = make("refresh");
export const Rocket = make("rocket");
export const RotateCcw = make("undo");
export const Save = make("save");
export const Scale = make("scale");
export const ScissorsLineDashed = make("scissors");
export const Scroll = make("scroll");
export const ScrollText = make("scroll");
export const Search = make("search");
export const Send = make("send");
export const Settings = make("setting");
export const Settings2 = make("setting");
export const Share = make("share");
export const Shield = make("shield");
export const ShieldCheck = make("security");
export const ShoppingBag = make("bag");
export const ShoppingCart = make("cart");
export const Skull = make("skull");
export const Smile = make("emoji-smile");
export const Star = make("star");
export const StickyNote = make("paper-0");
export const Sun = make("sun");
export const Swords = make("battle");
export const Tag = make("tag");
export const Target = make("target");
export const ThumbsDown = make("dislike");
export const ThumbsUp = make("like");
export const Timer = make("timer");
export const Trash2 = make("bin");
export const Trophy = make("trophy-0");
export const Tv2 = make("tv");
export const Undo2 = make("undo");
export const Unlock = make("unlock");
export const Upload = make("export");
export const User = make("user");
export const UserPlus = make("friend-add");
export const Vote = make("confirm");
export const Wallet = make("pouch");
export const Wrench = make("fix");
export const X = make("close");
export const Zap = make("thunder");
