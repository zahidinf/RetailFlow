"use client";

import { useState } from "react";
import { getStockMovementsAction } from "@/app/actions/sales-actions";
import TablePagination from "@/app/components/TablePagination";

interface Props {
  productId: string;
  productName: string;
}

export default function StockMovementsDialog({ productId, productName }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const handleOpen = async () => {
    setIsOpen(true);
    setLoading(true);
    setError(null);
    setCurrentPage(1);

    const res = await getStockMovementsAction(productId);
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      setMovements(res.movements || []);
    }
  };

  const paginatedMovements = movements.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors mr-2"
        title="View stock movement history"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Movements
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-2xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                  Stock Movements
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {productName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {loading && (
              <div className="py-8 text-center text-sm text-slate-500">
                Loading movements history...
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            {!loading && !error && movements.length === 0 && (
              <div className="py-8 text-center text-sm text-slate-400">
                No stock movement records for this product yet.
              </div>
            )}

            {!loading && !error && movements.length > 0 && (
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider sticky top-0">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Change</th>
                      <th className="px-3 py-2">Stock Level</th>
                      <th className="px-3 py-2">User / Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {paginatedMovements.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-3 py-2.5 text-slate-500">
                          {new Date(m.createdAt).toLocaleString("id-ID", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="px-3 py-2.5 font-semibold">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              m.type === "SALE"
                                ? "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300"
                                : m.type === "ADJUSTMENT"
                                ? "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300"
                                : "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300"
                            }`}
                          >
                            {m.type}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-bold">
                          <span className={m.quantity < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}>
                            {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-700 dark:text-slate-300">
                          {m.previousStock} → <strong className="text-slate-900 dark:text-white">{m.newStock}</strong>
                        </td>
                        <td className="px-3 py-2.5 text-slate-500">
                          <div>{m.reason || "-"}</div>
                          {m.user && (
                            <div className="text-[11px] text-slate-400">
                              by {m.user.firstName} {m.user.lastName}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!loading && !error && movements.length > 0 && (
              <TablePagination
                currentPage={currentPage}
                pageSize={pageSize}
                totalItems={movements.length}
                onPageChange={setCurrentPage}
                onPageSizeChange={(newSize) => {
                  setPageSize(newSize);
                  setCurrentPage(1);
                }}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
