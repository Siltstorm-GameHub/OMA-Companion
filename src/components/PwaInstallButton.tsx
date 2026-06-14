"use client";
import { useEffect, useRef, useState } from "react";
import { Download, Share, X } from "lucide-react";

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

export default function PwaInstallButton() {
  const [prompt, setPrompt]       = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos]         = useState(false);
  const [showHint, setShowHint]   = useState(false);
  const hintRef                   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Bereits als installierte App gestartet → nichts anzeigen
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) return;

    if (isIosSafari()) {
      setIsIos(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
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
    if (outcome === "accepted") setPrompt(null);
  }

  // Chrome/Edge: nativer Install-Dialog
  if (prompt) {
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
  if (isIos) {
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
                <span>
                  Wähle{" "}
                  <strong className="text-white">„Zum Home-Bildschirm"</strong>
                </span>
              </li>
              <li className="flex items-start gap-2.5 text-xs text-gray-400">
                <span className="w-4 h-4 rounded-full bg-teal-500/20 text-teal-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                <span>Tippe oben rechts auf <strong className="text-white">„Hinzufügen"</strong></span>
              </li>
            </ol>
            {/* Pfeil nach unten */}
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
