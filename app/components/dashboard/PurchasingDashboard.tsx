import React from "react";
import Link from "next/link";
import { DashboardKPI, DashboardQuickActions } from "./DashboardFramework";
import { DonutChart, SimpleBarChart } from "./DashboardCharts";
import type { PurchasingDashboardData } from "@/lib/dashboard";

export default function PurchasingDashboard({
  data,
  userName: _userName,
}: {
  data: PurchasingDashboardData;
  userName: string;
}) {
  return (
    <div className="space-y-6 sm:space-y-8">
      {/* 6 KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <DashboardKPI
          title="Pending POs"
          value={data.pendingPurchaseOrders}
          subtitle={<span className="text-amber-600 font-medium">Submitted status</span>}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          iconBgColor="bg-amber-50 dark:bg-amber-950/60"
          iconTextColor="text-amber-600 dark:text-amber-400"
        />

        <DashboardKPI
          title="Open POs"
          value={data.openPurchaseOrders}
          subtitle={<span className="text-blue-600 font-medium">Awaiting receipt</span>}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
          iconBgColor="bg-blue-50 dark:bg-blue-950/60"
          iconTextColor="text-blue-600 dark:text-blue-400"
        />

        <DashboardKPI
          title="This Month Purchase"
          value={`Rp ${data.thisMonthPurchase.toLocaleString("id-ID")}`}
          subtitle={<span className="text-emerald-600 font-medium">MTD approved</span>}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
          iconBgColor="bg-emerald-50 dark:bg-emerald-950/60"
          iconTextColor="text-emerald-600 dark:text-emerald-400"
        />

        <DashboardKPI
          title="Total Suppliers"
          value={data.totalSuppliers}
          subtitle={<span className="text-indigo-600 font-medium">Active partners</span>}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
          iconBgColor="bg-indigo-50 dark:bg-indigo-950/60"
          iconTextColor="text-indigo-600 dark:text-indigo-400"
        />

        <DashboardKPI
          title="Pending Receipts"
          value={data.pendingReceipts}
          subtitle={<span className="text-purple-600 font-medium">Inbound expected</span>}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          }
          iconBgColor="bg-purple-50 dark:bg-purple-950/60"
          iconTextColor="text-purple-600 dark:text-purple-400"
        />

        <DashboardKPI
          title="Purchase Value"
          value={`Rp ${data.purchaseValue.toLocaleString("id-ID")}`}
          subtitle={<span className="text-slate-500">Cumulative total</span>}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          iconBgColor="bg-cyan-50 dark:bg-cyan-950/60"
          iconTextColor="text-cyan-600 dark:text-cyan-400"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Purchase Trend</h3>
          <p className="text-xs text-slate-500 mb-4">Past 6 months procurement value</p>
          <SimpleBarChart
            points={data.purchaseTrend}
            currency={true}
          />
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Purchase by Supplier</h3>
          <p className="text-xs text-slate-500 mb-4">Spend volume across vendors</p>
          <DonutChart
            items={data.purchaseBySupplier}
            currency={true}
            totalLabel="Procured"
          />
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">PO Status Distribution</h3>
          <p className="text-xs text-slate-500 mb-4">Actual lifecycle status count</p>
          <DonutChart items={data.poStatusDistribution} totalLabel="Orders" />
        </div>
      </div>

      {/* Operational Sections: Pending Orders & Supplier Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Active Purchase Orders</h3>
            <Link href="/purchasing/orders" className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
              View All Orders &rarr;
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.pendingPOsList.map((po) => (
              <div key={po.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{po.poNumber}</p>
                  <p className="text-slate-500">{po.supplier}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900 dark:text-white">Rp {po.totalAmount.toLocaleString("id-ID")}</p>
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">{po.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Supplier Spend Summary</h3>
            <Link href="/purchasing/suppliers" className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
              Manage Suppliers &rarr;
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.supplierSummary.map((s) => (
              <div key={s.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{s.name}</p>
                  <p className="text-slate-500">{s.poCount} POs processed</p>
                </div>
                <p className="font-bold text-slate-900 dark:text-white">
                  Rp {s.totalPurchased.toLocaleString("id-ID")}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <DashboardQuickActions
        actions={[
          {
            label: "Create Purchase Order",
            description: "Initiate new PO requisition",
            href: "/purchasing/orders/create",
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            ),
          },
          {
            label: "Suppliers Directory",
            description: "Manage vendor contacts",
            href: "/purchasing/suppliers",
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            ),
          },
        ]}
      />
    </div>
  );
}
