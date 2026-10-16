"use client";
import { useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { Eye, EyeOff, Globe, Loader2 } from "@/components/icons";
import GameNameInput from "@/components/GameNameInput";
import { validateServerInput, MAX_SLOTS_LIMIT } from "@/lib/gameserver-input";
import JoinInstructionsPreview from "./JoinInstructionsPreview";

export type ServerFormState = {
  name: string;
  game: string;
  description: string;
  joinInstructions: string;
  host: string;
  port: string;
  password: string;
  maxSlots: string;
  openAccess: boolean;
};

export const EMPTY_FORM: ServerFormState = {
  name: "", game: "", description: "", joinInstructions: "", host: "", port: "", password: "",
  maxSlots: "10", openAccess: false,
};

type ServerFields = {
  name: string; game: string; description: string | null; joinInstructions: string | null;
  host: string; port: string | null; password: string | null;
  maxSlots: number; openAccess: boolean;
};

export function formFromServer(server: ServerFields): ServerFormState {
  return {
    name: server.name,
    game: server.game,
    description: server.description ?? "",
    joinInstructions: server.joinInstructions ?? "",
    host: server.host,
    port: server.port ?? "",
    password: server.password ?? "",
    maxSlots: String(server.maxSlots),
    openAccess: server.openAccess,
  };
}

// Request-Body für POST/PUT. Online/Offline wird nicht hier, sondern per Schalter in der Liste gesetzt.
export function formToPayload(form: ServerFormState) {
  return {
    name: form.name,
    game: form.game,
    description: form.description,
    joinInstructions: form.joinInstructions,
    host: form.host,
    port: form.port,
    password: form.password,
    maxSlots: Number(form.maxSlots),
    openAccess: form.openAccess,
  };
}

// Gleiche Prüfung wie in der API — liefert den ersten Fehler oder null.
export function formError(form: ServerFormState): string | null {
  const result = validateServerInput(formToPayload(form));
  return "error" in result ? result.error : null;
}

// Startpunkt für "So trittst du bei" beim Anlegen — Admin passt danach frei an,
// nichts davon wird erzwungen oder überschreibt bereits getippten Text.
export function defaultJoinInstructions(game: string): string {
  if (!game.trim()) return "";
  if (/minecraft/i.test(game)) {
    return 'Minecraft starten → "Mehrspieler" → "Server hinzufügen" → Adresse einfügen → beitreten.';
  }
  return 'Spiel starten → Mehrspieler-/Server-Browser öffnen → "Direct Connect" bzw. "Server per IP beitreten" wählen → Adresse einfügen.';
}

export default function ServerForm({
  value: form, onChange: setForm, variant, submitLabel, submitIcon, saving, onSubmit,
}: {
  value: ServerFormState;
  onChange: Dispatch<SetStateAction<ServerFormState>>;
  variant: "create" | "edit";
  submitLabel: string;
  submitIcon?: ReactNode;
  saving: boolean;
  onSubmit: () => void;
}) {
  const [showPassword, setShowPassword] = useState(false);

  const compact = variant === "edit";
  const input = `bg-white/5 border border-white/10 ${compact ? "rounded-lg py-1.5" : "rounded-xl py-2"} text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/20`;
  const field = `${input} px-3`;

  const set = <K extends keyof ServerFormState>(key: K, v: ServerFormState[K]) => setForm((f) => ({ ...f, [key]: v }));

  const error = formError(form);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <input placeholder={compact ? "Name" : "Name (z.B. Survival #1)"} value={form.name} onChange={(e) => set("name", e.target.value)} className={field} />
        <GameNameInput value={form.game} onChange={(game) => setForm((f) => ({
          ...f, game,
          joinInstructions: f.joinInstructions.trim() === "" ? defaultJoinInstructions(game) : f.joinInstructions,
        }))}
          placeholder={compact ? "Spiel" : "Spiel (z.B. Minecraft)"}
          className={input} />
        <input placeholder="Host / IP" value={form.host} onChange={(e) => set("host", e.target.value)} className={field} />
        <input placeholder="Port (optional)" inputMode="numeric" value={form.port} onChange={(e) => set("port", e.target.value)} className={field} />
        <div className="relative">
          <input type={showPassword ? "text" : "password"} placeholder="Passwort (optional)" value={form.password} onChange={(e) => set("password", e.target.value)}
            className={`w-full ${input} pl-3 pr-9`} />
          <button type="button" onClick={() => setShowPassword((v) => !v)} tabIndex={-1}
            aria-label={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
            {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
        <input type="number" min={1} max={MAX_SLOTS_LIMIT} step={1} placeholder="Max. Spieler" title="Max. Spieler (Plätze für Bewerbungen)"
          value={form.maxSlots} onChange={(e) => set("maxSlots", e.target.value)} className={field} />
        <input placeholder="Beschreibung (optional)" value={form.description} onChange={(e) => set("description", e.target.value)} className={`col-span-2 ${field}`} />
        <textarea
          placeholder={'"So trittst du bei" (optional) — z.B. "Spiel starten → Mehrspieler → Direct Connect → Adresse einfügen"'}
          value={form.joinInstructions} onChange={(e) => set("joinInstructions", e.target.value)}
          rows={2}
          className={`col-span-2 ${field} resize-none`} />
        <JoinInstructionsPreview text={form.joinInstructions} />
      </div>

      <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer select-none">
        <input type="checkbox" checked={form.openAccess} onChange={(e) => set("openAccess", e.target.checked)}
          className="accent-teal-500 w-3.5 h-3.5" />
        <Globe className="w-3.5 h-3.5 text-teal-400 shrink-0" />
        Ohne Bewerbung für alle freigeben (jeder angemeldete User sieht die Zugangsdaten sofort)
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button onClick={onSubmit} disabled={saving || !!error}
          className={`flex items-center gap-1.5 px-3 ${compact ? "py-1.5 rounded-lg" : "py-2 rounded-xl"} text-sm font-semibold bg-violet-500/20 border border-violet-500/30 text-violet-300 hover:bg-violet-500/30 disabled:opacity-40 transition-colors`}>
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : submitIcon}
          {submitLabel}
        </button>
        {/* Leeres Anlegen-Formular nicht gleich mit "Name ist erforderlich" anmeckern. */}
        {error && (compact || form.name || form.game || form.host) && <span className="text-xs text-amber-400">{error}</span>}
      </div>
    </div>
  );
}
