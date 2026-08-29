"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

const TRAP_STATE = { omaExitTrap: true };

/**
 * Fängt den Hardware-/Browser-Zurück-Button ab und fragt immer erst nach,
 * statt direkt zur vorherigen Seite zu springen.
 *
 * Trick: Nach jedem Seitenwechsel legen wir einen zusätzlichen History-Eintrag
 * mit derselben URL oben drauf ("Trap"). Ein Zurück-Tastendruck poppt dann nur
 * diesen Trap wieder herunter — die URL ändert sich dabei NICHT, Next.js'
 * eigener Router bemerkt also keine Navigation und rendert nichts um. Erst
 * wenn der Nutzer im Dialog "Ja" bestätigt, lösen wir per history.back() die
 * eigentliche (echte) Rückwärtsnavigation aus.
 */
export function ExitAppGuard() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const bypassRef = useRef(false);

  // Bei jedem Seitenwechsel den Trap neu oben auf den Stack legen.
  useEffect(() => {
    window.history.pushState(TRAP_STATE, "", window.location.href);
  }, [pathname]);

  useEffect(() => {
    const handlePopState = () => {
      if (bypassRef.current) {
        bypassRef.current = false;
        return;
      }
      setOpen(true);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleStay = () => {
    setOpen(false);
    // Trap wiederherstellen, damit der nächste Zurück-Tastendruck erneut abgefangen wird.
    window.history.pushState(TRAP_STATE, "", window.location.href);
  };

  const handleLeave = () => {
    setOpen(false);
    bypassRef.current = true;
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
