import type { Metadata } from "next";
import NotificationsClient from "./NotificationsClient";

export const metadata: Metadata = { title: "Benachrichtigungen | OMA" };

/** Alle Benachrichtigungen auf einer eigenen Seite (Designentwurf: /benachrichtigungen). */
export default function NotificationsPage() {
  return (
    <div className="px-4 sm:px-6 py-4 sm:py-6 max-w-3xl mx-auto">
      <NotificationsClient />
    </div>
  );
}
