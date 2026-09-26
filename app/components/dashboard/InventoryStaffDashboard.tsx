import React from "react";
import Link from "next/link";
import StatCard from "./StatCard";
import NeedsAttentionSection from "./NeedsAttentionSection";
import type { InventoryStaffDashboardData } from "@/lib/dashboard";

interface InventoryStaffDashboardProps {
  data: InventoryStaffDashboardData;
  userName: string;
}

export default function InventoryStaffDashboard({
  data,
  userName,
}: InventoryStaffDashboardProps) {
  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Level 1: Immediate Attention / Urgent Restock Alerts */}
      <NeedsAttentionSection title="Restock & Stock Alerts" items={data.needsAttention} />

      {/* Level 2: Key Metrics (4 KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Products */}
        <StatCard
          title="Total Products"
          value={data.totalProducts}
          subtitle={
            <span className="text-blue-600 dark:text-blue-400 font-medium">
              Active SKU catalog
            </span>
          }
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          }
          iconBgColor="bg-blue-50 dark:bg-blue-950/60"
          iconTextColor="text-blue-600 dark:text-blue-400"
        />

        {/* Low Stock Items */}
        <StatCard
          title="Low Stock Items"
          value={data.lowStockCount}
          subtitle={
            <span className="text-amber-600 dark:text-amber-400 font-medium">
              At or below minimum
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

        {/* Out of Stock */}
        <StatCard
          title="Out of Stock"
          value={data.outOfStockCount}
          subtitle={
            data.outOfStockCount === 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Zero stockouts</span>
            ) : (
              <span className="text-red-600 dark:text-red-400 font-medium">Urgent restocking needed</span>
            )
          }
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          }
          iconBgColor="bg-red-50 dark:bg-red-950/60"
          iconTextColor="text-red-600 dark:text-red-400"
        />

        {/* Stock Adjustments Today */}
        <StatCard
          title="Adjustments Today"
          value={data.stockAdjustmentsToday}
          subtitle={
            <span className="text-slate-500 dark:text-slate-400">
              Manual entries logged
            </span>
          }
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
          iconBgColor="bg-purple-50 dark:bg-purple-950/60"
          iconTextColor="text-purple-600 dark:text-purple-400"
        />
      </div>

      {/* Level 3: Main Activity (Inventory Overview + Stock Activity) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Inventory Overview Card */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  Inventory Overview
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  Total warehouse stock volume and calculated valuation
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                Warehouse 1
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-500 dark:text-slate-400">Total Units</span>
                <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {data.inventoryOverview.totalStockQuantity.toLocaleString("id-ID")}
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-500 dark:text-slate-400">Stock Value</span>
                <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  Rp {data.inventoryOverview.stockValue.toLocaleString("id-ID")}
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 col-span-2 sm:col-span-1">
                <span className="text-xs text-slate-500 dark:text-slate-400">Stock Health</span>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  {data.totalProducts > 0
                    ? `${Math.round(
                        ((data.totalProducts - data.lowStockCount - data.outOfStockCount) /
                          data.totalProducts) *
                          100
                      )}%`
                    : "100%"}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Valuation based on product cost price</span>
            <Link
              href="/admin/stock"
              className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Manage Stock &rarr;
            </Link>
          </div>
        </div>

        {/* Stock Activity Summary */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs flex flex-col justify-between transition-colors">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight mb-1">
              Stock Activity Summary
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Movement units distributed by operational activity
            </p>

            <div className="space-y-3">
              {/* Stock In */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-300">
                    Stock In (Procurement)
                  </span>
                </div>
                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                  +{data.stockActivity.stockInQty} units
                </span>
              </div>

              {/* Adjustments */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-purple-50/60 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  <span className="text-xs font-semibold text-purple-900 dark:text-purple-300">
                    Stock Adjustments
                  </span>
                </div>
                <span className="text-xs font-bold text-purple-900 dark:text-purple-200">
                  {data.stockActivity.adjustmentQty} units
                </span>
              </div>

              {/* Sale Outflow */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-xs font-semibold text-blue-900 dark:text-blue-300">
                    POS Sales Deductions
                  </span>
                </div>
                <span className="text-xs font-bold text-blue-900 dark:text-blue-200">
                  -{data.stockActivity.saleQty} units
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-right">
            <Link
              href="/admin/stock"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              View Movement Logs &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Level 4: Detail (Low Stock Items Table + Recent Stock Movements) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Low Stock Items Table */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
          <div className="p-5 sm:px-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                Low Stock Items
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Products requiring replenishment or restock order
              </p>
            </div>
            <Link
              href="/admin/stock"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Stock Management &rarr;
            </Link>
          </div>

          {data.lowStockItems.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-5 py-3.5">Product</th>
                    <th className="px-5 py-3.5 text-center">Stock</th>
                    <th className="px-5 py-3.5 text-center">Min</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.lowStockItems.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-xs text-slate-900 dark:text-white">
                          {item.name}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
                          {item.sku}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-center font-bold text-xs">
                        <span
                          className={
                            item.status === "OUT_OF_STOCK"
                              ? "text-red-600 dark:text-red-400"
                              : "text-amber-600 dark:text-amber-400"
                          }
                        >
                          {item.currentStock}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center text-xs text-slate-500 dark:text-slate-400">
                        {item.minimumStock}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            item.status === "OUT_OF_STOCK"
                              ? "bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200/60 dark:border-red-800/60"
                              : "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60"
                          }`}
                        >
                          {item.status === "OUT_OF_STOCK" ? "Out of Stock" : "Low Stock"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          href={`/admin/stock?search=${encodeURIComponent(item.sku)}`}
                          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Adjust
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
              No low stock items. All stock levels are sufficient!
            </div>
          )}
        </div>

        {/* Recent Stock Movements */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
          <div className="p-5 sm:px-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                Recent Stock Movements
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Latest warehouse in/out logs
              </p>
            </div>
            <Link
              href="/admin/stock"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              All Movements &rarr;
            </Link>
          </div>

          {data.recentMovements.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.recentMovements.map((m) => (
                <div
                  key={m.id}
                  className="p-3.5 sm:px-5 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {m.productName}
                    </p>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono">{m.sku}</span>
                      <span>&bull;</span>
                      <span>{new Date(m.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
                      <span>&bull;</span>
                      <span className="truncate">{m.userName}</span>
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        m.type === "IN"
                          ? "bg-green-50 dark:bg-green-950/60 text-green-700 dark:text-green-300"
                          : m.type === "SALE" || m.type === "OUT"
                          ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300"
                          : "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300"
                      }`}
                    >
                      {m.type} ({m.quantity > 0 ? `+${m.quantity}` : m.quantity})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
              No stock movements recorded yet.
            </div>
          )}
        </div>
      </div>

      {/* Level 5: Navigation / Inventory Quick Actions */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Link
            href="/admin/stock"
            className="group bg-blue-600 hover:bg-blue-700 text-white rounded-xl p-4 shadow-xs hover:shadow-sm transition-all flex items-center gap-3.5"
          >
            <div className="w-10 h-10 rounded-lg bg-white/20 text-white flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">Stock Adjustment</p>
              <p className="text-xs text-blue-100 truncate">Update product inventory</p>
            </div>
          </Link>

          <Link
            href="/admin/products"
            className="group bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500/60 dark:hover:border-blue-500/60 p-4 shadow-xs hover:shadow-sm transition-all flex items-center gap-3.5"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                View Products
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Catalog & SKU list</p>
            </div>
          </Link>

          <Link
            href="/admin/stock"
            className="group bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-purple-500/60 dark:hover:border-purple-500/60 p-4 shadow-xs hover:shadow-sm transition-all flex items-center gap-3.5"
          >
            <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-colors flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors truncate">
                Movement History
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Stock movement audit trail</p>
            </div>
          </Link>

          <Link
            href="/admin/categories"
            className="group bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 p-4 shadow-xs hover:shadow-sm transition-all flex items-center gap-3.5"
          >
            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-slate-800 dark:group-hover:bg-slate-700 group-hover:text-white transition-colors flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors truncate">
                Categories
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Browse categories</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
