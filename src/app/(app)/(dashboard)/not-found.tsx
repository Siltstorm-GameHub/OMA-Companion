import { SearchX } from "@/components/icons";
import HelpfulLinks from "@/components/HelpfulLinks";

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4 sm:p-6">
      <div className="rounded-card border border-line bg-surface p-6 sm:p-10 max-w-md w-full text-center">
        <span className="mx-auto mb-5 grid size-16 place-items-center rounded-card bg-primary-soft text-primary-fg">
          <SearchX className="w-8 h-8" />
        </span>
        <p className="text-5xl font-extrabold text-fg tabular-nums mb-2">404</p>
        <h1 className="text-xl font-extrabold text-fg mb-2">Seite nicht gefunden</h1>
        <p className="text-sm text-muted mb-6">
          Diese Seite existiert nicht (mehr). Nutz die Suche oben oder spring direkt weiter:
        </p>
        <HelpfulLinks />
      </div>
    </div>
  );
}
