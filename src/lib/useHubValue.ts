"use client";
import { useSyncExternalStore } from "react";

/**
 * Liest einen Wert, den der Community-Hub per Window-Event veröffentlicht (lib/hub-events), und
 * rendert bei jeder neuen Veröffentlichung neu. `read` muss bis zur nächsten Veröffentlichung
 * denselben Wert (bei Objekten: dieselbe Referenz) liefern.
 */
export function useHubValue<T>(eventName: string, read: () => T, serverValue: T): T {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener(eventName, onChange);
      return () => window.removeEventListener(eventName, onChange);
    },
    read,
    () => serverValue,
  );
}
