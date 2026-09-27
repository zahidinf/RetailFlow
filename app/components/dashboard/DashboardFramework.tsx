import React from "react";
import Link from "next/link";
import StatCard from "./StatCard";

export interface DashboardKPICardProps {
  title: string;
  value: string | number;
  subtitle?: React.ReactNode;
  icon: React.ReactNode;
  iconBgColor?: string;
  iconTextColor?: string;
}

export function DashboardKPI({
  title,
  value,
  subtitle,
  icon,
  iconBgColor,
  iconTextColor,
}: DashboardKPICardProps) {
  return (
    <StatCard
      title={title}
      value={value}
      subtitle={subtitle}
      icon={icon}
      iconBgColor={iconBgColor}
      iconTextColor={iconTextColor}
    />
  );
}

export interface DashboardHeaderProps {
  title: string;
  subtitle: string;
  roleName: string;
  userName: string;
  dateRangeComponent?: React.ReactNode;
}

export function DashboardHeader({
  title,
  subtitle,
  roleName,
  userName: _userName,
  dateRangeComponent,
}: DashboardHeaderProps) {
  const currentDateFormatted = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
              {roleName}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 dark:bg-green-950/60 text-green-700 dark:text-green-300 border border-green-200/60 dark:border-green-800/60">
              <span className="w-1.5 h-1.5 rounded-full bg-green-600 dark:bg-green-400 animate-pulse" />
              System Active
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            {title}
          </h1>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
            {subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
          {dateRangeComponent}
          <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2 rounded-lg">
            <svg
              className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span>{currentDateFormatted}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export interface QuickActionItem {
  label: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  iconBg?: string;
  iconColor?: string;
}

export function DashboardQuickActions({ actions }: { actions: QuickActionItem[] }) {
  if (actions.length === 0) return null;
  return (
    <div className="space-y-3">
      <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
        Quick Actions
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {actions.map((act, idx) => (
          <Link
            key={idx}
            href={act.href}
            className="group bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500/60 dark:hover:border-blue-500/60 p-4 shadow-xs hover:shadow-sm transition-all flex items-center gap-3.5"
          >
            <div
              className={`w-10 h-10 rounded-lg ${
                act.iconBg || "bg-blue-50 dark:bg-blue-950/60"
              } ${
                act.iconColor || "text-blue-600 dark:text-blue-400"
              } group-hover:bg-blue-600 group-hover:text-white transition-colors flex items-center justify-center shrink-0`}
            >
              {act.icon}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                {act.label}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {act.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function DashboardEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 sm:p-12 text-center shadow-xs transition-colors">
      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto mb-3">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
      </div>
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
        {description}
      </p>
    </div>
  );
}
