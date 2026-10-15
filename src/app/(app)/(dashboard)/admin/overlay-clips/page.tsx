import { requireRole } from "@/lib/roles";
import OverlayClipsAdmin from "./OverlayClipsAdmin";

export const metadata = { title: "Overlay-Clips – Admin" };

export default async function AdminOverlayClipsPage() {
  await requireRole("moderator");
  return <OverlayClipsAdmin />;
}
