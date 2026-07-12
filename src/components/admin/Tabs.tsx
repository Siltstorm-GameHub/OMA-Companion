"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export interface TabItem {
  key: string;
  label: string;
  icon?: LucideIcon;
}

interface TabsProps {
  tabs: TabItem[];
  active: string;
  onChange: (key: string) => void;
  variant?: "underline" | "pill";
  className?: string;
}

export function Tabs({ tabs, active, onChange, variant = "underline", className = "" }: TabsProps) {
  return (
    <div role="tablist" className={`flex gap-1 ${variant === "underline" ? "border-b border-white/[0.06]" : ""} ${className}`}>
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        const Icon = tab.icon;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            id={`tab-${tab.key}`}
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.key}`}
            onClick={() => onChange(tab.key)}
            className={
              variant === "underline"
                ? `flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    isActive ? "border-teal-500 text-white" : "border-transparent text-gray-500 hover:text-gray-300"
                  }`
                : `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-purple-600/20 text-purple-300 ring-1 ring-purple-500/20"
                      : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]"
                  }`
            }
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({ tabKey, active, children }: { tabKey: string; active: string; children: ReactNode }) {
  if (tabKey !== active) return null;
  return (
    <div role="tabpanel" id={`tabpanel-${tabKey}`} aria-labelledby={`tab-${tabKey}`}>
      {children}
    </div>
  );
}
