"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createGoodsReceiptAction } from "../../../actions";

interface GRCreateFormProps {
  eligibleOrders: any[];
  defaultPoId?: string;
}

export default function GRCreateForm({ eligibleOrders, defaultPoId }: GRCreateFormProps) {
  const router = useRouter();
  const [selectedPoId, setSelectedPoId] = useState(defaultPoId || eligibleOrders[0]?.id || "");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentPO = eligibleOrders.find((po) => po.id === selectedPoId);

  // Initialize received quantity map
  const [receivedQtys, setReceivedQtys] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    if (currentPO) {
      currentPO.items.forEach((item: any) => {
        map[item.id] = Math.max(0, item.remainingQuantity);
      });
    }
    return map;
  });

  const handlePOChange = (newPoId: string) => {
    setSelectedPoId(newPoId);
    const po = eligibleOrders.find((p) => p.id === newPoId);
    if (po) {
      const map: Record<string, number> = {};
      po.items.forEach((item: any) => {
        map[item.id] = Math.max(0, item.remainingQuantity);
      });
      setReceivedQtys(map);
    }
  };

  const handleQtyChange = (poItemId: string, val: number, max: number) => {
    const clamped = Math.max(0, Math.min(Math.floor(val), max));
    setReceivedQtys((prev) => ({
      ...prev,
      [poItemId]: clamped,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentPO) {
      setError("Please select an approved Purchase Order");
      return;
    }

    const itemsToReceive = currentPO.items
      .map((item: any) => ({
        purchaseOrderItemId: item.id,
        receivedQuantity: receivedQtys[item.id] || 0,
      }))
      .filter((i: any) => i.receivedQuantity > 0);

    if (itemsToReceive.length === 0) {
      setError("At least one item must have a received quantity greater than 0");
      return;
    }

    // Check over-receiving
    for (const item of itemsToReceive) {
      const poItem = currentPO.items.find((i: any) => i.id === item.purchaseOrderItemId);
      if (item.receivedQuantity > poItem.remainingQuantity) {
        setError(
          `Cannot receive ${item.receivedQuantity} for ${poItem.product?.name}. Max remaining is ${poItem.remainingQuantity}.`
        );
        return;
      }
    }

    setLoading(true);

    try {
      const res = await createGoodsReceiptAction({
        purchaseOrderId: currentPO.id,
        notes: notes.trim(),
        items: itemsToReceive,
      });

      if (res.error || !res.receipt) {
        setError(res.error || "Failed to create goods receipt");
        setLoading(false);
      } else {
        router.push(`/purchasing/receipts/${res.receipt.id}`);
      }
    } catch {
      setError("Failed to create Goods Receipt. Please try again.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm rounded-xl">
          {error}
        </div>
      )}

      {/* PO Selector & Metadata */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
        <h2 className="font-bold text-base text-slate-900 dark:text-white">
          Purchase Order Selection
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Select Approved Purchase Order <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={selectedPoId}
              onChange={(e) => handlePOChange(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="">-- Choose eligible Purchase Order --</option>
              {eligibleOrders.map((po) => (
                <option key={po.id} value={po.id}>
                  {po.poNumber} — {po.supplier?.name} ({po.status})
                </option>
              ))}
            </select>
            {eligibleOrders.length === 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                No approved or partially received Purchase Orders available for goods receiving.
              </p>
            )}
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Receiving Notes / Delivery Challan
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Surat Jalan SJ-2026-0045, package intact"
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {currentPO && (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap gap-6 text-xs">
            <div>
              <span className="text-slate-500">Supplier:</span>{" "}
              <strong className="text-slate-900 dark:text-white">{currentPO.supplier?.name}</strong>
            </div>
            <div>
              <span className="text-slate-500">PO Status:</span>{" "}
              <strong className="text-slate-900 dark:text-white">{currentPO.status}</strong>
            </div>
            <div>
              <span className="text-slate-500">PO Date:</span>{" "}
              <strong className="text-slate-900 dark:text-white">
                {new Date(currentPO.poDate).toLocaleDateString()}
              </strong>
            </div>
          </div>
        )}
      </div>

      {/* Actual Received Quantities Table */}
      {currentPO && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-base text-slate-900 dark:text-white">
              Inspect Physical Goods & Enter Received Quantity
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Enter actual inspected counts. Leave 0 for unreceived items.
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Product Name</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3 text-right">Ordered</th>
                  <th className="px-4 py-3 text-right">Prev. Received</th>
                  <th className="px-4 py-3 text-right">Remaining</th>
                  <th className="px-4 py-3 text-right w-36">Now Receiving</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {currentPO.items.map((item: any) => {
                  const qty = receivedQtys[item.id] !== undefined ? receivedQtys[item.id] : 0;
                  const isCompleted = item.remainingQuantity <= 0;

                  return (
                    <tr
                      key={item.id}
                      className={
                        isCompleted
                          ? "bg-slate-50/40 dark:bg-slate-800/20 text-slate-400"
                          : "hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                      }
                    >
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                        {item.product?.name}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">
                        {item.product?.sku}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {item.product?.unit}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-800 dark:text-slate-200">
                        {item.orderedQuantity}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">
                        {item.receivedQuantity}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-amber-600 dark:text-amber-400">
                        {item.remainingQuantity}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          min="0"
                          max={item.remainingQuantity}
                          step="1"
                          disabled={isCompleted}
                          value={qty}
                          onChange={(e) =>
                            handleQtyChange(item.id, Number(e.target.value), item.remainingQuantity)
                          }
                          className="w-24 px-2.5 py-1.5 text-right bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div className="flex items-center justify-end gap-3">
        <Link
          href="/purchasing/receipts"
          className="px-5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl transition-colors"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={loading || !currentPO}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
        >
          {loading ? "Creating..." : "Save Goods Receipt (Draft)"}
        </button>
      </div>
    </form>
  );
}
