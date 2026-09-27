import React from "react";
import Link from "next/link";
import { DashboardKPI, DashboardQuickActions } from "./DashboardFramework";
import { DonutChart, SimpleBarChart } from "./DashboardCharts";
import type { WarehouseDashboardData } from "@/lib/dashboard";

export default function WarehouseDashboard({
  data,
  userName: _userName,
}: {
  data: WarehouseDashboardData;
  userName: string;
}) {
  return (
    <div className="space-y-6 sm:space-y-8">
      {/* 6 KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <DashboardKPI
          title="Pending Receipts"
          value={data.pendingReceipts}
          subtitle={<span className="text-amber-600 font-medium">Draft GR status</span>}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          iconBgColor="bg-amber-50 dark:bg-amber-950/60"
          iconTextColor="text-amber-600 dark:text-amber-400"
        />

        <DashboardKPI
          title="Today's Receipts"
          value={data.todayReceipts}
          subtitle={<span className="text-emerald-600 font-medium">Confirmed today</span>}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          iconBgColor="bg-emerald-50 dark:bg-emerald-950/60"
          iconTextColor="text-emerald-600 dark:text-emerald-400"
        />

        <DashboardKPI
          title="Received Items"
          value={data.receivedItems}
          subtitle={<span className="text-blue-600 font-medium">Total quantity in</span>}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          }
          iconBgColor="bg-blue-50 dark:bg-blue-950/60"
          iconTextColor="text-blue-600 dark:text-blue-400"
        />

        <DashboardKPI
          title="Pending PO Receipts"
          value={data.pendingPOReceipts}
          subtitle={<span className="text-indigo-600 font-medium">Approved POs</span>}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
          iconBgColor="bg-indigo-50 dark:bg-indigo-950/60"
          iconTextColor="text-indigo-600 dark:text-indigo-400"
        />

        <DashboardKPI
          title="Partial Receipts"
          value={data.partialReceipts}
          subtitle={<span className="text-purple-600 font-medium">Split fulfillment</span>}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          }
          iconBgColor="bg-purple-50 dark:bg-purple-950/60"
          iconTextColor="text-purple-600 dark:text-purple-400"
        />

        <DashboardKPI
          title="Completed Receipts"
          value={data.completedReceipts}
          subtitle={<span className="text-teal-600 font-medium">Total finalized</span>}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          }
          iconBgColor="bg-teal-50 dark:bg-teal-950/60"
          iconTextColor="text-teal-600 dark:text-teal-400"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Goods Receipt Trend</h3>
          <p className="text-xs text-slate-500 mb-4">Confirmed receiving count (last 7 days)</p>
          <SimpleBarChart points={data.goodsReceiptTrend} />
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Receipt Status</h3>
          <p className="text-xs text-slate-500 mb-4">Draft, Confirmed, Cancelled status</p>
          <DonutChart items={data.receiptStatusDistribution} totalLabel="Receipts" />
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Goods Received by Supplier</h3>
          <p className="text-xs text-slate-500 mb-4">Inbound volume by vendor</p>
          <DonutChart items={data.goodsReceivedBySupplier} totalLabel="Shipments" />
        </div>
      </div>

      {/* Operational Sections: Pending GRs & Recent GRs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Pending Goods Receipts</h3>
            <Link href="/purchasing/receipts" className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
              All Receipts &rarr;
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.pendingGoodsReceipts.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No pending draft receipts</p>
            ) : (
              data.pendingGoodsReceipts.map((gr) => (
                <div key={gr.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{gr.grNumber}</p>
                    <p className="text-slate-500">PO: {gr.poNumber} • {gr.supplier}</p>
                  </div>
                  <Link
                    href={`/purchasing/receipts/${gr.id}`}
                    className="text-xs font-semibold px-2.5 py-1 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                  >
                    Confirm &rarr;
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Recent Confirmed Receipts</h3>
            <Link href="/purchasing/receipts" className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
              History &rarr;
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.recentGoodsReceipts.map((gr) => (
              <div key={gr.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{gr.grNumber}</p>
                  <p className="text-slate-500">{gr.supplier} • Received by {gr.receivedBy}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">{gr.status}</span>
                  <p className="text-[11px] text-slate-400">{new Date(gr.receivedDate).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <DashboardQuickActions
        actions={[
          {
            label: "Receive Goods (New GR)",
            description: "Process inbound delivery against PO",
            href: "/purchasing/receipts/create",
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            ),
          },
          {
            label: "Goods Receipts List",
            description: "View all receiving transactions",
            href: "/purchasing/receipts",
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            ),
          },
        ]}
      />
    </div>
  );
}
