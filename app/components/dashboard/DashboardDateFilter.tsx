"use client";

import React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

export interface DashboardDateFilterProps {
  periods?: Array<{ label: string; value: string }>;
  currentPeriod?: string;
}

export function DashboardDateFilter({
  periods = [
    { label: "Today", value: "today" },
    { label: "Yesterday", value: "yesterday" },
    { label: "7 Days", value: "7d" },
    { label: "30 Days", value: "30d" },
    { label: "This Month", value: "month" },
  ],
  currentPeriod = "today",
}: DashboardDateFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activePeriod = searchParams.get("period") || currentPeriod;

  const handleSelect = (val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", val);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
      {periods.map((p) => (
        <button
          key={p.value}
          type="button"
          onClick={() => handleSelect(p.value)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            activePeriod === p.value
              ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
