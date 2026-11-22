import "./globals.css";
import { SearchX } from "@/components/icons";
import HelpfulLinks from "@/components/HelpfulLinks";

/** 404 außerhalb des App-Rahmens (z. B. unbekannte Top-Level-Pfade). */
export default function GlobalNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-canvas">
      <div className="rounded-card border border-line bg-surface p-6 sm:p-10 max-w-md w-full text-center">
        <span className="mx-auto mb-5 grid size-16 place-items-center rounded-card bg-primary-soft text-primary-fg">
          <SearchX className="w-8 h-8" />
        </span>
        <p className="text-5xl font-extrabold text-fg tabular-nums mb-2">404</p>
        <h1 className="text-xl font-extrabold text-fg mb-2">Seite nicht gefunden</h1>
        <p className="text-sm text-muted mb-6">Diese Seite existiert nicht (mehr). Spring direkt weiter:</p>
        <HelpfulLinks />
      </div>
    </div>
  );
}
