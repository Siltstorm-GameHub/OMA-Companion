import { redirect } from "next/navigation";

// Die Turnier-Übersicht wurde in die Events-Seite integriert
export default function TournamentRedirect() {
  redirect("/events");
}
