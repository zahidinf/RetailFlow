import React from "react";
import Link from "next/link";
import StatCard from "./StatCard";
import ManagerSalesOverview from "./ManagerSalesOverview";
import type { ManagerDashboardData } from "@/lib/dashboard";

interface ManagerDashboardProps {
  data: ManagerDashboardData;
  userName: string;
}

export default function ManagerDashboard({ data, userName }: ManagerDashboardProps) {
  const hasInventoryAlerts =
    data.inventoryAlerts.outOfStockItems.length > 0 ||
    data.inventoryAlerts.lowStockItems.length > 0;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Level 1: Immediate Attention / Inventory Alerts */}
      {hasInventoryAlerts ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Store Inventory Alerts
            </h3>
            <Link
              href="/admin/stock"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Open Stock Center &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.inventoryAlerts.outOfStockItems.length > 0 && (
              <div className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/70 dark:bg-red-950/30 p-4 shadow-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-red-900 dark:text-red-200">
                      {data.outOfStockCount} Products Out of Stock
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                      {data.inventoryAlerts.outOfStockItems.map((i) => i.name).join(", ")}
                    </p>
                  </div>
                </div>
                <Link
                  href="/admin/stock?stockStatus=OUT_OF_STOCK"
                  className="shrink-0 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  Restock
                </Link>
              </div>
            )}

            {data.inventoryAlerts.lowStockItems.length > 0 && (
              <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 p-4 shadow-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                      {data.lowStockCount} Products Low on Stock
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                      {data.inventoryAlerts.lowStockItems.map((i) => i.name).join(", ")}
                    </p>
                  </div>
                </div>
                <Link
                  href="/admin/stock?stockStatus=LOW_STOCK"
                  className="shrink-0 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                >
                  Inspect
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs flex items-center justify-between gap-4 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                Store Inventory Healthy
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                All inventory items are currently above minimum stock thresholds.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
            Optimal Stock
          </span>
        </div>
      )}

      {/* Level 2: Key Metrics (6 KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Today's Sales */}
        <StatCard
          title="Today's Sales"
          value={`Rp ${data.todaySales.toLocaleString("id-ID")}`}
          subtitle={
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              Store gross revenue
            </span>
          }
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          iconBgColor="bg-emerald-50 dark:bg-emerald-950/60"
          iconTextColor="text-emerald-600 dark:text-emerald-400"
        />

        {/* Today's Transactions */}
        <StatCard
          title="Today's Transactions"
          value={data.todayTransactions}
          subtitle={
            <span className="text-slate-500 dark:text-slate-400">
              Completed invoices
            </span>
          }
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
          iconBgColor="bg-blue-50 dark:bg-blue-950/60"
          iconTextColor="text-blue-600 dark:text-blue-400"
        />

        {/* Average Transaction Value */}
        <StatCard
          title="Avg Transaction Value"
          value={`Rp ${Math.round(data.avgTransactionValue).toLocaleString("id-ID")}`}
          subtitle={
            <span className="text-slate-500 dark:text-slate-400">
              Average basket size
            </span>
          }
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
          iconBgColor="bg-indigo-50 dark:bg-indigo-950/60"
          iconTextColor="text-indigo-600 dark:text-indigo-400"
        />

        {/* Sales vs Yesterday */}
        <StatCard
          title="Sales vs Yesterday"
          value={`${data.salesPctChange >= 0 ? "+" : ""}${data.salesPctChange}%`}
          subtitle={
            <span
              className={
                data.salesDiff >= 0
                  ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                  : "text-red-600 dark:text-red-400 font-semibold"
              }
            >
              {data.salesDiff >= 0 ? "+" : ""}
              Rp {data.salesDiff.toLocaleString("id-ID")}
            </span>
          }
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          }
          iconBgColor={data.salesPctChange >= 0 ? "bg-emerald-50 dark:bg-emerald-950/60" : "bg-red-50 dark:bg-red-950/60"}
          iconTextColor={data.salesPctChange >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}
        />

        {/* Low Stock Items */}
        <StatCard
          title="Low Stock Items"
          value={data.lowStockCount}
          subtitle={
            <span className="text-amber-600 dark:text-amber-400 font-medium">
              Below threshold
            </span>
          }
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
          iconBgColor="bg-amber-50 dark:bg-amber-950/60"
          iconTextColor="text-amber-600 dark:text-amber-400"
        />

        {/* Returns / Refunds */}
        <StatCard
          title="Returns / Refunds"
          value={data.refundsCount}
          subtitle={
            <span className="text-slate-500 dark:text-slate-400">
              Voided/refunded sales
            </span>
          }
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          }
          iconBgColor="bg-slate-100 dark:bg-slate-800"
          iconTextColor="text-slate-600 dark:text-slate-400"
        />
      </div>

      {/* Level 3: Main Activity (Sales Overview + Sales by Category) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sales Overview Component with Today/Week/Month toggles */}
        <div className="lg:col-span-8">
          <ManagerSalesOverview data={data.salesOverview} />
        </div>

        {/* Sales by Category */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  Sales by Category
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Revenue breakdown across product categories
                </p>
              </div>
            </div>

            {data.salesByCategory.length > 0 ? (
              <div className="space-y-4">
                {data.salesByCategory.map((cat, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {cat.categoryName}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        Rp {cat.salesAmount.toLocaleString("id-ID")} ({cat.unitsSold} units)
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        style={{ width: `${Math.max(cat.percentage, 4)}%` }}
                        className="h-full rounded-full bg-blue-600 dark:bg-blue-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                No category sales recorded today.
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-right">
            <Link
              href="/admin/categories"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Manage Categories &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Level 4: Detail (Top Selling Products + Cashier Performance) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top Selling Products */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
          <div className="p-5 sm:px-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                Top Selling Products
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Products generating highest revenue
              </p>
            </div>
            <Link
              href="/admin/products"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              All Products &rarr;
            </Link>
          </div>

          {data.topSellingProducts.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.topSellingProducts.map((p) => (
                <div
                  key={p.productId}
                  className="p-4 sm:px-6 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {p.name}
                    </p>
                    <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                      SKU: {p.sku} &bull; {p.unitsSold} units sold
                    </p>
                  </div>
                  <div className="text-right shrink-0 font-bold text-sm text-slate-900 dark:text-white">
                    Rp {p.revenue.toLocaleString("id-ID")}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
              No product sales recorded yet.
            </div>
          )}
        </div>

        {/* Cashier Performance (Strictly objective, no ranking/grading/evaluative badges) */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
          <div className="p-5 sm:px-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                Cashier Performance
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Factual checkout metrics by cashier
              </p>
            </div>
            <Link
              href="/sales"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              View Invoices &rarr;
            </Link>
          </div>

          {data.cashierPerformance.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-5 py-3.5">Cashier</th>
                    <th className="px-5 py-3.5 text-center">Tx Count</th>
                    <th className="px-5 py-3.5 text-right">Sales</th>
                    <th className="px-5 py-3.5 text-right">Avg Basket</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.cashierPerformance.map((c) => (
                    <tr
                      key={c.cashierId}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="font-semibold text-xs text-slate-900 dark:text-white">
                          {c.name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[140px]">
                          {c.email}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center font-medium text-xs text-slate-700 dark:text-slate-300">
                        {c.transactionCount}
                      </td>
                      <td className="px-5 py-4 text-right font-bold text-xs text-slate-900 dark:text-white">
                        Rp {c.totalSales.toLocaleString("id-ID")}
                      </td>
                      <td className="px-5 py-4 text-right text-xs text-slate-500 dark:text-slate-400">
                        Rp {c.avgValue.toLocaleString("id-ID")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
              No cashier sales recorded yet.
            </div>
          )}
        </div>
      </div>

      {/* Level 5: Navigation / Quick Actions */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Link
            href="/sales/report"
            className="group bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500/60 dark:hover:border-blue-500/60 p-4 shadow-xs hover:shadow-sm transition-all flex items-center gap-3.5"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                Sales Report
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                View sales performance and trends
              </p>
            </div>
          </Link>

          <Link
            href="/admin/stock"
            className="group bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-amber-500/60 dark:hover:border-amber-500/60 p-4 shadow-xs hover:shadow-sm transition-all flex items-center gap-3.5"
          >
            <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 group-hover:bg-amber-600 group-hover:text-white transition-colors flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors truncate">
                View Inventory
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Stock levels & status</p>
            </div>
          </Link>

          <Link
            href="/sales"
            className="group bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500/60 dark:hover:border-indigo-500/60 p-4 shadow-xs hover:shadow-sm transition-all flex items-center gap-3.5"
          >
            <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                Transactions
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                View and manage sales transactions
              </p>
            </div>
          </Link>

          <Link
            href="/admin/products"
            className="group bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 p-4 shadow-xs hover:shadow-sm transition-all flex items-center gap-3.5"
          >
            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-slate-800 dark:group-hover:bg-slate-700 group-hover:text-white transition-colors flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors truncate">
                Product Catalog
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">View pricing & categories</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
