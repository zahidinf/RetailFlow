"use client";

import { useState, useEffect } from "react";
import { getSaleDetailAction } from "@/app/actions/sales-actions";
import { usePermissions } from "@/app/components/PermissionProvider";
import TablePagination from "@/app/components/TablePagination";
import RefundModal from "./RefundModal";
import RefundReceiptModal, { RefundReceiptData } from "./RefundReceiptModal";
import { formatRupiah } from "@/lib/tax-utils";

export interface SaleSummary {
  id: string;
  saleNumber: string;
  cashierId: string;
  cashier: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  totalAmount: number;
  paymentMethod: string;
  status: string;
  createdAt: string | Date;
  items: {
    id: string;
    quantity: number;
    refundedQuantity?: number;
    unitPrice: number;
    totalPrice: number;
    product: {
      id: string;
      sku: string;
      name: string;
      unit: string;
      refundable?: boolean;
    };
  }[];
  refunds?: any[];
}

interface Props {
  initialSales: SaleSummary[];
  cashiers: { id: string; name: string }[];
  canViewAll: boolean;
}

export default function SalesTable({ initialSales, cashiers, canViewAll }: Props) {
  const { hasPermission, isSuperAdmin } = usePermissions();
  const canRefund =
    isSuperAdmin ||
    hasPermission("SALES_REFUND") ||
    hasPermission("sales.refund") ||
    hasPermission("TRANSACTION_REFUND_CREATE") ||
    hasPermission("transaction_refund_create");

  const [sales, setSales] = useState<SaleSummary[]>(initialSales);
  const [search, setSearch] = useState("");
  const [selectedCashier, setSelectedCashier] = useState("");
  const [selectedPayment, setSelectedPayment] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [activeSaleDetail, setActiveSaleDetail] = useState<any | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Refund modals state
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<RefundReceiptData | null>(null);

  useEffect(() => {
    setSales(initialSales);
  }, [initialSales]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedCashier, selectedPayment, selectedStatus, startDate, endDate]);

  const filteredSales = sales.filter((s) => {
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const matchInvoice = s.saleNumber.toLowerCase().includes(q);
      const matchCashier = `${s.cashier.firstName} ${s.cashier.lastName}`.toLowerCase().includes(q);
      if (!matchInvoice && !matchCashier) return false;
    }
    if (selectedCashier && s.cashierId !== selectedCashier) return false;
    if (selectedPayment && s.paymentMethod !== selectedPayment) return false;
    if (selectedStatus && s.status !== selectedStatus) return false;
    if (startDate) {
      const start = new Date(startDate);
      const created = new Date(s.createdAt);
      if (created < start) return false;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      const created = new Date(s.createdAt);
      if (created > end) return false;
    }
    return true;
  });

  const paginatedSales = filteredSales.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleOpenDetail = async (saleId: string) => {
    setIsDetailLoading(true);
    setDetailError(null);
    setActiveSaleDetail(null);

    const res = await getSaleDetailAction(saleId);
    setIsDetailLoading(false);

    if (res.error) {
      setDetailError(res.error);
    } else {
      setActiveSaleDetail(res.sale);
    }
  };

  const handleRefundSuccess = (receiptData: RefundReceiptData) => {
    setIsRefundModalOpen(false);

    // Update sales list locally
    setSales((prev) =>
      prev.map((s) => {
        if (s.saleNumber === receiptData.saleNumber) {
          return {
            ...s,
            status: receiptData.saleStatus,
          };
        }
        return s;
      })
    );

    // Refresh active sale detail
    if (activeSaleDetail && activeSaleDetail.saleNumber === receiptData.saleNumber) {
      handleOpenDetail(activeSaleDetail.id);
    }

    // Show thermal receipt modal strictly on success
    setActiveReceipt(receiptData);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
            Completed
          </span>
        );
      case "PARTIAL_REFUNDED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-400" />
            Partial Refunded
          </span>
        );
      case "REFUNDED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 dark:bg-rose-400" />
            Refunded
          </span>
        );
      case "VOID":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            Void
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {status}
          </span>
        );
    }
  };

  const isSaleEligibleForRefund = (sale: any) => {
    if (!sale) return false;
    if (sale.status === "VOID" || sale.status === "REFUNDED") return false;
    const hasRemainingItems = sale.items.some(
      (item: any) =>
        (item.product.refundable !== false) &&
        item.quantity - (item.refundedQuantity || 0) > 0
    );
    return hasRemainingItems;
  };

  return (
    <div className="space-y-6">
      {/* Filters Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Search
            </label>
            <input
              type="text"
              placeholder="Invoice # or cashier name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none"
            />
          </div>

          {canViewAll && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Cashier
              </label>
              <select
                value={selectedCashier}
                onChange={(e) => setSelectedCashier(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none"
              >
                <option value="">All Cashiers</option>
                {cashiers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Payment Method
            </label>
            <select
              value={selectedPayment}
              onChange={(e) => setSelectedPayment(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none"
            >
              <option value="">All Methods</option>
              <option value="CASH">Cash</option>
              <option value="CARD">Credit/Debit Card</option>
              <option value="QRIS">QRIS / E-Wallet</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="PARTIAL_REFUNDED">Partial Refunded</option>
              <option value="REFUNDED">Refunded</option>
              <option value="VOID">Void</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Sales List Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Invoice #</th>
                <th className="px-6 py-3.5">Date & Time</th>
                <th className="px-6 py-3.5">Cashier</th>
                <th className="px-6 py-3.5">Items</th>
                <th className="px-6 py-3.5">Payment</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Total Amount</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {paginatedSales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500">
                    No sales transactions found matching filters.
                  </td>
                </tr>
              ) : (
                paginatedSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 font-mono font-semibold text-slate-900 dark:text-white">
                      {sale.saleNumber}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400">
                      {new Date(sale.createdAt).toLocaleString("en-US", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900 dark:text-white">
                        {sale.cashier.firstName} {sale.cashier.lastName}
                      </div>
                      <div className="text-xs text-slate-400">{sale.cashier.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {sale.items.length} {sale.items.length === 1 ? "item" : "items"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-xs px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                        {sale.paymentMethod}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(sale.status)}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-white font-mono">
                      {formatRupiah(sale.totalAmount)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(sale.id)}
                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <TablePagination
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={filteredSales.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setCurrentPage(1);
        }}
      />

      {/* Sale Detail Modal */}
      {(activeSaleDetail || isDetailLoading || detailError) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                  Sale Transaction Details
                </h3>
                {activeSaleDetail && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    {activeSaleDetail.saleNumber}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveSaleDetail(null);
                  setDetailError(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {isDetailLoading && (
              <div className="py-8 text-center text-sm text-slate-500">Loading details...</div>
            )}

            {detailError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-600 dark:text-red-400">
                {detailError}
              </div>
            )}

            {activeSaleDetail && (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-400 block">Date</span>
                    <span className="text-slate-900 dark:text-white font-medium">
                      {new Date(activeSaleDetail.createdAt).toLocaleString("en-US", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Cashier</span>
                    <span className="text-slate-900 dark:text-white font-medium">
                      {activeSaleDetail.cashier.firstName} {activeSaleDetail.cashier.lastName}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Payment Method</span>
                    <span className="text-slate-900 dark:text-white font-semibold">
                      {activeSaleDetail.paymentMethod}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Status</span>
                    <div className="mt-0.5">{getStatusBadge(activeSaleDetail.status)}</div>
                  </div>
                </div>

                {/* Purchased Items Table */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <span>Transaction Items</span>
                    <span>Refund Status</span>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-56 overflow-y-auto">
                    {activeSaleDetail.items.map((i: any) => {
                      const refunded = i.refundedQuantity || 0;
                      const remaining = i.quantity - refunded;
                      const isRefundable = i.product.refundable !== false;

                      return (
                        <div key={i.id} className="p-3.5 flex items-center justify-between text-xs">
                          <div className="space-y-0.5">
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {i.product.name}
                            </div>
                            <div className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                              <span className="font-mono">SKU: {i.product.sku}</span>
                              <span>•</span>
                              <span>
                                Qty: {i.quantity} × {formatRupiah(i.unitPrice)}
                              </span>
                            </div>
                          </div>

                          <div className="text-right space-y-1">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {formatRupiah(i.totalPrice)}
                            </div>
                            <div className="flex items-center gap-1.5 justify-end">
                              {!isRefundable ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900">
                                  Non-refundable
                                </span>
                              ) : refunded > 0 ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900">
                                  Refunded: {refunded}/{i.quantity}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                                  Refundable
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Refund History section if present */}
                {activeSaleDetail.refunds && activeSaleDetail.refunds.length > 0 && (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden p-3.5 space-y-2 bg-slate-50/50 dark:bg-slate-800/30">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Refund History ({activeSaleDetail.refunds.length})
                    </h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {activeSaleDetail.refunds.map((ref: any) => (
                        <div
                          key={ref.id}
                          className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between"
                        >
                          <div>
                            <div className="font-mono font-semibold text-slate-900 dark:text-white">
                              {ref.refundNumber}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Approved by {ref.approvedBy.firstName} {ref.approvedBy.lastName} •{" "}
                              {new Date(ref.createdAt).toLocaleString("en-US", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })}
                            </div>
                            {ref.reason && (
                              <div className="text-[11px] text-slate-600 dark:text-slate-400 italic">
                                Reason: {ref.reason}
                              </div>
                            )}
                          </div>
                          <div className="text-right font-bold text-red-600 font-mono">
                            -{formatRupiah(ref.totalAmount)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Totals */}
                <div className="border-t border-slate-200 dark:border-slate-800 pt-3 flex items-center justify-between text-base">
                  <span className="font-bold text-slate-900 dark:text-white">Original Total:</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">
                    {formatRupiah(activeSaleDetail.totalAmount)}
                  </span>
                </div>

                {/* Refund action button */}
                <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
                  {canRefund && isSaleEligibleForRefund(activeSaleDetail) && (
                    <button
                      type="button"
                      onClick={() => setIsRefundModalOpen(true)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 15v-1a4 4 0 00-4-4H4m0 0l3-3m-3 3l3 3m5 4v1a3 3 0 003 3h4a3 3 0 003-3v-4a3 3 0 00-3-3h-1"
                        />
                      </svg>
                      Refund Items
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveSaleDetail(null)}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Refund Process Modal */}
      {isRefundModalOpen && activeSaleDetail && (
        <RefundModal
          sale={activeSaleDetail}
          onClose={() => setIsRefundModalOpen(false)}
          onSuccess={handleRefundSuccess}
        />
      )}

      {/* Refund Receipt Thermal Modal */}
      {activeReceipt && (
        <RefundReceiptModal
          refund={activeReceipt}
          onClose={() => setActiveReceipt(null)}
        />
      )}
    </div>
  );
}
