import React from "react";
import Link from "next/link";
import StatCard from "./StatCard";
import NeedsAttentionSection from "./NeedsAttentionSection";
import type { CashierDashboardData } from "@/lib/dashboard";

interface CashierDashboardProps {
  data: CashierDashboardData;
  userName: string;
}

export default function CashierDashboard({ data, userName }: CashierDashboardProps) {
  const maxHourlyAmount = Math.max(...data.hourlySales.map((h) => h.amount), 1);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Level 1: Needs Attention */}
      <NeedsAttentionSection items={data.needsAttention} />

      {/* Level 2: Key Metrics / KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Today's Transactions */}
        <StatCard
          title="Today's Transactions"
          value={data.todayTransactions}
          subtitle={
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              Completed checkouts today
            </span>
          }
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
          }
          iconBgColor="bg-blue-50 dark:bg-blue-950/60"
          iconTextColor="text-blue-600 dark:text-blue-400"
        />

        {/* Today's Sales */}
        <StatCard
          title="Today's Sales"
          value={`Rp ${data.todaySales.toLocaleString("id-ID")}`}
          subtitle={
            <span className="text-slate-500 dark:text-slate-400">
              Personal shift revenue
            </span>
          }
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
          iconBgColor="bg-emerald-50 dark:bg-emerald-950/60"
          iconTextColor="text-emerald-600 dark:text-emerald-400"
        />

        {/* Average Transaction */}
        <StatCard
          title="Average Transaction"
          value={`Rp ${data.avgTransaction.toLocaleString("id-ID")}`}
          subtitle={
            <span className="text-slate-500 dark:text-slate-400">
              Per completed sale
            </span>
          }
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          }
          iconBgColor="bg-indigo-50 dark:bg-indigo-950/60"
          iconTextColor="text-indigo-600 dark:text-indigo-400"
        />

        {/* Refunds / Voids */}
        <StatCard
          title="Refunds / Voids"
          value={data.refundsCount}
          subtitle={
            data.refundsCount === 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Clean shift</span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400 font-medium">Recorded today</span>
            )
          }
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          }
          iconBgColor="bg-amber-50 dark:bg-amber-950/60"
          iconTextColor="text-amber-600 dark:text-amber-400"
        />
      </div>

      {/* Level 3: My Sales Today (Hourly Activity Chart) */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              My Sales Today
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Hourly sales volume and completed transactions throughout your shift
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 self-start sm:self-auto">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-blue-500" />
              Sales Amount (IDR)
            </span>
          </div>
        </div>

        {/* Visual Bar Chart */}
        <div className="h-44 sm:h-52 flex items-end gap-1.5 sm:gap-2.5 pt-6 pb-2 px-1 border-b border-slate-100 dark:border-slate-800 overflow-x-auto">
          {data.hourlySales.map((item) => {
            const heightPercent = Math.max(
              item.amount > 0 ? Math.round((item.amount / maxHourlyAmount) * 100) : 4,
              4
            );
            return (
              <div
                key={item.hour}
                className="flex-1 min-w-[28px] sm:min-w-[36px] flex flex-col items-center gap-2 group h-full justify-end"
              >
                {/* Tooltip on hover */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -translate-y-12 bg-slate-900 dark:bg-slate-800 text-white text-[11px] px-2 py-1 rounded shadow-md pointer-events-none whitespace-nowrap z-10">
                  {item.label}: Rp {item.amount.toLocaleString("id-ID")} ({item.count} tx)
                </div>

                <div
                  style={{ height: `${heightPercent}%` }}
                  className={`w-full rounded-t-md transition-all ${
                    item.amount > 0
                      ? "bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-400"
                      : "bg-slate-100 dark:bg-slate-800"
                  }`}
                />
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                  {item.hour}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Level 4: Recent Transactions */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
        <div className="p-5 sm:px-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              Recent Transactions
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Your latest processed point-of-sale invoices
            </p>
          </div>
          <Link
            href="/sales"
            className="text-xs sm:text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 transition-colors"
          >
            All Sales &rarr;
          </Link>
        </div>

        {data.recentTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Invoice #</th>
                  <th className="px-5 py-3.5">Time</th>
                  <th className="px-5 py-3.5">Items</th>
                  <th className="px-5 py-3.5">Payment</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.recentTransactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    <td className="px-5 py-4 font-mono font-medium text-xs text-blue-600 dark:text-blue-400">
                      {tx.saleNumber}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500 dark:text-slate-400">
                      {new Date(tx.createdAt).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-600 dark:text-slate-300">
                      {tx.itemsCount} items
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-medium text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {tx.paymentMethod}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          tx.status === "COMPLETED"
                            ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60"
                            : "bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200/60 dark:border-red-800/60"
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right font-bold text-slate-900 dark:text-white">
                      Rp {tx.totalAmount.toLocaleString("id-ID")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            No transactions yet today. Click &quot;New Sale&quot; to begin checkout.
          </div>
        )}
      </div>

      {/* Level 5: Quick Actions */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* New Sale */}
          <Link
            href="/pos"
            className="group bg-blue-600 hover:bg-blue-700 text-white rounded-xl p-4 shadow-xs hover:shadow-sm transition-all flex items-center gap-3.5"
          >
            <div className="w-10 h-10 rounded-lg bg-white/20 text-white flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">New Sale</p>
              <p className="text-xs text-blue-100 truncate">Open POS terminal</p>
            </div>
          </Link>

          {/* Transaction History */}
          <Link
            href="/sales"
            className="group bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500/60 dark:hover:border-blue-500/60 p-4 shadow-xs hover:shadow-sm transition-all flex items-center gap-3.5"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                Transaction History
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                View all personal sales
              </p>
            </div>
          </Link>

          {/* Hold / Resume Sale */}
          <Link
            href="/pos"
            className="group bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-amber-500/60 dark:hover:border-amber-500/60 p-4 shadow-xs hover:shadow-sm transition-all flex items-center gap-3.5"
          >
            <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 group-hover:bg-amber-600 group-hover:text-white transition-colors flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors truncate">
                Hold / Resume Sale
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Queue cart in POS terminal
              </p>
            </div>
          </Link>

          {/* Refund / Return */}
          <Link
            href="/sales"
            className="group bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 p-4 shadow-xs hover:shadow-sm transition-all flex items-center gap-3.5"
          >
            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-slate-800 dark:group-hover:bg-slate-700 group-hover:text-white transition-colors flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors truncate">
                Refund / Return
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Lookup customer receipt
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
