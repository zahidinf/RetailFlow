"use client";

import { useState, useEffect } from "react";
import { formatRupiah } from "@/lib/tax-utils";
import {
  getEligibleManagersAction,
  processRefundAction,
  checkSaleRefundEligibilityAction,
} from "@/app/actions/sales-actions";
import { EligibleManager } from "@/lib/refund";
import { RefundReceiptData } from "./RefundReceiptModal";

export interface RefundableSaleItem {
  id: string;
  quantity: number;
  refundedQuantity: number;
  unitPrice: number;
  totalPrice: number;
  product: {
    id: string;
    sku: string;
    name: string;
    unit?: string;
    refundable?: boolean;
  };
}

export interface RefundableSale {
  id: string;
  saleNumber: string;
  totalAmount: number;
  paymentMethod: string;
  status: string;
  createdAt: string | Date;
  isRefundExpired?: boolean;
  validityPeriodMs?: number;
  cashier: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  items: RefundableSaleItem[];
}

interface Props {
  sale: RefundableSale;
  validityPeriodMs?: number;
  onClose: () => void;
  onSuccess: (receipt: RefundReceiptData) => void;
}

type Step = "SELECT_ITEMS" | "CONFIRM_SUMMARY" | "MANAGER_AUTH";

export default function RefundModal({ sale, validityPeriodMs, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<Step>("SELECT_ITEMS");

  // Selected items map: saleItemId -> selected boolean
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});
  // Quantities map: saleItemId -> quantity to refund
  const [refundQuantities, setRefundQuantities] = useState<Record<string, number>>({});

  const [reason, setReason] = useState("");
  const [managers, setManagers] = useState<EligibleManager[]>([]);
  const [isManagersLoading, setIsManagersLoading] = useState(false);
  const [selectedManagerId, setSelectedManagerId] = useState("");
  const [managerPassword, setManagerPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const effectiveValidityMs = validityPeriodMs ?? sale.validityPeriodMs;
  const isTransactionExpired =
    Boolean(sale.isRefundExpired) ||
    Boolean(
      effectiveValidityMs &&
        Date.now() - new Date(sale.createdAt).getTime() > effectiveValidityMs
    );

  // Check backend eligibility on mount to ensure real-time validity check
  useEffect(() => {
    checkSaleRefundEligibilityAction(sale.id).then((res) => {
      if (res.success && res.eligibility && !res.eligibility.eligible) {
        setError(res.eligibility.reason || "This transaction is not eligible for refund");
      }
    });
  }, [sale.id]);

  // Initialize selectable items
  useEffect(() => {
    const initialSelected: Record<string, boolean> = {};
    const initialQuantities: Record<string, number> = {};

    sale.items.forEach((item) => {
      const remaining = item.quantity - (item.refundedQuantity || 0);
      const isEligible = !isTransactionExpired && item.product.refundable === true && remaining > 0;
      initialSelected[item.id] = false;
      initialQuantities[item.id] = isEligible ? Math.min(1, remaining) : 0;
    });

    setSelectedItems(initialSelected);
    setRefundQuantities(initialQuantities);
  }, [sale, isTransactionExpired]);

  // Load eligible managers when navigating to manager auth
  const loadManagers = async () => {
    setIsManagersLoading(true);
    try {
      const res = await getEligibleManagersAction();
      if (res.success && res.managers) {
        setManagers(res.managers);
        if (res.managers.length > 0 && !selectedManagerId) {
          setSelectedManagerId(res.managers[0].id);
        }
      } else {
        setError(res.error || "Failed to load eligible managers");
      }
    } finally {
      setIsManagersLoading(false);
    }
  };

  const handleToggleSelect = (itemId: string, remaining: number) => {
    if (remaining <= 0) return;
    setSelectedItems((prev) => {
      const nextState = !prev[itemId];
      if (nextState && (!refundQuantities[itemId] || refundQuantities[itemId] < 1)) {
        setRefundQuantities((q) => ({ ...q, [itemId]: 1 }));
      }
      return { ...prev, [itemId]: nextState };
    });
  };

  const handleQuantityChange = (itemId: string, qty: number, remaining: number) => {
    const clamped = Math.max(1, Math.min(qty, remaining));
    setRefundQuantities((prev) => ({ ...prev, [itemId]: clamped }));
  };

  // Calculate items selected for refund
  const itemsToRefund = sale.items
    .filter((item) => selectedItems[item.id])
    .map((item) => {
      const qty = refundQuantities[item.id] || 1;
      return {
        item,
        quantity: qty,
        unitPrice: item.unitPrice,
        amount: item.unitPrice * qty,
      };
    });

  const totalRefundAmount = itemsToRefund.reduce((sum, item) => sum + item.amount, 0);

  const handleProceedToSummary = () => {
    setError(null);
    if (isTransactionExpired) {
      setError("Refund validity period has expired for this transaction");
      return;
    }
    if (itemsToRefund.length === 0) {
      setError("Please select at least one refundable item to continue");
      return;
    }

    for (const entry of itemsToRefund) {
      const remaining = entry.item.quantity - (entry.item.refundedQuantity || 0);
      if (entry.quantity > remaining) {
        setError(
          `Refund quantity for "${entry.item.product.name}" exceeds remaining quantity (${remaining})`
        );
        return;
      }
      if (entry.quantity <= 0) {
        setError(`Refund quantity must be greater than zero`);
        return;
      }
    }

    setStep("CONFIRM_SUMMARY");
  };

  const handleProceedToAuth = async () => {
    setError(null);
    await loadManagers();
    setStep("MANAGER_AUTH");
  };

  const handleProcessRefund = async () => {
    setError(null);

    if (!selectedManagerId) {
      setError("Please select an approving manager");
      return;
    }

    if (!managerPassword) {
      setError("Manager password is required");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        saleId: sale.id,
        items: itemsToRefund.map((r) => ({
          saleItemId: r.item.id,
          quantity: r.quantity,
        })),
        managerId: selectedManagerId,
        managerPassword,
        reason: reason.trim() || undefined,
      };

      const result = await processRefundAction(payload);

      // Always wipe manager password from state immediately
      setManagerPassword("");

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.success && result.data) {
        const refundData = result.data.refund;
        const updatedSale = result.data.sale;

        const receiptData: RefundReceiptData = {
          refundNumber: refundData.refundNumber,
          saleNumber: sale.saleNumber,
          createdAt: refundData.createdAt,
          totalAmount: refundData.totalAmount,
          reason: refundData.reason,
          saleStatus: updatedSale.status,
          approvedBy: refundData.approvedBy,
          items: refundData.items.map((i: any) => ({
            id: i.id,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            totalPrice: i.totalPrice,
            product: i.product,
          })),
        };

        onSuccess(receiptData);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto transition-colors flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              {step === "SELECT_ITEMS" && "Select Items for Refund"}
              {step === "CONFIRM_SUMMARY" && "Refund Summary"}
              {step === "MANAGER_AUTH" && "Manager Authentication"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Transaction: {sale.saleNumber}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-2.5 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <div className={`font-semibold ${step === "SELECT_ITEMS" ? "text-blue-600 dark:text-blue-400" : "text-slate-500"}`}>
            1. Select Items
          </div>
          <div className="text-slate-300 dark:text-slate-700">→</div>
          <div className={`font-semibold ${step === "CONFIRM_SUMMARY" ? "text-blue-600 dark:text-blue-400" : "text-slate-500"}`}>
            2. Refund Summary
          </div>
          <div className="text-slate-300 dark:text-slate-700">→</div>
          <div className={`font-semibold ${step === "MANAGER_AUTH" ? "text-blue-600 dark:text-blue-400" : "text-slate-500"}`}>
            3. Manager Approval
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 flex-1">
          {error && (
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-xs flex items-start gap-2">
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: SELECT ITEMS */}
          {step === "SELECT_ITEMS" && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose the refundable items and specify the refund quantity for each:
              </p>

              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                {sale.items.map((item) => {
                  const refunded = item.refundedQuantity || 0;
                  const remaining = item.quantity - refunded;
                  const isRefundableProduct = item.product.refundable === true;
                  const isEligible = !isTransactionExpired && isRefundableProduct && remaining > 0;
                  const isSelected = !!selectedItems[item.id];
                  const currentQty = refundQuantities[item.id] || 1;

                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        !isEligible
                          ? "bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 opacity-60"
                          : isSelected
                          ? "bg-blue-50/60 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          disabled={!isEligible}
                          checked={isSelected}
                          onChange={() => handleToggleSelect(item.id, remaining)}
                          className="mt-1 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-slate-900 dark:text-white text-sm truncate">
                              {item.product.name}
                            </span>
                            <span className="font-semibold text-slate-900 dark:text-white text-xs whitespace-nowrap">
                              {formatRupiah(item.unitPrice)}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                            <span className="font-mono">SKU: {item.product.sku}</span>
                            <span>•</span>
                            <span>Original: {item.quantity}</span>
                            <span>•</span>
                            <span>Refunded: {refunded}</span>
                            <span>•</span>
                            <span className={remaining > 0 ? "font-semibold text-blue-600 dark:text-blue-400" : "text-slate-400"}>
                              Remaining: {remaining}
                            </span>
                          </div>

                          {!isRefundableProduct ? (
                            <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-semibold bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900">
                              Non-refundable Product
                            </span>
                          ) : isTransactionExpired ? (
                            <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900">
                              Validity Expired
                            </span>
                          ) : remaining === 0 ? (
                            <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              Fully Refunded
                            </span>
                          ) : isSelected && (
                            <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-blue-200/60 dark:border-blue-900/60">
                              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                Refund Quantity (Max {remaining}):
                              </label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={1}
                                  max={remaining}
                                  value={currentQty}
                                  onChange={(e) =>
                                    handleQuantityChange(
                                      item.id,
                                      parseInt(e.target.value, 10) || 1,
                                      remaining
                                    )
                                  }
                                  className="w-20 px-2 py-1 text-center font-mono font-bold text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="text-xs font-semibold text-slate-900 dark:text-white">
                                  = {formatRupiah(item.unitPrice * currentQty)}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {itemsToRefund.length > 0 && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800/60 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Selected Items ({itemsToRefund.length}):
                  </span>
                  <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
                    {formatRupiah(totalRefundAmount)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: CONFIRM SUMMARY */}
          {step === "CONFIRM_SUMMARY" && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="font-semibold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Refund Summary
                </div>

                <div className="space-y-2 divide-y divide-slate-200 dark:divide-slate-800">
                  {itemsToRefund.map((entry) => (
                    <div key={entry.item.id} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {entry.item.product.name}
                        </div>
                        <div className="text-slate-500 dark:text-slate-400">
                          Qty: {entry.quantity} x {formatRupiah(entry.unitPrice)}
                        </div>
                      </div>
                      <div className="font-bold text-slate-900 dark:text-white">
                        {formatRupiah(entry.amount)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-sm font-bold">
                  <span className="text-slate-900 dark:text-white">Total Refund:</span>
                  <span className="text-red-600 text-base">{formatRupiah(totalRefundAmount)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Reason for Refund (Optional)
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Customer return, defective product, wrong item"
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 p-3 rounded-lg">
                <strong>Notice:</strong> Refund requires manager authentication and will immediately restore inventory stock.
              </div>
            </div>
          )}

          {/* STEP 3: MANAGER AUTH */}
          {step === "MANAGER_AUTH" && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400">Total Refund Amount:</span>
                <span className="font-bold text-red-600 text-sm">{formatRupiah(totalRefundAmount)}</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Approving Manager <span className="text-red-500">*</span>
                </label>
                {isManagersLoading ? (
                  <div className="text-xs text-slate-500 py-2">Loading eligible managers...</div>
                ) : (
                  <select
                    value={selectedManagerId}
                    onChange={(e) => setSelectedManagerId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {managers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.firstName} {m.lastName} ({m.email}) - {m.roleName}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Manager Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  data-lpignore="true"
                  value={managerPassword}
                  onChange={(e) => setManagerPassword(e.target.value)}
                  placeholder="Enter manager password to approve"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Credentials are verified securely on the server and never stored.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div>
            {step === "CONFIRM_SUMMARY" && (
              <button
                type="button"
                onClick={() => setStep("SELECT_ITEMS")}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Back
              </button>
            )}
            {step === "MANAGER_AUTH" && (
              <button
                type="button"
                onClick={() => {
                  setManagerPassword("");
                  setStep("CONFIRM_SUMMARY");
                }}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Back
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {step === "SELECT_ITEMS" && (
              <button
                type="button"
                onClick={handleProceedToSummary}
                disabled={itemsToRefund.length === 0}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                Continue
              </button>
            )}

            {step === "CONFIRM_SUMMARY" && (
              <button
                type="button"
                onClick={handleProceedToAuth}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                Continue to Manager Approval
              </button>
            )}

            {step === "MANAGER_AUTH" && (
              <button
                type="button"
                onClick={handleProcessRefund}
                disabled={isSubmitting || !managerPassword || !selectedManagerId}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50 cursor-pointer inline-flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Processing Refund...
                  </>
                ) : (
                  "Approve & Complete Refund"
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
