import SquadsList from "./SquadsList";
import { PageHeader } from "@/components/ui/PageHeader";

export default function SquadsPage() {
  return (
    <div className="px-4 sm:px-6 py-5 max-w-5xl mx-auto space-y-5">
      <PageHeader title="Squads" description="Unsere persistenten eSports-Teams — Roster, Captains und zugehörige Events." />
      <SquadsList />
    </div>
  );
}
