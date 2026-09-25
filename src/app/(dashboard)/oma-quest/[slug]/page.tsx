import { redirect } from "next/navigation";
import { auth } from "@/auth";
import QuestWorld from "@/components/te-map/QuestWorld";

export const metadata = { title: "OMA-Quest-Location | OMA" };

export default async function QuestLocationPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?notice=login_required&callbackUrl=%2Foma-quest");

  const { slug } = await params;
  return (
    <div className="max-w-4xl mx-auto">
      <QuestWorld slug={slug} />
    </div>
  );
}
