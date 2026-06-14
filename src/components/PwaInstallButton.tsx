"use client";
import { useEffect, useRef, useState } from "react";
import { Download, Share, X, Menu } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIosSafari() {
  const ua = navigator.userAgent;
  const isIos = /iphone|ipad|ipod/i.test(ua);
  const isSafari = /safari/i.test(ua) && !/crios|fxios|opios|mercury/i.test(ua);
  return isIos && isSafari;
}

function isMobileBrowser() {
  return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
}

type Mode = "none" | "native" | "ios" | "manual";

export default function PwaInstallButton() {
  const [mode, setMode]         = useState<Mode>("none");
  const [prompt, setPrompt]     = useState<BeforeInstallPromptEvent | null>(null);
  const [showHint, setShowHint] = useState(false);
  const hintRef                 = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Bereits als installierte App gestartet → nichts anzeigen
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) return;

    // Nicht auf Mobilgerät → kein Button
    if (!isMobileBrowser()) return;

    if (isIosSafari()) {
      setMode("ios");
      return;
    }

    // Sofort manuellen Modus zeigen — beforeinstallprompt feuert beim Seitenload,
    // nicht wenn die Komponente mounted. Wenn es doch noch kommt, auf native upgraden.
    setMode("manual");

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
      setMode("native");
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Hint schließen bei Außenklick
  useEffect(() => {
    if (!showHint) return;
    const handler = (e: MouseEvent) => {
      if (hintRef.current && !hintRef.current.contains(e.target as Node)) {
        setShowHint(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showHint]);

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setMode("none");
  }

  // Chrome/Edge: nativer Install-Dialog
  if (mode === "native") {
    return (
      <button
        onClick={install}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-teal-400 hover:text-teal-300 hover:bg-teal-500/8 transition-colors w-full"
      >
        <Download style={{ width: 13, height: 13 }} />
        App installieren
      </button>
    );
  }

  // iOS Safari: manuelle Anleitung
  if (mode === "ios") {
    return (
      <div className="relative" ref={hintRef}>
        <button
          onClick={() => setShowHint(v => !v)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-teal-400 hover:text-teal-300 hover:bg-teal-500/8 transition-colors w-full"
        >
          <Download style={{ width: 13, height: 13 }} />
          App installieren
        </button>

        {showHint && (
          <div
            className="absolute right-0 bottom-full mb-2 w-64 rounded-xl p-4 z-50 space-y-2.5 shadow-2xl"
            style={{
              background: "rgba(4,10,9,0.97)",
              border: "1px solid rgba(20,184,166,0.2)",
              backdropFilter: "blur(24px)",
            }}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-white">App zum Home-Bildschirm</p>
              <button onClick={() => setShowHint(false)} className="text-gray-600 hover:text-gray-400 transition-colors">
                <X style={{ width: 13, height: 13 }} />
              </button>
            </div>
            <ol className="space-y-2">
              <li className="flex items-start gap-2.5 text-xs text-gray-400">
                <span className="w-4 h-4 rounded-full bg-teal-500/20 text-teal-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                <span>
                  Tippe auf das{" "}
                  <Share className="inline w-3 h-3 text-teal-400 mx-0.5" />
                  <strong className="text-white">Teilen</strong>-Symbol unten in Safari
                </span>
              </li>
              <li className="flex items-start gap-2.5 text-xs text-gray-400">
                <span className="w-4 h-4 rounded-full bg-teal-500/20 text-teal-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                <span>Wähle <strong className="text-white">„Zum Home-Bildschirm"</strong></span>
              </li>
              <li className="flex items-start gap-2.5 text-xs text-gray-400">
                <span className="w-4 h-4 rounded-full bg-teal-500/20 text-teal-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                <span>Tippe oben rechts auf <strong className="text-white">„Hinzufügen"</strong></span>
              </li>
            </ol>
            <div
              className="absolute -bottom-1.5 right-6 w-3 h-3 rotate-45"
              style={{ background: "rgba(4,10,9,0.97)", borderRight: "1px solid rgba(20,184,166,0.2)", borderBottom: "1px solid rgba(20,184,166,0.2)" }}
            />
          </div>
        )}
      </div>
    );
  }

  // Manueller Fallback für Android (wenn beforeinstallprompt ausbleibt)
  if (mode === "manual") {
    return (
      <div className="relative" ref={hintRef}>
        <button
          onClick={() => setShowHint(v => !v)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-teal-400 hover:text-teal-300 hover:bg-teal-500/8 transition-colors w-full"
        >
          <Download style={{ width: 13, height: 13 }} />
          App installieren
        </button>

        {showHint && (
          <div
            className="absolute right-0 bottom-full mb-2 w-64 rounded-xl p-4 z-50 space-y-2.5 shadow-2xl"
            style={{
              background: "rgba(4,10,9,0.97)",
              border: "1px solid rgba(20,184,166,0.2)",
              backdropFilter: "blur(24px)",
            }}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-white">App zum Home-Bildschirm</p>
              <button onClick={() => setShowHint(false)} className="text-gray-600 hover:text-gray-400 transition-colors">
                <X style={{ width: 13, height: 13 }} />
              </button>
            </div>
            <ol className="space-y-2">
              <li className="flex items-start gap-2.5 text-xs text-gray-400">
                <span className="w-4 h-4 rounded-full bg-teal-500/20 text-teal-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                <span>
                  Tippe auf das{" "}
                  <Menu className="inline w-3 h-3 text-teal-400 mx-0.5" />
                  <strong className="text-white">Menü</strong> (⋮) oben rechts im Browser
                </span>
              </li>
              <li className="flex items-start gap-2.5 text-xs text-gray-400">
                <span className="w-4 h-4 rounded-full bg-teal-500/20 text-teal-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                <span>Wähle <strong className="text-white">„App installieren"</strong> oder <strong className="text-white">„Zum Startbildschirm"</strong></span>
              </li>
              <li className="flex items-start gap-2.5 text-xs text-gray-400">
                <span className="w-4 h-4 rounded-full bg-teal-500/20 text-teal-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                <span>Tippe auf <strong className="text-white">„Installieren"</strong></span>
              </li>
            </ol>
            <p className="text-[10px] text-gray-600 mt-1">
              Tipp: Falls die App bereits installiert ist, öffne sie direkt vom Startbildschirm.
            </p>
            <div
              className="absolute -bottom-1.5 right-6 w-3 h-3 rotate-45"
              style={{ background: "rgba(4,10,9,0.97)", borderRight: "1px solid rgba(20,184,166,0.2)", borderBottom: "1px solid rgba(20,184,166,0.2)" }}
            />
          </div>
        )}
      </div>
    );
  }

  return null;
}
