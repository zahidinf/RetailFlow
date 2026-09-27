import React from "react";
import Link from "next/link";
import { DashboardKPI, DashboardQuickActions } from "./DashboardFramework";
import { DonutChart, SimpleBarChart } from "./DashboardCharts";
import type { AccountantDashboardData } from "@/lib/dashboard";

export default function AccountantDashboard({
  data,
  userName: _userName,
}: {
  data: AccountantDashboardData;
  userName: string;
}) {
  return (
    <div className="space-y-6 sm:space-y-8">
      {/* 6 KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <DashboardKPI
          title="Today's Sales"
          value={`Rp ${data.todaySales.toLocaleString("id-ID")}`}
          subtitle={<span className="text-emerald-600 font-medium">Daily gross</span>}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          iconBgColor="bg-emerald-50 dark:bg-emerald-950/60"
          iconTextColor="text-emerald-600 dark:text-emerald-400"
        />

        <DashboardKPI
          title="Monthly Sales"
          value={`Rp ${data.monthlySales.toLocaleString("id-ID")}`}
          subtitle={<span className="text-blue-600 font-medium">MTD revenue</span>}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
          iconBgColor="bg-blue-50 dark:bg-blue-950/60"
          iconTextColor="text-blue-600 dark:text-blue-400"
        />

        <DashboardKPI
          title="Transactions"
          value={data.totalTransactions}
          subtitle={<span className="text-slate-500">In selected period</span>}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
          iconBgColor="bg-indigo-50 dark:bg-indigo-950/60"
          iconTextColor="text-indigo-600 dark:text-indigo-400"
        />

        <DashboardKPI
          title="Avg Transaction"
          value={`Rp ${data.avgTransactionValue.toLocaleString("id-ID")}`}
          subtitle={<span className="text-purple-600 font-medium">Per checkout</span>}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
          iconBgColor="bg-purple-50 dark:bg-purple-950/60"
          iconTextColor="text-purple-600 dark:text-purple-400"
        />

        <DashboardKPI
          title="Tax Collected"
          value={`Rp ${data.taxCollected.toLocaleString("id-ID")}`}
          subtitle={<span className="text-cyan-600 font-medium">PPN 11% inclusive</span>}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
            </svg>
          }
          iconBgColor="bg-cyan-50 dark:bg-cyan-950/60"
          iconTextColor="text-cyan-600 dark:text-cyan-400"
        />

        <DashboardKPI
          title="Refund Amount"
          value={`Rp ${data.refundAmount.toLocaleString("id-ID")}`}
          subtitle={<span className="text-amber-600 font-medium">Returns recorded</span>}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          }
          iconBgColor="bg-amber-50 dark:bg-amber-950/60"
          iconTextColor="text-amber-600 dark:text-amber-400"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Sales Trend</h3>
          <p className="text-xs text-slate-500 mb-4">Gross sales daily movement</p>
          <SimpleBarChart
            points={data.salesTrend}
            currency={true}
          />
        </div>

        {/* Tax Summary Breakdown */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Tax Summary (PPN 11%)</h3>
            <p className="text-xs text-slate-500 mb-4">Tax-inclusive reverse breakdown</p>
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                <span className="text-xs text-slate-600 dark:text-slate-400">Net Taxable Revenue</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  Rp {data.taxSummary.grossSales.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                <span className="text-xs text-slate-600 dark:text-slate-400">Pre-Tax Base Amount</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  Rp {data.taxSummary.preTaxAmount.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900">
                <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">PPN 11% Tax Collected</span>
                <span className="font-bold text-blue-700 dark:text-blue-300">
                  Rp {data.taxSummary.taxAmount.toLocaleString("id-ID")}
                </span>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-4">
            Calculated per standard Indonesian PPN 11% tax-inclusive formula: Base = Price / 1.11, PPN = Price - Base.
          </p>
        </div>

        {/* Sales by Payment Method */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Payment Method Distribution</h3>
          <p className="text-xs text-slate-500 mb-4">Cash vs electronic settlement</p>
          <DonutChart
            items={data.salesByPaymentMethod}
            currency={true}
            totalLabel="Revenue"
          />
        </div>

        {/* Revenue by Category */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Revenue by Category</h3>
          <p className="text-xs text-slate-500 mb-4">Sales contribution across catalog</p>
          <DonutChart
            items={data.revenueByCategory}
            currency={true}
            totalLabel="Category Total"
          />
        </div>
      </div>

      {/* Operational Sections: Recent Transactions & Refunds */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Recent Transactions</h3>
            <Link href="/sales" className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
              Full Ledger &rarr;
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.recentTransactions.map((tx) => (
              <div key={tx.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{tx.saleNumber}</p>
                  <p className="text-slate-500">{tx.paymentMethod}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900 dark:text-white">Rp {tx.totalAmount.toLocaleString("id-ID")}</p>
                  <span className="text-[10px] text-emerald-600 font-semibold">{tx.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Recent Refunds</h3>
            <Link href="/reports?tab=finance" className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
              Finance Reports &rarr;
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.recentRefunds.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No refund records logged</p>
            ) : (
              data.recentRefunds.map((rf) => (
                <div key={rf.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{rf.refundNumber}</p>
                    <p className="text-slate-500">Sale: {rf.saleNumber} {rf.reason ? `• ${rf.reason}` : ""}</p>
                  </div>
                  <p className="font-bold text-amber-600 dark:text-amber-400">
                    -Rp {rf.totalAmount.toLocaleString("id-ID")}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <DashboardQuickActions
        actions={[
          {
            label: "Finance Reports",
            description: "View revenue and tax statements",
            href: "/reports?tab=finance",
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            ),
          },
          {
            label: "Sales Ledger",
            description: "Full sales transaction journal",
            href: "/sales",
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ),
          },
        ]}
      />
    </div>
  );
}
