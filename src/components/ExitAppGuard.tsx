"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

const TRAP_STATE = { omaExitTrap: true };
const DASHBOARD_PATH = "/dashboard";

/**
 * Fängt den Hardware-/Browser-Zurück-Button ab: Ein Zurück-Tastendruck bringt
 * von jeder Seite zuerst zum Dashboard. Ist man bereits auf dem Dashboard,
 * lassen wir die normale (echte) Rückwärtsnavigation aus der App heraus zu —
 * kein Bestätigungsdialog mehr.
 *
 * Trick: Nach jedem Seitenwechsel legen wir einen zusätzlichen History-Eintrag
 * mit derselben URL oben drauf ("Trap"). Ein Zurück-Tastendruck poppt dann nur
 * diesen Trap wieder herunter — die URL ändert sich dabei NICHT, Next.js'
 * eigener Router bemerkt also keine Navigation und rendert nichts um. Erst
 * danach entscheiden wir per JS, ob zum Dashboard weitergeleitet oder die
 * echte Rückwärtsnavigation ausgelöst wird.
 */
export function ExitAppGuard() {
  const pathname = usePathname();
  const router = useRouter();
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
      // Bereits auf dem Dashboard: echte Rückwärtsnavigation aus der App heraus zulassen.
      bypassRef.current = true;
      window.history.back();
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [router]);

  return null;
}
