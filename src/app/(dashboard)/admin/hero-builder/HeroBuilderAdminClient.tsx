"use client";
import { useState } from "react";
import { Image as ImageIcon, PersonStanding } from "lucide-react";
import HeroBasePosesAdminClient from "../hero-base-poses/HeroBasePosesAdminClient";
import HeroAccessoriesAdminClient from "../hero-accessories/HeroAccessoriesAdminClient";

type BasePose = { id: string; classKey: string; poseKey: string; name: string; imageUrl: string; width: number; height: number; createdAt: string };
type PoseSlot = { id: string; basePoseId: string; slot: string; anchorX: number; anchorY: number; rotation: number };
type Accessory = { id: string; name: string; slot: string; imageUrl: string; width: number; height: number; createdAt: string };

export default function HeroBuilderAdminClient({ basePoses, poseSlots, accessories }: {
  basePoses: BasePose[];
  poseSlots: PoseSlot[];
  accessories: Accessory[];
}) {
  const [tab, setTab] = useState<"poses" | "accessories">("poses");

  return (
    <div className="space-y-5">
      <div className="flex gap-1 bg-gray-900 border border-white/5 rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab("poses")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            tab === "poses" ? "bg-purple-600/20 text-purple-300 shadow-[inset_0_0_0_1px_rgba(168,85,247,0.2)]" : "text-gray-500 hover:text-gray-200 hover:bg-white/5"
          }`}>
          <ImageIcon className="w-3.5 h-3.5" /> Basis-Posen
        </button>
        <button
          onClick={() => setTab("accessories")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            tab === "accessories" ? "bg-purple-600/20 text-purple-300 shadow-[inset_0_0_0_1px_rgba(168,85,247,0.2)]" : "text-gray-500 hover:text-gray-200 hover:bg-white/5"
          }`}>
          <PersonStanding className="w-3.5 h-3.5" /> Ausrüstung
        </button>
      </div>

      {tab === "poses"
        ? <HeroBasePosesAdminClient items={basePoses} slots={poseSlots} accessories={accessories} />
        : <HeroAccessoriesAdminClient items={accessories} />}
    </div>
  );
}
