"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { Bot, Save, RotateCcw, Hash, Smile, X } from "lucide-react";
import { BOT_MESSAGES, type BotMessageKey, type BotPlaceholder } from "@/lib/bot-config";

interface DiscordEmoji { id: string; name: string; animated: boolean }

type Props = {
  initial:     Record<string, string>;
  channelId:   string | null;
  channelName: string | null;
  emojis:      DiscordEmoji[];
};

export default function BotConfigPanel({ initial, channelId, channelName, emojis }: Props) {
  const [values,       setValues]       = useState<Record<string, string>>(initial);
  const [saving,       setSaving]       = useState(false);
  const [dirty,        setDirty]        = useState(false);
  const [pickerFor,    setPickerFor]    = useState<BotMessageKey | null>(null);
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  // ── helpers ────────────────────────────────────────────────────────────────
  function get(key: string, fallback: string): string { return values[key] ?? fallback; }

  function set(key: string, value: string) {
    setValues(v => ({ ...v, [key]: value }));
    setDirty(true);
  }

  function isEnabled(key: BotMessageKey): boolean {
    const v = values[`${key}_enabled`];
    return v === undefined ? BOT_MESSAGES[key].defaultOn : v === "true";
  }

  function toggleEnabled(key: BotMessageKey) { set(`${key}_enabled`, isEnabled(key) ? "false" : "true"); }
  function resetText(key: BotMessageKey)      { set(`${key}_text`, BOT_MESSAGES[key].defaultText); }

  // Beliebigen String in Textarea an Cursor-Position einfügen
  function insertAtCursor(msgKey: BotMessageKey, code: string) {
    const textKey = `${msgKey}_text`;
    const ta      = textareaRefs.current[msgKey];
    const current = get(textKey, BOT_MESSAGES[msgKey].defaultText);
    if (ta) {
      const start = ta.selectionStart ?? current.length;
      const end   = ta.selectionEnd   ?? current.length;
      const next  = current.slice(0, start) + code + current.slice(end);
      set(textKey, next);
      requestAnimationFrame(() => {
        ta.focus();
        const pos = start + code.length;
        ta.setSelectionRange(pos, pos);
      });
    } else {
      set(textKey, current + code);
    }
  }

  // Emoji in Textarea an Cursor-Position einfügen
  function insertEmoji(msgKey: BotMessageKey, emoji: DiscordEmoji) {
    const code = emoji.animated ? `<a:${emoji.name}:${emoji.id}>` : `<:${emoji.name}:${emoji.id}>`;
    insertAtCursor(msgKey, code);
    setPickerFor(null);
  }

  // ── save ───────────────────────────────────────────────────────────────────
  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/bot-config", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(values),
      });
      if (res.ok) { toast.success("Bot-Einstellungen gespeichert"); setDirty(false); }
      else          toast.error("Fehler beim Speichern");
    } finally { setSaving(false); }
  }

  const keys = Object.keys(BOT_MESSAGES) as BotMessageKey[];

  // Kanal-Badge
  const channelLabel = channelName ? `#${channelName}` : channelId ?? "–";

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Bot className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Bot-Nachrichten</h1>
            <p className="text-xs text-gray-500">An/Aus schalten und Texte anpassen</p>
          </div>
        </div>
        <button
          onClick={save}
          disabled={saving || !dirty}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium transition-colors"
        >
          <Save className="w-4 h-4" />
          {saving ? "Speichert…" : "Speichern"}
        </button>
      </div>

      {/* Default-Kanal-Info */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-800/60 border border-white/[0.06] text-xs text-gray-400">
        <Hash className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
        <span>Standard-Kanal:</span>
        <span className="font-semibold text-indigo-300">{channelLabel}</span>
        {channelId && <span className="text-gray-600 font-mono ml-1">({channelId})</span>}
        <span className="ml-auto text-gray-600 italic">Events mit eigenem Kanal nutzen diesen stattdessen</span>
      </div>

      {/* Message cards */}
      <div className="space-y-3">
        {keys.map(key => {
          const meta      = BOT_MESSAGES[key];
          const enabled   = isEnabled(key);
          const text      = get(`${key}_text`, meta.defaultText);
          const isDefault = text === meta.defaultText;
          const showPicker = pickerFor === key;

          return (
            <div
              key={key}
              className={`glass card-shine rounded-2xl overflow-hidden transition-opacity ${enabled ? "" : "opacity-50"}`}
            >
              {/* Row header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.05]">
                {/* Toggle */}
                <button
                  onClick={() => toggleEnabled(key)}
                  className={`relative shrink-0 rounded-full transition-colors ${enabled ? "bg-indigo-500" : "bg-gray-700"}`}
                  style={{ height: "22px", width: "40px" }}
                  title={enabled ? "Deaktivieren" : "Aktivieren"}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 bg-white rounded-full shadow transition-transform ${enabled ? "translate-x-[18px]" : "translate-x-0"}`}
                    style={{ width: "18px", height: "18px" }}
                  />
                </button>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{meta.label}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5 truncate">{meta.description}</p>
                </div>

                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                  enabled
                    ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/20"
                    : "bg-white/[0.04] text-gray-600 border border-white/[0.06]"
                }`}>
                  {enabled ? "Aktiv" : "Deaktiviert"}
                </span>
              </div>

              {/* Text editor */}
              {enabled && (
                <div className="px-4 py-3 space-y-2">

                  {/* Toolbar row */}
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
                      Nachrichtentext
                    </label>
                    <div className="flex items-center gap-2">
                      {/* Emoji-Picker Toggle */}
                      {emojis.length > 0 && (
                        <button
                          onClick={() => setPickerFor(showPicker ? null : key)}
                          className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-lg transition-colors ${
                            showPicker
                              ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                              : "text-gray-600 hover:text-gray-400 border border-transparent"
                          }`}
                          title="Server-Emojis einfügen"
                        >
                          <Smile className="w-3 h-3" />
                          Emoji
                        </button>
                      )}
                      {!isDefault && (
                        <button
                          onClick={() => resetText(key)}
                          className="flex items-center gap-1 text-[10px] text-gray-600 hover:text-gray-400 transition-colors"
                          title="Standard wiederherstellen"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Standard
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Emoji Picker */}
                  {showPicker && (
                    <div className="rounded-xl border border-white/[0.08] bg-gray-900/80 p-2">
                      <div className="flex items-center justify-between mb-2 px-1">
                        <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
                          Server-Emojis ({emojis.length})
                        </span>
                        <button
                          onClick={() => setPickerFor(null)}
                          className="text-gray-600 hover:text-gray-400 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto pr-1">
                        {emojis.map(emoji => (
                          <button
                            key={emoji.id}
                            onClick={() => insertEmoji(key, emoji)}
                            title={`:${emoji.name}:`}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-sm shrink-0"
                          >
                            <img
                              src={`https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? "gif" : "webp"}?size=32`}
                              alt={emoji.name}
                              className="w-6 h-6 object-contain"
                              loading="lazy"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <textarea
                    ref={el => { textareaRefs.current[key] = el; }}
                    value={text}
                    onChange={e => set(`${key}_text`, e.target.value)}
                    rows={text.includes("\n") ? 3 : 2}
                    className="w-full rounded-xl px-3 py-2.5 text-sm text-white bg-gray-800/80 border border-white/[0.06] focus:border-indigo-500/40 outline-none resize-none transition-colors placeholder:text-gray-600"
                    placeholder={meta.defaultText}
                  />

                  {/* Platzhalter-Chips */}
                  {"placeholders" in meta && (meta.placeholders as BotPlaceholder[]).length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">
                        Verfügbare Platzhalter
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {(meta.placeholders as BotPlaceholder[]).map(ph => (
                          <button
                            key={ph.key}
                            onClick={() => insertAtCursor(key, ph.key)}
                            title={`${ph.description} – Klicken zum Einfügen`}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 hover:border-indigo-500/40 text-indigo-300 text-[11px] font-mono transition-colors"
                          >
                            {ph.key}
                            <span className="text-[9px] text-indigo-500 font-sans non-mono ml-0.5 hidden sm:inline">
                              {ph.description}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-[10px] text-gray-700">
                    Markdown: **fett**, *kursiv* · Platzhalter werden beim Senden automatisch ersetzt
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
