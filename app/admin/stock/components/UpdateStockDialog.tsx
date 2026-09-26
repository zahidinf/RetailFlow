"use client";

import { useState } from "react";
import { StockItem, updateStock } from "../actions";
import { getStockStatus, getStockStatusBadgeStyles } from "@/lib/stock-utils";

interface UpdateStockDialogProps {
  stock: StockItem;
}

export default function UpdateStockDialog({ stock }: UpdateStockDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newStockInput, setNewStockInput] = useState(String(stock.currentStock));
  const [reason, setReason] = useState("Stock Count Correction");
  const [customReason, setCustomReason] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpen = () => {
    setNewStockInput(String(stock.currentStock));
    setReason("Stock Count Correction");
    setCustomReason("");
    setNotes("");
    setError(null);
    setIsOpen(true);
  };

  const handleClose = () => {
    if (!loading) {
      setIsOpen(false);
      setError(null);
    }
  };

  // Preview status calculation on the fly
  const parsedValue = parseInt(newStockInput, 10);
  const isValidInteger = !isNaN(parsedValue) && parsedValue >= 0 && String(parsedValue) === newStockInput.trim();
  const previewStatus = isValidInteger
    ? getStockStatus(parsedValue, stock.product.minimumStock)
    : null;
  const previewBadge = previewStatus ? getStockStatusBadgeStyles(previewStatus) : null;
  const stockDiff = isValidInteger ? parsedValue - stock.currentStock : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const val = parseInt(newStockInput, 10);
    if (isNaN(val) || val < 0) {
      setError("Stock quantity must be a non-negative whole integer (0 or greater)");
      return;
    }

    if (String(val) !== newStockInput.trim()) {
      setError("Decimals and fractions are not allowed for stock quantities");
      return;
    }

    if (val === stock.currentStock) {
      setError("New stock is identical to current stock. No adjustment needed.");
      return;
    }

    const effectiveReason = reason === "Other" ? customReason.trim() : reason;
    if (!effectiveReason) {
      setError("Please specify a reason for this stock adjustment.");
      return;
    }

    setLoading(true);

    try {
      const result = await updateStock(stock.id, val, effectiveReason, notes);

      if (result.error) {
        setError(result.error);
      } else if (result.success) {
        handleClose();
      }
    } catch {
      setError("Failed to update stock. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 rounded-lg transition-colors cursor-pointer"
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
        Adjust Stock
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs text-left">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 transition-colors">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between transition-colors">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Adjust Stock</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Update current stock quantity</p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-lg text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {/* Product Info Card */}
              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-4 space-y-2.5 transition-colors">
                <div>
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Product</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white leading-snug mt-0.5">
                    {stock.product.name}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-700 text-xs">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">SKU:</span>{" "}
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                      {stock.product.sku}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Unit:</span>{" "}
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{stock.product.unit}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Current Stock:</span>{" "}
                    <span className="font-bold text-slate-900 dark:text-white">{stock.currentStock}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Min. Stock:</span>{" "}
                    <span className="font-bold text-slate-900 dark:text-white">{stock.product.minimumStock}</span>
                  </div>
                </div>
              </div>

              {/* Input: New Current Stock */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  New Current Stock <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={newStockInput}
                    onChange={(e) => setNewStockInput(e.target.value)}
                    placeholder="Enter stock quantity (>= 0)"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-600/10 dark:focus:ring-blue-500/20 text-sm font-medium transition-colors"
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase">
                    {stock.product.unit}
                  </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Must be a non-negative whole integer.
                </p>
              </div>

              {/* Status Preview Card */}
              <div className="bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 space-y-2 transition-colors">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600 dark:text-slate-400">Calculated Status Preview:</span>
                  {previewBadge ? (
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${previewBadge.badge}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${previewBadge.dot}`} />
                      {previewBadge.label}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 dark:text-slate-500 italic">Enter valid quantity</span>
                  )}
                </div>

                {isValidInteger && stockDiff !== null && (
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    <span>Stock adjustment change:</span>
                    <span
                      className={`font-semibold ${
                        stockDiff > 0
                          ? "text-green-600 dark:text-green-400"
                          : stockDiff < 0
                          ? "text-red-600 dark:text-red-400"
                          : "text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {stockDiff > 0 ? `+${stockDiff}` : stockDiff} {stock.product.unit}
                    </span>
                  </div>
                )}
              </div>

              {/* Input: Reason */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Adjustment Reason <span className="text-red-500">*</span>
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-600/10 dark:focus:ring-blue-500/20 text-sm font-medium transition-colors cursor-pointer"
                >
                  <option value="Stock Count Correction">Stock Count Correction</option>
                  <option value="Damage">Damage</option>
                  <option value="Theft / Loss">Theft / Loss</option>
                  <option value="Supplier Return">Supplier Return</option>
                  <option value="Internal Use">Internal Use</option>
                  <option value="Other">Other (specify below)</option>
                </select>

                {reason === "Other" && (
                  <input
                    type="text"
                    required
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Specify adjustment reason..."
                    className="w-full mt-2 px-3.5 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-600 text-sm font-medium transition-colors"
                  />
                )}
              </div>

              {/* Input: Notes */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional context or investigation notes..."
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-600 text-sm transition-colors resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !isValidInteger}
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Updating...
                    </>
                  ) : (
                    "Save Stock"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
