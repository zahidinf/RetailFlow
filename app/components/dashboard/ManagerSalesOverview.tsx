"use client";

import React, { useState } from "react";

interface OverviewItem {
  label: string;
  current: number;
  previous: number;
}

interface Props {
  data: {
    today: OverviewItem[];
    week: OverviewItem[];
    month: OverviewItem[];
  };
}

export default function ManagerSalesOverview({ data }: Props) {
  const [period, setPeriod] = useState<"today" | "week" | "month">("today");

  const currentDataset = data[period] || [];
  const maxVal = Math.max(
    ...currentDataset.flatMap((d) => [d.current, d.previous]),
    1
  );

  const totalCurrent = currentDataset.reduce((sum, d) => sum + d.current, 0);
  const totalPrevious = currentDataset.reduce((sum, d) => sum + d.previous, 0);
  const diff = totalCurrent - totalPrevious;
  const pct =
    totalPrevious > 0
      ? Math.round(((totalCurrent - totalPrevious) / totalPrevious) * 1000) / 10
      : totalCurrent > 0
      ? 100
      : 0;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
            Sales Overview
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Revenue trends compared against previous period
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg self-start sm:self-auto">
          {(["today", "week", "month"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setPeriod(tab)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition-colors ${
                period === tab
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {tab === "today" ? "Today" : tab === "week" ? "This Week" : "This Month"}
            </button>
          ))}
        </div>
      </div>

      {/* Summary comparison header */}
      <div className="flex flex-wrap items-baseline gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
        <span className="text-2xl font-bold text-slate-900 dark:text-white">
          Rp {totalCurrent.toLocaleString("id-ID")}
        </span>
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
            diff >= 0
              ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60"
              : "bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200/60 dark:border-red-800/60"
          }`}
        >
          {diff >= 0 ? "+" : ""}
          {pct}% vs prev {period === "today" ? "day" : period === "week" ? "week" : "month"}
        </span>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          (Prev: Rp {totalPrevious.toLocaleString("id-ID")})
        </span>
      </div>

      {/* Bar Comparison Chart */}
      <div className="h-44 sm:h-52 flex items-end gap-2 sm:gap-4 pt-4 pb-2 px-1 overflow-x-auto">
        {currentDataset.map((item, idx) => {
          const currHeight = Math.max(
            item.current > 0 ? Math.round((item.current / maxVal) * 100) : 4,
            4
          );
          const prevHeight = Math.max(
            item.previous > 0 ? Math.round((item.previous / maxVal) * 100) : 4,
            4
          );

          return (
            <div
              key={idx}
              className="flex-1 min-w-[38px] sm:min-w-[48px] flex flex-col items-center gap-2 group h-full justify-end"
            >
              {/* Tooltip on hover */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -translate-y-14 bg-slate-900 dark:bg-slate-800 text-white text-[11px] p-2 rounded shadow-lg pointer-events-none whitespace-nowrap z-10 space-y-0.5">
                <div className="font-semibold">{item.label}</div>
                <div className="text-blue-400">Current: Rp {item.current.toLocaleString("id-ID")}</div>
                <div className="text-slate-400">Previous: Rp {item.previous.toLocaleString("id-ID")}</div>
              </div>

              {/* Side-by-side comparison bars */}
              <div className="w-full flex items-end justify-center gap-1 h-full">
                {/* Previous bar */}
                <div
                  style={{ height: `${prevHeight}%` }}
                  className="w-1/2 rounded-t-xs bg-slate-200 dark:bg-slate-700/80 transition-all"
                />
                {/* Current bar */}
                <div
                  style={{ height: `${currHeight}%` }}
                  className="w-1/2 rounded-t-xs bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-400 transition-all"
                />
              </div>

              <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-mono truncate max-w-full">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-4 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-xs bg-blue-600 dark:bg-blue-500" />
          Current Period
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-xs bg-slate-200 dark:bg-slate-700" />
          Previous Period
        </span>
      </div>
    </div>
  );
}
