import React from "react";
import Link from "next/link";
import { DashboardKPI, DashboardQuickActions } from "./DashboardFramework";
import { DonutChart, SimpleBarChart } from "./DashboardCharts";
import type { SuperAdminDashboardData } from "@/lib/dashboard";

export default function SuperAdminDashboard({
  data,
  userName: _userName,
}: {
  data: SuperAdminDashboardData;
  userName: string;
}) {
  return (
    <div className="space-y-6 sm:space-y-8">
      {/* KPI Cards Row (8 cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <DashboardKPI
          title="Total Sales Today"
          value={`Rp ${data.totalSalesToday.toLocaleString("id-ID")}`}
          subtitle={<span className="text-emerald-600 dark:text-emerald-400 font-medium">Daily gross sales</span>}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          iconBgColor="bg-emerald-50 dark:bg-emerald-950/60"
          iconTextColor="text-emerald-600 dark:text-emerald-400"
        />

        <DashboardKPI
          title="Sales This Month"
          value={`Rp ${data.salesThisMonth.toLocaleString("id-ID")}`}
          subtitle={<span className="text-blue-600 dark:text-blue-400 font-medium">MTD aggregate</span>}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
          iconBgColor="bg-blue-50 dark:bg-blue-950/60"
          iconTextColor="text-blue-600 dark:text-blue-400"
        />

        <DashboardKPI
          title="Total Orders"
          value={data.totalOrders}
          subtitle={<span className="text-slate-500 dark:text-slate-400">Completed sales</span>}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          }
          iconBgColor="bg-indigo-50 dark:bg-indigo-950/60"
          iconTextColor="text-indigo-600 dark:text-indigo-400"
        />

        <DashboardKPI
          title="Active Users"
          value={data.activeUsers}
          subtitle={<span className="text-emerald-600 dark:text-emerald-400 font-medium">System accounts active</span>}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 8.646 4 4 0 010-8.646M19 12a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          }
          iconBgColor="bg-teal-50 dark:bg-teal-950/60"
          iconTextColor="text-teal-600 dark:text-teal-400"
        />

        <DashboardKPI
          title="Total Products"
          value={data.totalProducts}
          subtitle={<span className="text-slate-500 dark:text-slate-400">Active catalog items</span>}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          }
          iconBgColor="bg-cyan-50 dark:bg-cyan-950/60"
          iconTextColor="text-cyan-600 dark:text-cyan-400"
        />

        <DashboardKPI
          title="Low Stock Products"
          value={data.lowStockProducts}
          subtitle={
            data.lowStockProducts === 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Stock levels healthy</span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400 font-medium">At or below minimum</span>
            )
          }
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
          iconBgColor="bg-amber-50 dark:bg-amber-950/60"
          iconTextColor="text-amber-600 dark:text-amber-400"
        />

        <DashboardKPI
          title="Outstanding POs"
          value={data.outstandingPOs}
          subtitle={<span className="text-purple-600 dark:text-purple-400 font-medium">Pending or partial delivery</span>}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
          iconBgColor="bg-purple-50 dark:bg-purple-950/60"
          iconTextColor="text-purple-600 dark:text-purple-400"
        />

        <DashboardKPI
          title="System Alerts"
          value={data.systemAlertsCount}
          subtitle={
            data.systemAlertsCount === 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">All normal</span>
            ) : (
              <span className="text-red-600 dark:text-red-400 font-medium">Action items pending</span>
            )
          }
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          }
          iconBgColor="bg-rose-50 dark:bg-rose-950/60"
          iconTextColor="text-rose-600 dark:text-rose-400"
        />
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Performance Chart */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Sales Performance</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Revenue timeline across store</p>
            </div>
            <Link href="/sales/report" className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
              View Report &rarr;
            </Link>
          </div>
          <SimpleBarChart
            points={data.salesPerformance.map((p) => ({
              label: p.label,
              value: p.value,
            }))}
            currency={true}
          />
        </div>

        {/* Inventory Overview Status */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Inventory Health</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Stock condition overview</p>
            </div>
            <Link href="/admin/stock" className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
              Stock Center &rarr;
            </Link>
          </div>
          <DonutChart
            items={[
              { label: "In Stock", value: data.inventoryOverview.inStock, color: "#10b981" },
              { label: "Low Stock", value: data.inventoryOverview.lowStock, color: "#f59e0b" },
              { label: "Out of Stock", value: data.inventoryOverview.outOfStock, color: "#ef4444" },
            ]}
            totalLabel="Products"
          />
        </div>

        {/* Sales by Category */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Sales by Category</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Top selling product categories</p>
            </div>
          </div>
          <DonutChart
            items={data.salesByCategory.map((c) => ({
              label: c.label,
              value: c.value,
            }))}
            currency={true}
            totalLabel="Sales"
          />
        </div>

        {/* Sales by Payment Method */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Sales by Payment Method</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Tender type breakdown</p>
            </div>
          </div>
          <DonutChart
            items={data.salesByPaymentMethod.map((p) => ({
              label: p.label,
              value: p.value,
            }))}
            currency={true}
            totalLabel="Collected"
          />
        </div>
      </div>

      {/* Operational Section: Recent Transactions & User/Audit Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Recent Transactions</h3>
            <Link href="/sales" className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
              All Sales &rarr;
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.recentTransactions.map((tx) => (
              <div key={tx.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{tx.saleNumber}</p>
                  <p className="text-slate-500">{tx.cashierName} • {tx.paymentMethod}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900 dark:text-white">Rp {tx.totalAmount.toLocaleString("id-ID")}</p>
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">{tx.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Audit Events */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Recent Audit Trail</h3>
            <Link href="/admin/audit-reports" className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
              View Audit &rarr;
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.recentAuditActivity.map((log) => (
              <div key={log.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-white truncate">
                    {log.user} <span className="font-normal text-slate-500">• {log.action} {log.entity}</span>
                  </p>
                  <p className="text-slate-400 text-[11px] truncate">{log.record}</p>
                </div>
                <span className="text-[11px] text-slate-400 shrink-0">
                  {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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
            label: "User Management",
            description: "Manage accounts and permissions",
            href: "/admin/users",
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 8.646 4 4 0 010-8.646M19 12a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            ),
          },
          {
            label: "Stock Center",
            description: "Monitor and adjust inventory",
            href: "/admin/stock",
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            ),
          },
          {
            label: "Purchase Orders",
            description: "Review pending procurement",
            href: "/purchasing/orders",
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            ),
          },
          {
            label: "System Reports",
            description: "Consolidated operational reports",
            href: "/reports",
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            ),
          },
        ]}
      />
    </div>
  );
}
