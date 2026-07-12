"use client";

import { useState } from "react";
import type { ComponentProps } from "react";
import { Clapperboard, Trophy } from "lucide-react";
import { Tabs } from "@/components/admin/Tabs";
import ContestManager from "./ContestManager";
import CreateContestForm from "./CreateContestForm";
import YearlyContestManager from "./YearlyContestManager";

type MonthlyContests = ComponentProps<typeof ContestManager>["contests"];
type YearlyContests = ComponentProps<typeof YearlyContestManager>["contests"];

interface Props {
  monthlyContests: MonthlyContests;
  partnerLogins: string[];
  hasActiveMonthlyContest: boolean;
  yearlyContests: YearlyContests;
}

export default function HighlightClipsClient({ monthlyContests, partnerLogins, hasActiveMonthlyContest, yearlyContests }: Props) {
  const [tab, setTab] = useState<"month" | "year">("month");

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Highlight Clips</h1>
        <p className="text-sm text-gray-500 mt-1">
          Clip des Monats und Clip des Jahres — Abstimmungen verwalten und Belohnungen anpassen.
        </p>
      </div>

      <Tabs
        variant="underline"
        active={tab}
        onChange={(k) => setTab(k as "month" | "year")}
        tabs={[
          { key: "month", label: "Clip des Monats", icon: Clapperboard },
          { key: "year", label: "Clip des Jahres", icon: Trophy },
        ]}
      />

      {tab === "month" ? (
        <div className="space-y-8">
          <CreateContestForm
            defaultChannels={partnerLogins}
            hasActiveContest={hasActiveMonthlyContest}
          />
          <ContestManager contests={monthlyContests} />
        </div>
      ) : (
        <div className="space-y-8">
          <p className="text-sm text-gray-500 -mt-2">
            Startet automatisch Mitte Dezember (sobald die November-Abstimmung zum Clip des Monats endet) und berücksichtigt alle Monatssieger von Dezember des Vorjahres bis November des aktuellen Jahres.
          </p>
          <YearlyContestManager contests={yearlyContests} />
        </div>
      )}
    </div>
  );
}
