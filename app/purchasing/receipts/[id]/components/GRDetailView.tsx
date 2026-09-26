"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { confirmGoodsReceiptAction, cancelGoodsReceiptAction } from "@/app/purchasing/actions";

interface GRDetailViewProps {
  receipt: any;
  canConfirm: boolean;
  canCancel: boolean;
}

export default function GRDetailView({
  receipt,
  canConfirm,
  canCancel,
}: GRDetailViewProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grDate = new Date(receipt.grDate).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const handleConfirm = async () => {
    if (
      !confirm(
        "Confirm this Goods Receipt? Physical inventory counts will be immediately incremented and auditable Stock Movement records created."
      )
    )
      return;

    setLoading(true);
    setError(null);
    try {
      const res = await confirmGoodsReceiptAction(receipt.id);
      if (res.error) setError(res.error);
      else router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this draft Goods Receipt?")) return;
    setLoading(true);
    setError(null);
    try {
      const res = await cancelGoodsReceiptAction(receipt.id);
      if (res.error) setError(res.error);
      else router.refresh();
    } finally {
      setLoading(false);
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
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm rounded-xl">
          {error}
        </div>
      )}

      {/* Header Info Banner */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {receipt.grNumber}
            </h1>
            <span
              className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusBadge(
                receipt.status
              )}`}
            >
              {receipt.status}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Received on {grDate} by {receipt.receivedBy?.firstName} {receipt.receivedBy?.lastName} (
            {receipt.receivedBy?.email})
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {receipt.status === "DRAFT" && canConfirm && (
            <button
              type="button"
              disabled={loading}
              onClick={handleConfirm}
              className="px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Confirm Goods Receipt (Stock +)
            </button>
          )}

          {receipt.status === "DRAFT" && canCancel && (
            <button
              type="button"
              disabled={loading}
              onClick={handleCancel}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              Cancel Draft
            </button>
          )}
        </div>
      </div>

      {/* Metadata Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2 text-xs">
          <div className="font-bold text-sm text-slate-900 dark:text-white mb-2">
            Purchase Order Reference
          </div>
          <div>
            <span className="text-slate-500">PO Number:</span>{" "}
            <Link
              href={`/purchasing/orders/${receipt.purchaseOrder?.id}`}
              className="font-mono font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              {receipt.purchaseOrder?.poNumber}
            </Link>
          </div>
          <div>
            <span className="text-slate-500">PO Status:</span>{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {receipt.purchaseOrder?.status}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Supplier:</span>{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {receipt.supplier?.name} ({receipt.supplier?.code})
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2 text-xs">
          <div className="font-bold text-sm text-slate-900 dark:text-white mb-2">
            Receiving Notes & Status
          </div>
          <div>
            <span className="text-slate-500">Receiving Notes:</span>{" "}
            <span className="text-slate-800 dark:text-slate-200">{receipt.notes || "None"}</span>
          </div>
          <div>
            <span className="text-slate-500">Inventory Status:</span>{" "}
            <span
              className={`font-semibold ${
                receipt.status === "CONFIRMED"
                  ? "text-green-600 dark:text-green-400"
                  : "text-amber-600 dark:text-amber-400"
              }`}
            >
              {receipt.status === "CONFIRMED"
                ? "Physical stock incremented & verified"
                : "Draft — Stock has not been modified"}
            </span>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
          <h2 className="font-bold text-sm text-slate-900 dark:text-white">
            Received Goods Details
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3 text-right">PO Ordered</th>
                <th className="px-4 py-3 text-right">Previously Received</th>
                <th className="px-4 py-3 text-right">Actual Received Quantity</th>
                <th className="px-4 py-3 text-right">Current System Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {receipt.items?.map((item: any) => (
                <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
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
                    {item.previouslyReceived}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-green-600 dark:text-green-400">
                    +{item.receivedQuantity}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">
                    {item.product?.stock?.currentStock ?? "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
