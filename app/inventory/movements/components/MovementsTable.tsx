"use client";

import { useState } from "react";
import TablePagination from "@/app/components/TablePagination";
import MovementDetailModal from "./MovementDetailModal";

interface Props {
  initialMovements: any[];
  users: any[];
}

export default function MovementsTable({ initialMovements, users }: Props) {
  const [movements] = useState<any[]>(initialMovements);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [refTypeFilter, setRefTypeFilter] = useState("ALL");
  const [userFilter, setUserFilter] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedMovement, setSelectedMovement] = useState<any | null>(null);

  // Filter client-side
  const filteredMovements = movements.filter((m) => {
    if (typeFilter !== "ALL" && m.type !== typeFilter) return false;
    if (refTypeFilter !== "ALL" && m.referenceType !== refTypeFilter) return false;
    if (userFilter !== "ALL" && m.userId !== userFilter) return false;

    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      if (new Date(m.createdAt) < start) return false;
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (new Date(m.createdAt) > end) return false;
    }

    if (search.trim()) {
      const term = search.toLowerCase().trim();
      const matchProduct = m.product?.name?.toLowerCase().includes(term);
      const matchSku = m.product?.sku?.toLowerCase().includes(term);
      const matchReason = m.reason?.toLowerCase().includes(term);
      const matchRef = m.referenceId?.toLowerCase().includes(term);
      const matchNotes = m.notes?.toLowerCase().includes(term);
      if (!matchProduct && !matchSku && !matchReason && !matchRef && !matchNotes) {
        return false;
      }
    }

    return true;
  });

  const totalItems = filteredMovements.length;
  const paginatedMovements = filteredMovements.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const resetFilters = () => {
    setSearch("");
    setTypeFilter("ALL");
    setRefTypeFilter("ALL");
    setUserFilter("ALL");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  const hasActiveFilters = Boolean(
    search || typeFilter !== "ALL" || refTypeFilter !== "ALL" || userFilter !== "ALL" || startDate || endDate
  );

  function getTypeBadge(type: string) {
    switch (type) {
      case "PURCHASE":
      case "IN":
        return "bg-green-50 dark:bg-green-950/60 text-green-700 dark:text-green-300 border-green-200/60 dark:border-green-800/60";
      case "RETURN":
        return "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200/60 dark:border-purple-800/60";
      case "SALE":
        return "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/60";
      case "ADJUSTMENT":
        return "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/60";
      case "OUT":
        return "bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200/60 dark:border-red-800/60";
      default:
        return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";
    }
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 transition-colors">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search product, SKU, reference..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 border border-slate-300 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Movement Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
          >
            <option value="ALL">All Movement Types</option>
            <option value="SALE">SALE (POS Out)</option>
            <option value="PURCHASE">PURCHASE (Goods Receipt In)</option>
            <option value="ADJUSTMENT">ADJUSTMENT (Audit Correction)</option>
            <option value="RETURN">RETURN (Sales Refund In)</option>
            <option value="IN">IN (General Stock In)</option>
            <option value="OUT">OUT (General Stock Out)</option>
          </select>

          {/* Reference Type Filter */}
          <select
            value={refTypeFilter}
            onChange={(e) => {
              setRefTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
          >
            <option value="ALL">All Reference Types</option>
            <option value="SALE">SALE</option>
            <option value="GOODS_RECEIPT">GOODS_RECEIPT</option>
            <option value="ADJUSTMENT">ADJUSTMENT</option>
            <option value="REFUND">REFUND</option>
          </select>

          {/* User Filter */}
          <select
            value={userFilter}
            onChange={(e) => {
              setUserFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
          >
            <option value="ALL">All Users</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.firstName} {u.lastName} ({u.email})
              </option>
            ))}
          </select>
        </div>

        {/* Date Range & Clear Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Date Range:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:border-blue-500"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              Clear all filters
            </button>
          )}
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Date / Time</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right">Change</th>
                <th className="px-4 py-3 text-right">Before</th>
                <th className="px-4 py-3 text-right">After</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Created By</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedMovements.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    No stock movement records found matching your criteria.
                  </td>
                </tr>
              ) : (
                paginatedMovements.map((m) => {
                  const dateStr = new Date(m.createdAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                        {dateStr}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white max-w-[180px] truncate" title={m.product?.name}>
                        {m.product?.name}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {m.product?.sku}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${getTypeBadge(m.type)}`}>
                          {m.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right font-bold">
                        <span
                          className={
                            m.quantity > 0
                              ? "text-green-600 dark:text-green-400"
                              : m.quantity < 0
                              ? "text-red-600 dark:text-red-400"
                              : "text-slate-600 dark:text-slate-400"
                          }
                        >
                          {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-slate-600 dark:text-slate-400">
                        {m.previousStock}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right font-semibold text-slate-800 dark:text-slate-200">
                        {m.newStock}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {m.referenceId ? (
                          <div className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
                            {m.referenceType && <span className="text-[10px] font-semibold text-slate-400 uppercase mr-1">{m.referenceType}:</span>}
                            <span>{m.referenceId}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-[160px] truncate" title={m.reason || ""}>
                        {m.reason || "-"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                        {m.user ? `${m.user.firstName} ${m.user.lastName}` : "System"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedMovement(m)}
                          className="px-2 py-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 rounded-md transition-colors"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
          <TablePagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
            pageSizeOptions={[10, 25, 50, 100]}
          />
        </div>
      </div>

      {/* Movement Detail Modal */}
      {selectedMovement && (
        <MovementDetailModal
          movement={selectedMovement}
          onClose={() => setSelectedMovement(null)}
        />
      )}
    </div>
  );
}
