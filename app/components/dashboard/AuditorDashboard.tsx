import React from "react";
import Link from "next/link";
import { DashboardKPI, DashboardQuickActions } from "./DashboardFramework";
import { DonutChart, SimpleBarChart } from "./DashboardCharts";
import type { AuditorDashboardData } from "@/lib/dashboard";

export default function AuditorDashboard({
  data,
  userName: _userName,
}: {
  data: AuditorDashboardData;
  userName: string;
}) {
  return (
    <div className="space-y-6 sm:space-y-8">
      {/* 6 KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <DashboardKPI
          title="Total Audit Events"
          value={data.totalAuditEvents}
          subtitle={<span className="text-slate-500">Immutable ledger</span>}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
          iconBgColor="bg-blue-50 dark:bg-blue-950/60"
          iconTextColor="text-blue-600 dark:text-blue-400"
        />

        <DashboardKPI
          title="Create Actions"
          value={data.createActions}
          subtitle={<span className="text-emerald-600 font-medium">Entities added</span>}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          }
          iconBgColor="bg-emerald-50 dark:bg-emerald-950/60"
          iconTextColor="text-emerald-600 dark:text-emerald-400"
        />

        <DashboardKPI
          title="Update Actions"
          value={data.updateActions}
          subtitle={<span className="text-amber-600 font-medium">Modifications</span>}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          }
          iconBgColor="bg-amber-50 dark:bg-amber-950/60"
          iconTextColor="text-amber-600 dark:text-amber-400"
        />

        <DashboardKPI
          title="Delete Actions"
          value={data.deleteActions}
          subtitle={<span className="text-rose-600 font-medium">Deletions logged</span>}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          }
          iconBgColor="bg-rose-50 dark:bg-rose-950/60"
          iconTextColor="text-rose-600 dark:text-rose-400"
        />

        <DashboardKPI
          title="Login Events"
          value={data.loginEvents}
          subtitle={<span className="text-indigo-600 font-medium">Auth sessions</span>}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
          }
          iconBgColor="bg-indigo-50 dark:bg-indigo-950/60"
          iconTextColor="text-indigo-600 dark:text-indigo-400"
        />

        <DashboardKPI
          title="Failed Attempts"
          value={data.failedEvents}
          subtitle={
            data.failedEvents === 0 ? (
              <span className="text-emerald-600 font-medium">Zero failures</span>
            ) : (
              <span className="text-red-600 font-medium">Security flags</span>
            )
          }
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
          iconBgColor="bg-red-50 dark:bg-red-950/60"
          iconTextColor="text-red-600 dark:text-red-400"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Audit Activity Trend</h3>
          <p className="text-xs text-slate-500 mb-4">7-day volume breakdown</p>
          <SimpleBarChart points={data.auditActivityTrend} />
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Activity by Module</h3>
          <p className="text-xs text-slate-500 mb-4">Operations per subsystem</p>
          <DonutChart items={data.activityByModule} totalLabel="Events" />
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Activity by Action</h3>
          <p className="text-xs text-slate-500 mb-4">Operation type distribution</p>
          <DonutChart items={data.activityByAction} totalLabel="Actions" />
        </div>
      </div>

      {/* Operational Sections: Sensitive Activity & Full Audit Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Sensitive System Events</h3>
            <span className="text-[10px] uppercase font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
              High Impact
            </span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.sensitiveActivity.map((log) => (
              <div key={log.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {log.action} on {log.entity}
                  </p>
                  <p className="text-slate-500 truncate">{log.description}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">By {log.user} • ID: {log.record}</p>
                </div>
                <span className="text-[11px] text-slate-400 shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Recent Audit Activity</h3>
            <Link href="/reports?tab=audit" className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
              Audit Reports &rarr;
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.recentAuditActivity.map((log) => (
              <div key={log.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {log.user} <span className="font-normal text-slate-500">• {log.action} {log.entity}</span>
                  </p>
                  <p className="text-slate-400 text-[11px] truncate">{log.description}</p>
                </div>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  log.status === "SUCCESS" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                }`}>
                  {log.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <DashboardQuickActions
        actions={[
          {
            label: "Audit Reports",
            description: "Detailed compliance logs and filters",
            href: "/reports?tab=audit",
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            ),
          },
          {
            label: "Export Audit Logs",
            description: "Download verified CSV ledger",
            href: "/reports?tab=audit",
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            ),
          },
        ]}
      />
    </div>
  );
}
