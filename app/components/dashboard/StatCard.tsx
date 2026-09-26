import React from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: React.ReactNode;
  icon: React.ReactNode;
  iconBgColor?: string;
  iconTextColor?: string;
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  iconBgColor = "bg-blue-50 dark:bg-blue-950/60",
  iconTextColor = "text-blue-600 dark:text-blue-400",
}: StatCardProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
        <div
          className={`w-10 h-10 rounded-lg ${iconBgColor} ${iconTextColor} flex items-center justify-center shrink-0`}
        >
          {icon}
        </div>
      </div>
      <div className="mt-3">
        <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          {value}
        </h3>
        {subtitle && <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</div>}
      </div>
    </div>
  );
}
