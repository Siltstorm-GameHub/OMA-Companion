"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { Bot, Save, RotateCcw, Hash, Smile, X, Plus, Trash2, Send, PenLine } from "lucide-react";
import { BOT_MESSAGES, type BotMessageKey, type BotPlaceholder } from "@/lib/bot-config";

type CustomTemplate = {
  id:          string;
  label:       string;
  text:        string;
  channelType: "news" | "lul";
};

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

interface DiscordEmoji { id: string; name: string; animated: boolean }

// Welcher Kanal gehört zu welchem Nachrichtentyp?
const LUL_KEYS: BotMessageKey[] = ["lul_suggest"];

type Props = {
  initial:         Record<string, string>;
  newsChannelId:   string | null;
  newsChannelName: string | null;
  lulChannelId:    string | null;
  lulChannelName:  string | null;
  emojis:          DiscordEmoji[];
};

export default function BotConfigPanel({
  initial, newsChannelId, newsChannelName, lulChannelId, lulChannelName, emojis,
}: Props) {
  const [values,       setValues]       = useState<Record<string, string>>(initial);
  const [saving,       setSaving]       = useState(false);
  const [dirty,        setDirty]        = useState(false);
  const [pickerFor,    setPickerFor]    = useState<BotMessageKey | null>(null);
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  // ── Custom Templates state ─────────────────────────────────────────────────
  function parseCustomTemplates(): CustomTemplate[] {
    try { return JSON.parse(values["custom_templates"] ?? "[]"); } catch { return []; }
  }
  function saveCustomTemplates(tpls: CustomTemplate[]) {
    setValues(v => ({ ...v, custom_templates: JSON.stringify(tpls) }));
    setDirty(true);
  }
  const customTemplates = parseCustomTemplates();

  const [editingTpl,   setEditingTpl]  = useState<CustomTemplate | null>(null);
  const [newTplLabel,  setNewTplLabel]  = useState("");
  const [newTplText,   setNewTplText]   = useState("");
  const [newTplCh,     setNewTplCh]     = useState<"news" | "lul">("news");
  const [sendingId,    setSendingId]    = useState<string | null>(null);

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

  // ── Custom template helpers ────────────────────────────────────────────────
  function addCustomTemplate() {
    if (!newTplLabel.trim() || !newTplText.trim()) { toast.error("Name und Text sind erforderlich"); return; }
    const tpl: CustomTemplate = { id: genId(), label: newTplLabel.trim(), text: newTplText.trim(), channelType: newTplCh };
    saveCustomTemplates([...customTemplates, tpl]);
    setNewTplLabel(""); setNewTplText(""); setNewTplCh("news");
    toast.success("Vorlage hinzugefügt – nicht vergessen zu speichern");
  }

  function deleteCustomTemplate(id: string) {
    saveCustomTemplates(customTemplates.filter(t => t.id !== id));
  }

  function updateEditingTpl(field: keyof CustomTemplate, value: string) {
    if (!editingTpl) return;
    setEditingTpl({ ...editingTpl, [field]: value });
  }

  function saveEditingTpl() {
    if (!editingTpl) return;
    saveCustomTemplates(customTemplates.map(t => t.id === editingTpl.id ? editingTpl : t));
    setEditingTpl(null);
    toast.success("Vorlage aktualisiert – nicht vergessen zu speichern");
  }

  async function sendCustomTemplate(tpl: CustomTemplate) {
    const channelId = tpl.channelType === "lul" ? lulChannelId : newsChannelId;
    if (!channelId) { toast.error("Kanal-ID nicht konfiguriert"); return; }
    setSendingId(tpl.id);
    try {
      const res = await fetch("/api/admin/bot-send", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ text: tpl.text, channelId }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (data.ok) toast.success(`„${tpl.label}" gesendet!`);
      else         toast.error(data.error ?? "Fehler beim Senden");
    } finally { setSendingId(null); }
  }

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

  // Kanal-Badge Helfer
  function channelBadge(id: string | null, name: string | null) {
    const label = name ? `#${name}` : id ?? null;
    return { label: label ?? "–", id: id ?? null };
  }
  const newsBadge = channelBadge(newsChannelId, newsChannelName);
  const lulBadge  = channelBadge(lulChannelId,  lulChannelName);

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

      {/* Kanal-Übersicht */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-800/60 border border-white/[0.06] text-xs text-gray-400">
          <Hash className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold">News-Kanal</p>
            <p className="font-semibold text-indigo-300 truncate">{newsBadge.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-800/60 border border-white/[0.06] text-xs text-gray-400">
          <Hash className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold">LUL-Kanal</p>
            <p className="font-semibold text-purple-300 truncate">{lulBadge.label}</p>
          </div>
        </div>
      </div>

      {/* Message cards */}
      <div className="space-y-3">
        {keys.map(key => {
          const meta       = BOT_MESSAGES[key];
          const enabled    = isEnabled(key);
          const text       = get(`${key}_text`, meta.defaultText);
          const isDefault  = text === meta.defaultText;
          const showPicker = pickerFor === key;
          const isLul      = LUL_KEYS.includes(key);
          const badge      = isLul ? lulBadge : newsBadge;
          const badgeColor = isLul ? "text-purple-300" : "text-indigo-300";

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
                  <div className="flex items-center gap-1 mt-1">
                    <Hash className={`w-3 h-3 shrink-0 ${badgeColor}`} />
                    <span className={`text-[10px] font-medium ${badgeColor}`}>{badge.label}</span>
                  </div>
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

      {/* ── Eigene Vorlagen ────────────────────────────────────────────────── */}
      <div className="mt-6 space-y-3">
        <div className="flex items-center gap-2 pb-1 border-b border-white/[0.05]">
          <PenLine className="w-4 h-4 text-teal-400" />
          <h2 className="text-sm font-bold text-white">Eigene Vorlagen</h2>
          <span className="text-[10px] text-gray-600 ml-1">Manuell sendbare Nachrichten</span>
        </div>

        {/* Existing custom templates */}
        {customTemplates.map(tpl => {
          const isEditing  = editingTpl?.id === tpl.id;
          const isSending  = sendingId === tpl.id;
          const chLabel    = tpl.channelType === "lul" ? lulBadge.label : newsBadge.label;
          const chColor    = tpl.channelType === "lul" ? "text-purple-300" : "text-indigo-300";

          return (
            <div key={tpl.id} className="glass card-shine rounded-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.05]">
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <input
                      className="w-full rounded-lg px-2 py-1 text-sm text-white bg-gray-800 border border-white/[0.08] outline-none focus:border-teal-500/40"
                      value={editingTpl.label}
                      onChange={e => updateEditingTpl("label", e.target.value)}
                    />
                  ) : (
                    <p className="text-sm font-semibold text-white truncate">{tpl.label}</p>
                  )}
                  <div className="flex items-center gap-1 mt-0.5">
                    <Hash className={`w-3 h-3 shrink-0 ${chColor}`} />
                    <span className={`text-[10px] font-medium ${chColor}`}>{chLabel}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {isEditing ? (
                    <>
                      <button onClick={saveEditingTpl}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 text-teal-400 border border-teal-500/20 transition-colors">
                        Übernehmen
                      </button>
                      <button onClick={() => setEditingTpl(null)}
                        className="text-[11px] px-2 py-1 rounded-lg text-gray-500 hover:text-gray-300 transition-colors">
                        Abbrechen
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => sendCustomTemplate(tpl)} disabled={isSending}
                        className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 transition-colors disabled:opacity-40"
                        title="Jetzt senden">
                        <Send className="w-3 h-3" />
                        {isSending ? "…" : "Senden"}
                      </button>
                      <button onClick={() => setEditingTpl(tpl)}
                        className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg text-gray-500 hover:text-gray-300 border border-white/[0.06] hover:border-white/[0.12] transition-colors"
                        title="Bearbeiten">
                        <PenLine className="w-3 h-3" />
                      </button>
                      <button onClick={() => deleteCustomTemplate(tpl.id)}
                        className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg text-gray-600 hover:text-red-400 border border-white/[0.06] hover:border-red-500/20 transition-colors"
                        title="Löschen">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="px-4 py-3 space-y-2">
                {isEditing ? (
                  <>
                    <textarea
                      className="w-full rounded-xl px-3 py-2.5 text-sm text-white bg-gray-800/80 border border-white/[0.06] focus:border-teal-500/40 outline-none resize-none transition-colors"
                      rows={3}
                      value={editingTpl.text}
                      onChange={e => updateEditingTpl("text", e.target.value)}
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-600">Kanal:</span>
                      {(["news", "lul"] as const).map(ch => (
                        <button key={ch} onClick={() => updateEditingTpl("channelType", ch)}
                          className={`text-[11px] px-2 py-0.5 rounded-lg border transition-colors ${
                            editingTpl.channelType === ch
                              ? "bg-teal-500/15 text-teal-400 border-teal-500/30"
                              : "text-gray-500 border-white/[0.08] hover:border-white/[0.16]"
                          }`}>
                          {ch === "news" ? newsBadge.label : lulBadge.label}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-400 whitespace-pre-wrap">{tpl.text}</p>
                )}
              </div>
            </div>
          );
        })}

        {/* Create new template form */}
        <div className="glass rounded-2xl overflow-hidden border border-teal-500/10">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.05]">
            <Plus className="w-3.5 h-3.5 text-teal-400" />
            <span className="text-sm font-semibold text-white">Neue Vorlage</span>
          </div>
          <div className="px-4 py-3 space-y-2">
            <input
              className="w-full rounded-xl px-3 py-2 text-sm text-white bg-gray-800/80 border border-white/[0.06] focus:border-teal-500/40 outline-none transition-colors placeholder:text-gray-600"
              placeholder="Name der Vorlage"
              value={newTplLabel}
              onChange={e => setNewTplLabel(e.target.value)}
            />
            <textarea
              className="w-full rounded-xl px-3 py-2.5 text-sm text-white bg-gray-800/80 border border-white/[0.06] focus:border-teal-500/40 outline-none resize-none transition-colors placeholder:text-gray-600"
              rows={3}
              placeholder="Nachrichtentext… (Markdown erlaubt)"
              value={newTplText}
              onChange={e => setNewTplText(e.target.value)}
            />
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-600">Kanal:</span>
                {(["news", "lul"] as const).map(ch => (
                  <button key={ch} onClick={() => setNewTplCh(ch)}
                    className={`text-[11px] px-2 py-0.5 rounded-lg border transition-colors ${
                      newTplCh === ch
                        ? "bg-teal-500/15 text-teal-400 border-teal-500/30"
                        : "text-gray-500 border-white/[0.08] hover:border-white/[0.16]"
                    }`}>
                    {ch === "news" ? newsBadge.label : lulBadge.label}
                  </button>
                ))}
              </div>
              <button onClick={addCustomTemplate}
                className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 text-teal-400 border border-teal-500/20 transition-colors font-medium">
                <Plus className="w-3 h-3" />
                Hinzufügen
              </button>
            </div>
          </div>
        </div>

        <p className="text-[10px] text-gray-700 px-1">
          Eigene Vorlagen werden nach dem Klick auf „Speichern" dauerhaft gespeichert.
          Über „Senden" wird die Nachricht sofort in den gewählten Kanal gepostet.
        </p>
      </div>
    </div>
  );
}
