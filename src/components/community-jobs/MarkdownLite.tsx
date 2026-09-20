import type { ReactNode } from "react";
import { CUSTOM_EMOJI_PATTERN, customEmojiUrl, parseCustomEmojiToken } from "@/lib/discord-emoji";

/**
 * Kleiner, sicherer Markdown-Renderer für Berichte und Ergänzungen — rendert ausschließlich React-Knoten
 * (kein dangerouslySetInnerHTML). Unterstützt: Überschriften (#–###), Absätze, **fett**, *kursiv*, `code`,
 * [Links](https://…), automatische Links, Listen (- / 1.), Zitate (>), Trennlinie (---) und Bilder
 * (![Text](url)) — Bilder aber nur von unserem Blob-Speicher (sonst würde jeder Bericht Fremd-Server
 * anpingen), andere Bild-Links erscheinen als normaler Link.
 */

const IMAGE_HOST = /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i;

function safeHref(url: string): string | null {
  if (/^https?:\/\//i.test(url) || url.startsWith("/")) return url;
  return null;
}

// Discord-Server-Emojis (<:name:id>) zuerst, damit ihre Unterstriche nicht als Kursiv-Markierung gelten.
const INLINE = new RegExp(
  `(${CUSTOM_EMOJI_PATTERN}|\\*\\*[^*\\n]+\\*\\*|(?<!\\w)__[^_\\n]+__(?!\\w)|\\*[^*\\n]+\\*|(?<!\\w)_[^_\\n]+_(?!\\w)|\`[^\`\\n]+\`|\\[[^\\]\\n]+\\]\\([^)\\s]+\\)|https?:\\/\\/[^\\s<)]+)`,
  "g",
);

function EmojiImg({ token, keyProp }: { token: string; keyProp: string }) {
  const emoji = parseCustomEmojiToken(token);
  if (!emoji) return <span key={keyProp}>{token}</span>;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- Discord-CDN, winzige Emoji-Grafik
    <img key={keyProp} src={customEmojiUrl(emoji, 48)} alt={`:${emoji.name}:`} title={`:${emoji.name}:`} loading="lazy"
      className="inline-block h-[1.4em] w-auto align-text-bottom" />
  );
}

/** Text mit Discord-Server-Emojis (<:name:id>) als Grafiken — für einfache Textstellen ohne Markdown (z.B. Auszüge). */
export function EmojiText({ text }: { text: string }) {
  return (
    <>
      {text.split(new RegExp(`(${CUSTOM_EMOJI_PATTERN})`, "g")).map((part, i) =>
        parseCustomEmojiToken(part) ? <EmojiImg key={i} keyProp={String(i)} token={part} /> : <span key={i}>{part}</span>)}
    </>
  );
}
const LINK_CLASS = "text-teal-300 hover:text-teal-200 underline underline-offset-2 break-words";

function renderInline(text: string, keyBase: string): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    const key = `${keyBase}-${i}`;
    if (!part) return null;
    if (parseCustomEmojiToken(part)) return <EmojiImg key={key} keyProp={key} token={part} />;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) return <strong key={key} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
    if (part.startsWith("__") && part.endsWith("__") && part.length > 4) return <strong key={key} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) return <em key={key}>{part.slice(1, -1)}</em>;
    if (part.startsWith("_") && part.endsWith("_") && part.length > 2) return <em key={key}>{part.slice(1, -1)}</em>;
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) return <code key={key} className="px-1 rounded bg-white/10 text-[0.9em]">{part.slice(1, -1)}</code>;
    const link = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (link) {
      const href = safeHref(link[2]);
      return href
        ? <a key={key} href={href} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>{link[1]}</a>
        : <span key={key}>{link[1]}</span>;
    }
    if (/^https?:\/\//i.test(part)) {
      // Satzzeichen am Ende gehören nicht zum Link.
      const trimmed = part.replace(/[.,;:!?]+$/, "");
      const rest = part.slice(trimmed.length);
      return <span key={key}><a href={trimmed} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>{trimmed}</a>{rest}</span>;
    }
    return <span key={key}>{part}</span>;
  });
}

type Block =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; lines: string[] }
  | { type: "quote"; lines: string[] }
  | { type: "ul" | "ol"; items: string[] }
  | { type: "image"; alt: string; url: string }
  | { type: "hr" };

function parseBlocks(md: string): Block[] {
  const blocks: Block[] = [];
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) { blocks.push({ type: "heading", level: heading[1].length as 1 | 2 | 3, text: heading[2].trim() }); i++; continue; }
    if (/^\s*(---+|\*\*\*+)\s*$/.test(line)) { blocks.push({ type: "hr" }); i++; continue; }

    const image = line.trim().match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
    if (image) { blocks.push({ type: "image", alt: image[1], url: image[2] }); i++; continue; }

    if (/^>\s?/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) { quote.push(lines[i].replace(/^>\s?/, "")); i++; }
      blocks.push({ type: "quote", lines: quote });
      continue;
    }

    const ulMatch = /^\s*[-*]\s+/;
    const olMatch = /^\s*\d+\.\s+/;
    if (ulMatch.test(line) || olMatch.test(line)) {
      const ordered = olMatch.test(line);
      const matcher = ordered ? olMatch : ulMatch;
      const items: string[] = [];
      while (i < lines.length && matcher.test(lines[i])) { items.push(lines[i].replace(matcher, "")); i++; }
      blocks.push({ type: ordered ? "ol" : "ul", items });
      continue;
    }

    const paragraph: string[] = [];
    while (i < lines.length && lines[i].trim()
      && !/^(#{1,3}\s|>\s?|\s*[-*]\s+|\s*\d+\.\s+|\s*---+\s*$)/.test(lines[i])
      && !/^\s*!\[[^\]]*\]\([^)\s]+\)\s*$/.test(lines[i])) {
      paragraph.push(lines[i]); i++;
    }
    if (paragraph.length === 0) { paragraph.push(line); i++; }
    blocks.push({ type: "paragraph", lines: paragraph });
  }
  return blocks;
}

export default function MarkdownLite({ text, className = "" }: { text: string; className?: string }) {
  const blocks = parseBlocks(text);
  return (
    <div className={`space-y-3 text-sm text-gray-300 leading-relaxed ${className}`}>
      {blocks.map((b, i) => {
        const key = `b${i}`;
        switch (b.type) {
          case "heading": {
            const cls = b.level === 1 ? "text-lg font-bold text-white" : b.level === 2 ? "text-base font-semibold text-white" : "text-sm font-semibold text-gray-100";
            return <p key={key} className={cls}>{renderInline(b.text, key)}</p>;
          }
          case "paragraph":
            return <p key={key}>{b.lines.map((l, j) => <span key={j}>{j > 0 && <br />}{renderInline(l, `${key}-${j}`)}</span>)}</p>;
          case "quote":
            return <blockquote key={key} className="border-l-2 border-teal-500/40 pl-3 text-gray-400 italic">{b.lines.map((l, j) => <span key={j}>{j > 0 && <br />}{renderInline(l, `${key}-${j}`)}</span>)}</blockquote>;
          case "ul":
            return <ul key={key} className="list-disc pl-5 space-y-0.5">{b.items.map((it, j) => <li key={j}>{renderInline(it, `${key}-${j}`)}</li>)}</ul>;
          case "ol":
            return <ol key={key} className="list-decimal pl-5 space-y-0.5">{b.items.map((it, j) => <li key={j}>{renderInline(it, `${key}-${j}`)}</li>)}</ol>;
          case "hr":
            return <hr key={key} className="border-white/10" />;
          case "image":
            return IMAGE_HOST.test(b.url) ? (
              // eslint-disable-next-line @next/next/no-img-element -- Bild aus unserem Blob-Speicher, beliebige Abmessungen
              <img key={key} src={b.url} alt={b.alt} loading="lazy" className="max-w-full h-auto rounded-lg" />
            ) : (
              <p key={key}>{safeHref(b.url) ? <a href={b.url} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>{b.alt || b.url}</a> : b.alt}</p>
            );
        }
      })}
    </div>
  );
}
