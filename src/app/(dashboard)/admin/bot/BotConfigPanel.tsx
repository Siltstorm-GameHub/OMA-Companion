"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Bot, Save, RotateCcw } from "lucide-react";
import { BOT_MESSAGES, type BotMessageKey } from "@/lib/bot-config";

type Props = {
  initial: Record<string, string>;
};

export default function BotConfigPanel({ initial }: Props) {
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [saving, setSaving] = useState(false);
  const [dirty,  setDirty]  = useState(false);

  function get(key: string, fallback: string): string {
    return values[key] ?? fallback;
  }

  function set(key: string, value: string) {
    setValues(v => ({ ...v, [key]: value }));
    setDirty(true);
  }

  function isEnabled(key: BotMessageKey): boolean {
    const v = values[`${key}_enabled`];
    return v === undefined ? BOT_MESSAGES[key].defaultOn : v === "true";
  }

  function toggleEnabled(key: BotMessageKey) {
    set(`${key}_enabled`, isEnabled(key) ? "false" : "true");
  }

  function resetText(key: BotMessageKey) {
    set(`${key}_text`, BOT_MESSAGES[key].defaultText);
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/bot-config", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(values),
      });
      if (res.ok) {
        toast.success("Bot-Einstellungen gespeichert");
        setDirty(false);
      } else {
        toast.error("Fehler beim Speichern");
      }
    } finally {
      setSaving(false);
    }
  }

  const keys = Object.keys(BOT_MESSAGES) as BotMessageKey[];

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

      {/* Message cards */}
      <div className="space-y-3">
        {keys.map(key => {
          const meta    = BOT_MESSAGES[key];
          const enabled = isEnabled(key);
          const text    = get(`${key}_text`, meta.defaultText);
          const isDefault = text === meta.defaultText;

          return (
            <div
              key={key}
              className={`glass card-shine rounded-2xl overflow-hidden transition-opacity ${
                enabled ? "" : "opacity-50"
              }`}
            >
              {/* Row header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.05]">
                {/* Toggle */}
                <button
                  onClick={() => toggleEnabled(key)}
                  className={`relative w-10 h-5.5 rounded-full transition-colors shrink-0 ${
                    enabled ? "bg-indigo-500" : "bg-gray-700"
                  }`}
                  style={{ height: "22px", width: "40px" }}
                  title={enabled ? "Deaktivieren" : "Aktivieren"}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform ${
                      enabled ? "translate-x-[18px]" : "translate-x-0"
                    }`}
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
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
                      Nachrichtentext
                    </label>
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
                  <textarea
                    value={text}
                    onChange={e => set(`${key}_text`, e.target.value)}
                    rows={text.includes("\n") ? 3 : 2}
                    className="w-full rounded-xl px-3 py-2.5 text-sm text-white bg-gray-800/80 border border-white/[0.06] focus:border-indigo-500/40 outline-none resize-none transition-colors placeholder:text-gray-600"
                    placeholder={meta.defaultText}
                  />
                  <p className="text-[10px] text-gray-700">
                    Markdown wird unterstützt: **fett**, *kursiv*, [Link](url)
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
