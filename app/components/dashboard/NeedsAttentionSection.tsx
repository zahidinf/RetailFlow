import React from "react";
import Link from "next/link";

export interface AttentionItem {
  id: string;
  type: "critical" | "warning" | "info";
  title: string;
  message: string;
  actionLabel?: string;
  actionHref?: string;
}

interface NeedsAttentionProps {
  title?: string;
  items: AttentionItem[];
}

export default function NeedsAttentionSection({
  title = "Needs Attention",
  items,
}: NeedsAttentionProps) {
  if (items.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs flex items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              You&apos;re all caught up
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No pending alerts, issues, or action items requiring your attention right now.
            </p>
          </div>
        </div>
        <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
          All Normal
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          {title} ({items.length})
        </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((item) => {
          const isCritical = item.type === "critical";
          const isWarning = item.type === "warning";

          const bgClass = isCritical
            ? "bg-red-50/70 dark:bg-red-950/30 border-red-200 dark:border-red-900/60"
            : isWarning
            ? "bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60"
            : "bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/60";

          const textClass = isCritical
            ? "text-red-800 dark:text-red-200"
            : isWarning
            ? "text-amber-800 dark:text-amber-200"
            : "text-blue-800 dark:text-blue-200";

          const iconClass = isCritical
            ? "text-red-600 dark:text-red-400"
            : isWarning
            ? "text-amber-600 dark:text-amber-400"
            : "text-blue-600 dark:text-blue-400";

          return (
            <div
              key={item.id}
              className={`rounded-xl border p-4 shadow-xs flex items-start justify-between gap-3 transition-colors ${bgClass}`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className={`mt-0.5 shrink-0 ${iconClass}`}>
                  {isCritical ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  ) : isWarning ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  )}
                </div>
                <div className="min-w-0">
                  <h4 className={`text-sm font-semibold truncate ${textClass}`}>{item.title}</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2">
                    {item.message}
                  </p>
                </div>
              </div>

              {item.actionHref && item.actionLabel && (
                <Link
                  href={item.actionHref}
                  className="shrink-0 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  {item.actionLabel}
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
