"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

const TRAP_STATE = { omaExitTrap: true };
const DASHBOARD_PATH = "/dashboard";

/**
 * Fängt den Hardware-/Browser-Zurück-Button ab: Ein Zurück-Tastendruck bringt
 * von jeder Seite zuerst zum Dashboard. Erst ein Zurück-Tastendruck, während
 * man bereits auf dem Dashboard ist, fragt nach, ob man die OMA verlassen
 * möchte.
 *
 * Trick: Nach jedem Seitenwechsel legen wir einen zusätzlichen History-Eintrag
 * mit derselben URL oben drauf ("Trap"). Ein Zurück-Tastendruck poppt dann nur
 * diesen Trap wieder herunter — die URL ändert sich dabei NICHT, Next.js'
 * eigener Router bemerkt also keine Navigation und rendert nichts um. Erst
 * danach entscheiden wir per JS, ob zum Dashboard weitergeleitet oder der
 * Verlassen-Dialog gezeigt wird; nur bei dessen Bestätigung mit "Ja" lösen
 * wir per history.back() die eigentliche (echte) Rückwärtsnavigation aus.
 */
export function ExitAppGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const bypassRef = useRef(false);
  const pathnameRef = useRef(pathname);

  // Bei jedem Seitenwechsel den Trap neu oben auf den Stack legen und die
  // zuletzt bekannte Route für den (nur einmal registrierten) popstate-Handler
  // aktuell halten.
  useEffect(() => {
    pathnameRef.current = pathname;
    window.history.pushState(TRAP_STATE, "", window.location.href);
  }, [pathname]);

  useEffect(() => {
    const handlePopState = () => {
      if (bypassRef.current) {
        bypassRef.current = false;
        return;
      }
      if (pathnameRef.current !== DASHBOARD_PATH) {
        router.replace(DASHBOARD_PATH);
        return;
      }
      setOpen(true);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [router]);

  const handleStay = () => {
    setOpen(false);
    // Trap wiederherstellen, damit der nächste Zurück-Tastendruck erneut abgefangen wird.
    window.history.pushState(TRAP_STATE, "", window.location.href);
  };

  const handleLeave = () => {
    setOpen(false);
    bypassRef.current = true;
    // Echtes "App schließen" gibt es ohne nativen Wrapper (Capacitor o.ä.) nicht —
    // window.close() funktioniert nur, wenn der Tab/das Fenster per Skript
    // geöffnet wurde, ist als Standalone-PWA aber der bestmögliche Versuch.
    // Fallback: echte Rückwärtsnavigation aus der App-History heraus.
    window.close();
    window.history.back();
  };

  return (
    <Modal open={open} onClose={handleStay} title="OMA verlassen?" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-gray-400">Möchtest du die OMA wirklich verlassen?</p>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={handleStay}>
            Niemals
          </Button>
          <Button type="button" variant="danger" onClick={handleLeave}>
            Ja
          </Button>
        </div>
      </div>
    </Modal>
  );
}
