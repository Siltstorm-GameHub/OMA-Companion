"use client";
import { useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle, Download, Eye, EyeOff, Globe, Loader2, Radio } from "@/components/icons";
import GameNameInput from "@/components/GameNameInput";
import { statusSourceOf, validateServerInput, MAX_SLOTS_LIMIT } from "@/lib/gameserver-input";
import JoinInstructionsPreview from "./JoinInstructionsPreview";

export type StatusSource = "none" | "amp" | "gamedig";

export type ServerFormState = {
  name: string;
  game: string;
  description: string;
  joinInstructions: string;
  host: string;
  port: string;
  password: string;
  statusSource: StatusSource;
  ampInstanceId: string;
  gamedigType: string;
  queryPort: string;
  queryTelnetPort: string;
  queryTelnetPassword: string;
  maxSlots: string;
  openAccess: boolean;
};

export const EMPTY_FORM: ServerFormState = {
  name: "", game: "", description: "", joinInstructions: "", host: "", port: "", password: "",
  statusSource: "none", ampInstanceId: "", gamedigType: "", queryPort: "", queryTelnetPort: "", queryTelnetPassword: "",
  maxSlots: "10", openAccess: false,
};

type ServerFields = {
  name: string; game: string; description: string | null; joinInstructions: string | null;
  host: string; port: string | null; password: string | null;
  ampInstanceId: string | null; queryType: string | null; gamedigType: string | null;
  queryPort: string | null; queryTelnetPort: string | null; queryTelnetPassword: string | null;
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
    statusSource: statusSourceOf(server) ?? "none",
    ampInstanceId: server.ampInstanceId ?? "",
    gamedigType: server.gamedigType ?? "",
    queryPort: server.queryPort ?? "",
    queryTelnetPort: server.queryTelnetPort ?? "",
    queryTelnetPassword: server.queryTelnetPassword ?? "",
    maxSlots: String(server.maxSlots),
    openAccess: server.openAccess,
  };
}

// Request-Body für POST/PUT. Felder der nicht gewählten Live-Status-Quelle räumt die API selbst auf —
// nur ampInstanceId muss hier schon weg, sonst würde die API sie als (Alt-)AMP-Server deuten.
export function formToPayload(form: ServerFormState) {
  return {
    name: form.name,
    game: form.game,
    description: form.description,
    joinInstructions: form.joinInstructions,
    host: form.host,
    port: form.port,
    password: form.password,
    queryType: form.statusSource === "none" ? null : form.statusSource,
    ampInstanceId: form.statusSource === "amp" ? form.ampInstanceId : null,
    gamedigType: form.gamedigType,
    queryPort: form.queryPort,
    queryTelnetPort: form.queryTelnetPort,
    queryTelnetPassword: form.queryTelnetPassword,
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

type TestResult = { online: boolean; currentPlayers: number | null; maxPlayers: number | null; players: string[] | null } | { error: string };

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
  const [fetchingAmp, setFetchingAmp] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const compact = variant === "edit";
  const input = `bg-white/5 border border-white/10 ${compact ? "rounded-lg py-1.5" : "rounded-xl py-2"} text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/20`;
  const field = `${input} px-3`;
  const smallButton = `flex items-center gap-1.5 px-3 ${compact ? "py-1.5 rounded-lg" : "py-2 rounded-xl"} text-xs font-semibold bg-teal-500/15 border border-teal-500/25 text-teal-300 hover:bg-teal-500/25 disabled:opacity-40 transition-colors shrink-0`;

  const set = <K extends keyof ServerFormState>(key: K, v: ServerFormState[K]) => {
    setForm((f) => ({ ...f, [key]: v }));
    // Ein altes Testergebnis passt nach Änderungen an der Abfrage nicht mehr.
    if (key !== "maxSlots") setTestResult(null);
  };

  const error = formError(form);

  // Übernimmt Servername, Spiel, Spiel-Port und max. Spieler von AMP für die angegebene Instance-ID.
  // Host/IP und Passwort liefert AMP nicht zuverlässig (nur interne Bind-Adresse,
  // kein generisches Passwort-Feld) — die bleiben bewusst unverändert.
  async function fetchFromAmp() {
    const ampInstanceId = form.ampInstanceId.trim();
    if (!ampInstanceId) { toast.error("Bitte zuerst eine AMP Instance-ID eintragen"); return; }
    setFetchingAmp(true);
    try {
      const res = await fetch(`/api/admin/amp/instances/${encodeURIComponent(ampInstanceId)}`);
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "AMP-Abfrage fehlgeschlagen"); return; }
      setForm((f) => {
        const game = data.game || f.game;
        return {
          ...f, name: data.name || f.name, game, port: data.port ?? f.port,
          maxSlots: data.maxPlayers ? String(data.maxPlayers) : f.maxSlots,
          joinInstructions: f.joinInstructions.trim() === "" ? defaultJoinInstructions(game) : f.joinInstructions,
        };
      });
      toast.success("Von AMP übernommen — Host/IP und Passwort bitte manuell prüfen");
    } catch {
      toast.error("AMP-Abfrage fehlgeschlagen");
    } finally {
      setFetchingAmp(false);
    }
  }

  async function testQuery() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/servers/test-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formToPayload(form)),
      });
      const data = await res.json();
      setTestResult(res.ok ? data : { error: data.error ?? "Abfrage fehlgeschlagen" });
    } catch {
      setTestResult({ error: "Abfrage fehlgeschlagen" });
    } finally {
      setTesting(false);
    }
  }

  const testMaxPlayers = testResult && !("error" in testResult) ? testResult.maxPlayers : null;

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

        <select value={form.statusSource} onChange={(e) => set("statusSource", e.target.value as StatusSource)} className={`col-span-2 ${field}`}>
          <option value="none">Live-Status: keiner</option>
          <option value="amp">Live-Status: AMP-Controller</option>
          <option value="gamedig">Live-Status: Direkte Abfrage (Docker-Server ohne AMP)</option>
        </select>
        {form.statusSource === "amp" && (
          <div className="col-span-2 flex gap-2">
            <input placeholder="AMP Instance-ID" value={form.ampInstanceId} onChange={(e) => set("ampInstanceId", e.target.value)} className={`flex-1 ${field}`} />
            <button type="button" onClick={fetchFromAmp} disabled={fetchingAmp || !form.ampInstanceId.trim()}
              title="Servername, Spiel, Port und max. Spieler von AMP übernehmen (Host/IP und Passwort bitte manuell prüfen)"
              className={smallButton}>
              {fetchingAmp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Von AMP übernehmen
            </button>
          </div>
        )}
        {form.statusSource === "gamedig" && (
          <>
            <input placeholder="GameDig-Typ (z.B. enshrouded, sdtd)" value={form.gamedigType} onChange={(e) => set("gamedigType", e.target.value)} className={field} />
            <input placeholder="Query-Port (falls ≠ Port)" inputMode="numeric" value={form.queryPort} onChange={(e) => set("queryPort", e.target.value)} className={field} />
            <input placeholder="Telnet-Port (optional, für Spielernamen bei 7DTD)" inputMode="numeric" value={form.queryTelnetPort} onChange={(e) => set("queryTelnetPort", e.target.value)} className={field} />
            <input placeholder="Telnet-Passwort (optional)" value={form.queryTelnetPassword} onChange={(e) => set("queryTelnetPassword", e.target.value)} className={field} />
          </>
        )}
        {form.statusSource !== "none" && (
          <div className="col-span-2 flex flex-wrap items-center gap-2">
            <button type="button" onClick={testQuery} disabled={testing} className={smallButton}>
              {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Radio className="w-3.5 h-3.5" />}
              Abfrage testen
            </button>
            {testResult && ("error" in testResult ? (
              <span className="flex items-center gap-1.5 text-xs text-red-300">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {testResult.error}
              </span>
            ) : (
              <span className={`flex items-center gap-1.5 text-xs ${testResult.online ? "text-emerald-300" : "text-amber-300"}`}>
                {testResult.online ? <CheckCircle className="w-3.5 h-3.5 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                {testResult.online
                  ? `Erreichbar · ${testResult.currentPlayers ?? 0}${testResult.maxPlayers ? `/${testResult.maxPlayers}` : ""} Spieler online${testResult.players?.length ? ` (${testResult.players.join(", ")})` : ""}`
                  : "Gefunden, aber das Spiel ist gerade nicht gestartet"}
              </span>
            ))}
            {testMaxPlayers && String(testMaxPlayers) !== form.maxSlots.trim() && (
              <button type="button" onClick={() => set("maxSlots", String(testMaxPlayers))}
                className="text-xs text-violet-300 hover:text-violet-200 underline underline-offset-2">
                Max. Spieler auf {testMaxPlayers} setzen
              </button>
            )}
          </div>
        )}
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
