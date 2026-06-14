"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, Share, X, Menu } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIosSafari() {
  const ua = navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) && /safari/i.test(ua) && !/crios|fxios|opios|mercury/i.test(ua);
}

function isMobileBrowser() {
  return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
}

type Mode = "none" | "native" | "ios" | "manual";

function HintPortal({
  btnRef,
  onClose,
  children,
}: {
  btnRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const [pos, setPos] = useState({ top: 0, right: 0 });

  useEffect(() => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({
        top:   r.top + window.scrollY - 8, // 8px gap boven knopf
        right: window.innerWidth - r.right,
      });
    }

    const handler = (e: PointerEvent) => {
      if (btnRef.current && !btnRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [btnRef, onClose]);

  return createPortal(
    <div
      style={{
        position: "fixed",
        bottom: `calc(100vh - ${pos.top}px)`,
        right: pos.right,
        zIndex: 99999,
        width: 272,
        background: "rgba(4,10,9,0.97)",
        border: "1px solid rgba(20,184,166,0.2)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderRadius: "0.75rem",
        padding: "1rem",
        boxShadow: "0 8px 32px rgba(0,0,0,0.7)",
      }}
    >
      {children}
      {/* Pfeil nach unten */}
      <div
        style={{
          position: "absolute",
          bottom: -6,
          right: 16,
          width: 12,
          height: 12,
          transform: "rotate(45deg)",
          background: "rgba(4,10,9,0.97)",
          borderRight: "1px solid rgba(20,184,166,0.2)",
          borderBottom: "1px solid rgba(20,184,166,0.2)",
        }}
      />
    </div>,
    document.body,
  );
}

export default function PwaInstallButton() {
  const [mode, setMode]         = useState<Mode>("none");
  const [prompt, setPrompt]     = useState<BeforeInstallPromptEvent | null>(null);
  const [showHint, setShowHint] = useState(false);
  const btnRef                  = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) return;
    if (!isMobileBrowser()) return;

    if (isIosSafari()) { setMode("ios"); return; }

    setMode("manual");

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
      setMode("native");
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") { setMode("none"); setShowHint(false); }
  }

  const steps = {
    ios: [
      <>Tippe auf das <Share className="inline w-3 h-3 text-teal-400 mx-0.5" /><strong className="text-white">Teilen</strong>-Symbol unten in Safari</>,
      <>Wähle <strong className="text-white">„Zum Home-Bildschirm"</strong></>,
      <>Tippe oben rechts auf <strong className="text-white">„Hinzufügen"</strong></>,
    ],
    manual: [
      <><Menu className="inline w-3 h-3 text-teal-400 mr-0.5" />Tippe auf das <strong className="text-white">Menü (⋮)</strong> oben rechts im Browser</>,
      <>Wähle <strong className="text-white">„App installieren"</strong> oder <strong className="text-white">„Zum Startbildschirm"</strong></>,
      <>Tippe auf <strong className="text-white">„Installieren"</strong></>,
    ],
  };

  if (mode === "none") return null;

  if (mode === "native") {
    return (
      <button
        ref={btnRef}
        onClick={install}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-teal-400 hover:text-teal-300 hover:bg-teal-500/8 transition-colors w-full"
      >
        <Download style={{ width: 13, height: 13 }} />
        App installieren
      </button>
    );
  }

  const stepList = mode === "ios" ? steps.ios : steps.manual;

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setShowHint(v => !v)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-teal-400 hover:text-teal-300 hover:bg-teal-500/8 transition-colors w-full"
      >
        <Download style={{ width: 13, height: 13 }} />
        App installieren
      </button>

      {showHint && (
        <HintPortal btnRef={btnRef} onClose={() => setShowHint(false)}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-white">App zum Home-Bildschirm</p>
            <button onClick={() => setShowHint(false)} className="text-gray-600 hover:text-gray-400 transition-colors">
              <X style={{ width: 13, height: 13 }} />
            </button>
          </div>
          <ol className="space-y-2.5">
            {stepList.map((step, i) => (
              <li key={i} className="flex items-start gap-2.5 text-xs text-gray-400">
                <span className="w-4 h-4 rounded-full bg-teal-500/20 text-teal-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </HintPortal>
      )}
    </>
  );
}
