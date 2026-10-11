import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getBuilderAccess } from "@/lib/dnd/custom-worlds";
import WorldEditor from "@/components/te-map/editor/WorldEditor";

export const metadata = { title: "Location bearbeiten | OMA Quest" };

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?notice=login_required&callbackUrl=%2Foma-quest%2Feditor");
  if (!(await getBuilderAccess(session.user.id)).allowed) redirect("/oma-quest/editor");

  const { id } = await params;
  return (
    <div className="max-w-[1400px] mx-auto">
      <WorldEditor id={id} />
    </div>
  );
}
