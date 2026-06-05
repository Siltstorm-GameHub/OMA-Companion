import { redirect } from "next/navigation";

// Feed wurde in den Admin-Bereich verschoben
export default function FeedPage() {
  redirect("/admin");
}
