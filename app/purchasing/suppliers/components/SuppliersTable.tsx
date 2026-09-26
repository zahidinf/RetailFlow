"use client";

import { useState } from "react";
import TablePagination from "@/app/components/TablePagination";
import SupplierModal from "./SupplierModal";
import { toggleSupplierStatusAction } from "../../actions";
import { useRouter } from "next/navigation";

interface SuppliersTableProps {
  initialSuppliers: any[];
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export default function SuppliersTable({
  initialSuppliers,
  canCreate,
  canUpdate,
  canDelete,
}: SuppliersTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const filtered = initialSuppliers.filter((s) => {
    if (statusFilter !== "ALL" && s.status !== statusFilter) return false;
    if (search.trim()) {
      const term = search.toLowerCase().trim();
      const matchName = s.name.toLowerCase().includes(term);
      const matchCode = s.code.toLowerCase().includes(term);
      const matchContact = s.contactPerson?.toLowerCase().includes(term);
      const matchPhone = s.phone?.toLowerCase().includes(term);
      const matchEmail = s.email?.toLowerCase().includes(term);
      if (!matchName && !matchCode && !matchContact && !matchPhone && !matchEmail) {
        return false;
      }
    }
    return true;
  });

  const totalItems = filtered.length;
  const paginated = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleToggleStatus = async (supplierId: string) => {
    if (!confirm("Are you sure you want to change this supplier's active status?")) return;
    setActionLoading(supplierId);
    try {
      await toggleSupplierStatusAction(supplierId);
      router.refresh();
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Bar: Search, Filter, Add button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
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
              placeholder="Search by code, supplier name, contact..."
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
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={() => {
              setEditingSupplier(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Supplier
          </button>
        )}
      </div>

      {/* Suppliers Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Supplier Name</th>
                <th className="px-4 py-3">Contact Person</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-center">POs</th>
                <th className="px-4 py-3 text-center">Receipts</th>
                {(canUpdate || canDelete) && <th className="px-4 py-3 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No suppliers found. Click "Add Supplier" to create one.
                  </td>
                </tr>
              ) : (
                paginated.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-slate-700 dark:text-slate-300">
                      {s.code}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                      {s.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {s.contactPerson || "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {s.phone || "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {s.email || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          s.status === "ACTIVE"
                            ? "bg-green-50 dark:bg-green-950/60 text-green-700 dark:text-green-300 border-green-200/60 dark:border-green-800/60"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700"
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-slate-700 dark:text-slate-300">
                      {s._count?.purchaseOrders || 0}
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-slate-700 dark:text-slate-300">
                      {s._count?.goodsReceipts || 0}
                    </td>
                    {(canUpdate || canDelete) && (
                      <td className="px-4 py-3 text-center space-x-1.5 whitespace-nowrap">
                        {canUpdate && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSupplier(s);
                              setModalOpen(true);
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 rounded-md transition-colors"
                          >
                            Edit
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            disabled={actionLoading === s.id}
                            onClick={() => handleToggleStatus(s.id)}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                              s.status === "ACTIVE"
                                ? "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100"
                                : "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/50 hover:bg-green-100"
                            }`}
                          >
                            {actionLoading === s.id ? "Saving..." : s.status === "ACTIVE" ? "Deactivate" : "Activate"}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
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

      {/* Modal */}
      {modalOpen && (
        <SupplierModal
          supplier={editingSupplier}
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingSupplier(null);
          }}
          onSuccess={() => {
            setModalOpen(false);
            setEditingSupplier(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
