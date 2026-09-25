import { redirect } from "next/navigation";
import { auth } from "@/auth";
import LocationScene from "@/components/dnd/LocationScene";

export const metadata = { title: "OMA-Quest-Location | OMA" };

export default async function DndLocationPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?notice=login_required&callbackUrl=%2Foma-quest");

  const { slug } = await params;
  return (
    <div className="max-w-3xl mx-auto">
      <LocationScene slug={slug} />
    </div>
  );
}
