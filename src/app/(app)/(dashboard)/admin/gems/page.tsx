import { redirect } from "next/navigation";

// OMA Gems ist jetzt ein Abschnitt der Minigames-Seite (kein eigener Admin-Reiter mehr).
export default function AdminGemsPage() {
  redirect("/admin/minigames#gems");
}
