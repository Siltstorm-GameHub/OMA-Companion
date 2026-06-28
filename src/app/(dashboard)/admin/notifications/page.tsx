import { redirect } from "next/navigation";

export default function AdminNotificationsRedirect() {
  redirect("/admin/daily-message");
}
