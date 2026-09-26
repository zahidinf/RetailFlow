"use client";

import React, { useState } from "react";
import StatCard from "@/app/components/dashboard/StatCard";
import ManagerSalesOverview from "@/app/components/dashboard/ManagerSalesOverview";
import type { ManagerDashboardData } from "@/lib/dashboard";

interface Props {
  data: ManagerDashboardData;
}

export default function SalesReportContent({ data }: Props) {
  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Level 1: Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Today's Sales"
          value={`Rp ${data.todaySales.toLocaleString("id-ID")}`}
          subtitle={
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              Gross revenue today
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

        <StatCard
          title="Today's Transactions"
          value={data.todayTransactions}
          subtitle={
            <span className="text-slate-500 dark:text-slate-400">
              Completed checkouts
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

        <StatCard
          title="Avg Transaction Value"
          value={`Rp ${Math.round(data.avgTransactionValue).toLocaleString("id-ID")}`}
          subtitle={
            <span className="text-slate-500 dark:text-slate-400">
              Per completed sale
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
      </div>

      {/* Level 2: Sales Overview Chart with Period Toggles */}
      <ManagerSalesOverview data={data.salesOverview} />

      {/* Level 3: Breakdown (Category + Top Products) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sales by Category */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs transition-colors">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              Sales by Category
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Revenue and units sold per category
            </p>
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
              No category sales recorded.
            </div>
          )}
        </div>

        {/* Top Selling Products */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
          <div className="p-5 sm:px-6 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              Top Selling Products
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Best performing products by revenue
            </p>
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
      </div>
    </div>
  );
}
