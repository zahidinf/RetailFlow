"use client";

import { useState } from "react";
import Link from "next/link";
import TablePagination from "@/app/components/TablePagination";
import { confirmGoodsReceiptAction, cancelGoodsReceiptAction } from "../../actions";
import { useRouter } from "next/navigation";

interface GRTableProps {
  initialReceipts: any[];
  canCreate: boolean;
  canConfirm: boolean;
  canCancel: boolean;
}

export default function GRTable({
  initialReceipts,
  canCreate,
  canConfirm,
  canCancel,
}: GRTableProps) {
  const router = useRouter();
  const [receipts] = useState<any[]>(initialReceipts);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const filtered = receipts.filter((gr) => {
    if (statusFilter !== "ALL" && gr.status !== statusFilter) return false;

    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      if (new Date(gr.grDate) < start) return false;
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (new Date(gr.grDate) > end) return false;
    }

    if (search.trim()) {
      const term = search.toLowerCase().trim();
      const matchGr = gr.grNumber.toLowerCase().includes(term);
      const matchPo = gr.purchaseOrder?.poNumber?.toLowerCase().includes(term);
      const matchSup = gr.supplier?.name?.toLowerCase().includes(term);
      const matchNotes = gr.notes?.toLowerCase().includes(term);
      if (!matchGr && !matchPo && !matchSup && !matchNotes) return false;
    }

    return true;
  });

  const totalItems = filtered.length;
  const paginated = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleConfirmGR = async (grId: string) => {
    if (
      !confirm(
        "Confirm this Goods Receipt? Physical goods will be added to system stock and auditable Stock Movements will be generated."
      )
    )
      return;

    setActionLoading(grId);
    try {
      const res = await confirmGoodsReceiptAction(grId);
      if (res.error) alert(res.error);
      else router.refresh();
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelGR = async (grId: string) => {
    if (!confirm("Are you sure you want to cancel this draft Goods Receipt?")) return;
    setActionLoading(grId);
    try {
      const res = await cancelGoodsReceiptAction(grId);
      if (res.error) alert(res.error);
      else router.refresh();
    } finally {
      setActionLoading(null);
    }
  };

  function getStatusBadge(status: string) {
    switch (status) {
      case "DRAFT":
        return "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/60";
      case "CONFIRMED":
        return "bg-green-50 dark:bg-green-950/60 text-green-700 dark:text-green-300 border-green-200/60 dark:border-green-800/60";
      case "CANCELLED":
        return "bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200/60 dark:border-red-800/60";
      default:
        return "bg-slate-100 dark:bg-slate-800 text-slate-700 border-slate-300";
    }
  }

  return (
    <div className="space-y-4">
      {/* Top Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 max-w-lg">
            {/* Search */}
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
                placeholder="Search GR #, PO #, supplier..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 border border-slate-300 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="DRAFT">DRAFT</option>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>

          {canCreate && (
            <Link
              href="/purchasing/receipts/create"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors self-start sm:self-auto shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Receive Goods (New GR)
            </Link>
          )}
        </div>

        {/* Date Filter */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-medium">Receipt Date:</span>
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
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">GR Number</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">PO Reference</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3 text-center">Items</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Received By</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No goods receipt records found matching your criteria.
                  </td>
                </tr>
              ) : (
                paginated.map((gr) => {
                  const dateStr = new Date(gr.grDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });

                  return (
                    <tr key={gr.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-mono font-semibold text-slate-800 dark:text-slate-200">
                        <Link
                          href={`/purchasing/receipts/${gr.id}`}
                          className="hover:text-blue-600 dark:hover:text-blue-400 underline decoration-dotted"
                        >
                          {gr.grNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                        {dateStr}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300">
                        <Link
                          href={`/purchasing/orders/${gr.purchaseOrder?.id}`}
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {gr.purchaseOrder?.poNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                        {gr.supplier?.name}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-300 font-medium">
                        {gr.items?.length || 0}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(gr.status)}`}>
                          {gr.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                        {gr.receivedBy ? `${gr.receivedBy.firstName} ${gr.receivedBy.lastName}` : "-"}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap space-x-1.5">
                        <Link
                          href={`/purchasing/receipts/${gr.id}`}
                          className="px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 rounded-md transition-colors"
                        >
                          Detail
                        </Link>

                        {gr.status === "DRAFT" && canConfirm && (
                          <button
                            type="button"
                            disabled={actionLoading === gr.id}
                            onClick={() => handleConfirmGR(gr.id)}
                            className="px-2.5 py-1 text-xs font-semibold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/50 hover:bg-green-100 rounded-md transition-colors"
                          >
                            {actionLoading === gr.id ? "Confirming..." : "Confirm & Stock +"}
                          </button>
                        )}

                        {gr.status === "DRAFT" && canCancel && (
                          <button
                            type="button"
                            disabled={actionLoading === gr.id}
                            onClick={() => handleCancelGR(gr.id)}
                            className="px-2.5 py-1 text-xs font-semibold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/50 hover:bg-red-100 rounded-md transition-colors"
                          >
                            Cancel
                          </button>
                        )}
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
    </div>
  );
}
