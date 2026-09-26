import SquadsList from "./SquadsList";

export default function SquadsPage() {
  return (
    <div className="px-4 sm:px-6 py-5 max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-black text-white">Squads</h1>
        <p className="text-sm text-gray-400 mt-1">
          Unsere persistenten eSports-Teams — Roster, Captains und zugehörige Events.
        </p>
      </div>
      <SquadsList />
    </div>
  );
}
