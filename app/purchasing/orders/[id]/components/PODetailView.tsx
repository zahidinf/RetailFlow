"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatRupiah } from "@/lib/tax-utils";
import {
  submitPurchaseOrderAction,
  approvePurchaseOrderAction,
  cancelPurchaseOrderAction,
} from "@/app/purchasing/actions";

interface PODetailViewProps {
  order: any;
  canSubmit: boolean;
  canApprove: boolean;
  canCancel: boolean;
  canCreateGR: boolean;
}

export default function PODetailView({
  order,
  canSubmit,
  canApprove,
  canCancel,
  canCreateGR,
}: PODetailViewProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const poDate = new Date(order.poDate).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const handleSubmit = async () => {
    if (!confirm("Submit this Purchase Order for approval?")) return;
    setLoading(true);
    setError(null);
    try {
      const res = await submitPurchaseOrderAction(order.id);
      if (res.error) setError(res.error);
      else router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!confirm("Approve this Purchase Order?")) return;
    setLoading(true);
    setError(null);
    try {
      const res = await approvePurchaseOrderAction(order.id);
      if (res.error) setError(res.error);
      else router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this Purchase Order?")) return;
    setLoading(true);
    setError(null);
    try {
      const res = await cancelPurchaseOrderAction(order.id);
      if (res.error) setError(res.error);
      else router.refresh();
    } finally {
      setLoading(false);
    }
  };

  function getStatusBadge(status: string) {
    switch (status) {
      case "DRAFT":
        return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700";
      case "SUBMITTED":
        return "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/60";
      case "APPROVED":
        return "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/60";
      case "PARTIALLY_RECEIVED":
        return "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-800/60";
      case "RECEIVED":
        return "bg-green-50 dark:bg-green-950/60 text-green-700 dark:text-green-300 border-green-200/60 dark:border-green-800/60";
      case "CANCELLED":
        return "bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200/60 dark:border-red-800/60";
      default:
        return "bg-slate-100 dark:bg-slate-800 text-slate-700 border-slate-300";
    }
  }

  const eligibleForReceiving =
    (order.status === "APPROVED" || order.status === "PARTIALLY_RECEIVED") && canCreateGR;

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
              {order.poNumber}
            </h1>
            <span
              className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusBadge(
                order.status
              )}`}
            >
              {order.status}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Created on {poDate} by {order.createdBy?.firstName} {order.createdBy?.lastName}
            {order.approvedBy && ` • Approved by ${order.approvedBy.firstName} ${order.approvedBy.lastName}`}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {order.status === "DRAFT" && canSubmit && (
            <button
              type="button"
              disabled={loading}
              onClick={handleSubmit}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
            >
              Submit for Approval
            </button>
          )}

          {order.status === "SUBMITTED" && canApprove && (
            <button
              type="button"
              disabled={loading}
              onClick={handleApprove}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
            >
              Approve Purchase Order
            </button>
          )}

          {eligibleForReceiving && (
            <Link
              href={`/purchasing/receipts/create?poId=${order.id}`}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
            >
              Receive Goods (Create GR)
            </Link>
          )}

          {(order.status === "DRAFT" || order.status === "SUBMITTED") && canCancel && (
            <button
              type="button"
              disabled={loading}
              onClick={handleCancel}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
            >
              Cancel PO
            </button>
          )}
        </div>
      </div>

      {/* Supplier & Logistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2 text-xs">
          <div className="font-bold text-sm text-slate-900 dark:text-white mb-2">
            Supplier Information
          </div>
          <div>
            <span className="text-slate-500">Name:</span>{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-200">{order.supplier?.name}</span>
          </div>
          <div>
            <span className="text-slate-500">Code:</span>{" "}
            <span className="font-mono text-slate-800 dark:text-slate-200">{order.supplier?.code}</span>
          </div>
          <div>
            <span className="text-slate-500">Contact:</span>{" "}
            <span className="text-slate-800 dark:text-slate-200">{order.supplier?.contactPerson || "-"}</span>
          </div>
          <div>
            <span className="text-slate-500">Phone:</span>{" "}
            <span className="text-slate-800 dark:text-slate-200">{order.supplier?.phone || "-"}</span>
          </div>
          <div>
            <span className="text-slate-500">Address:</span>{" "}
            <span className="text-slate-800 dark:text-slate-200">{order.supplier?.address || "-"}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2 text-xs">
          <div className="font-bold text-sm text-slate-900 dark:text-white mb-2">
            Order Metadata & Notes
          </div>
          <div>
            <span className="text-slate-500">Notes:</span>{" "}
            <span className="text-slate-800 dark:text-slate-200">{order.notes || "None"}</span>
          </div>
          <div>
            <span className="text-slate-500">Associated Goods Receipts:</span>{" "}
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {order.goodsReceipts?.length || 0}
            </span>
          </div>
          {order.goodsReceipts && order.goodsReceipts.length > 0 && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
              {order.goodsReceipts.map((gr: any) => (
                <div key={gr.id} className="flex justify-between items-center text-[11px]">
                  <Link
                    href={`/purchasing/receipts/${gr.id}`}
                    className="font-mono text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {gr.grNumber}
                  </Link>
                  <span className="text-slate-500">{new Date(gr.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* PO Items Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
          <h2 className="font-bold text-sm text-slate-900 dark:text-white">
            Ordered Line Items & Receiving Progress
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3 text-right">Ordered</th>
                <th className="px-4 py-3 text-right">Received</th>
                <th className="px-4 py-3 text-right">Remaining</th>
                <th className="px-4 py-3 text-right">Unit Price</th>
                <th className="px-4 py-3 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {order.items?.map((item: any) => {
                const remaining = item.orderedQuantity - item.receivedQuantity;
                return (
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
                    <td className="px-4 py-3 text-right font-bold text-green-600 dark:text-green-400">
                      {item.receivedQuantity}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-amber-600 dark:text-amber-400">
                      {remaining}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">
                      {formatRupiah(item.unitPrice)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">
                      {formatRupiah(item.totalPrice)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Financial Breakdown */}
        <div className="p-6 bg-slate-50/40 dark:bg-slate-800/20 border-t border-slate-200 dark:border-slate-800 flex justify-end text-xs">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Subtotal:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {formatRupiah(order.subtotal)}
              </span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>PPN (11%):</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {formatRupiah(order.tax)}
              </span>
            </div>
            <div className="flex justify-between text-sm font-bold text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-700">
              <span>Grand Total:</span>
              <span className="text-blue-600 dark:text-blue-400">{formatRupiah(order.totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
