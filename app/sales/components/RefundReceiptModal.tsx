"use client";

import { useEffect, useRef } from "react";
import { formatRupiah } from "@/lib/tax-utils";

export interface RefundReceiptItem {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  product: {
    sku: string;
    name: string;
    unit?: string;
  };
}

export interface RefundReceiptData {
  refundNumber: string;
  saleNumber: string;
  createdAt: string | Date;
  totalAmount: number;
  reason?: string | null;
  saleStatus: string;
  approvedBy: {
    firstName: string;
    lastName: string;
    email: string;
  };
  items: RefundReceiptItem[];
}

interface Props {
  refund: RefundReceiptData;
  onClose: () => void;
}

export default function RefundReceiptModal({ refund, onClose }: Props) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(refund.createdAt).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const managerName = `${refund.approvedBy.firstName} ${refund.approvedBy.lastName}`;
  const totalItemsCount = refund.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      {/* Print-specific style injection to guarantee only receipt is printed */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #refund-receipt-printable,
          #refund-receipt-printable * {
            visibility: visible !important;
          }
          #refund-receipt-printable {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 80mm !important;
            margin: 0 auto !important;
            padding: 8px !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            color: black !important;
            font-size: 11px !important;
            line-height: 1.3 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div
        ref={modalRef}
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full overflow-hidden flex flex-col my-auto transition-colors"
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between no-print bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Refund Processed Successfully
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                {refund.refundNumber}
              </p>
            </div>
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

        {/* Printable Receipt Container */}
        <div className="p-6 overflow-y-auto max-h-[70vh] bg-slate-100/50 dark:bg-slate-950/40 flex justify-center">
          <div
            id="refund-receipt-printable"
            className="bg-white text-slate-900 w-full max-w-[340px] p-5 rounded-xl border border-slate-200 shadow-sm font-mono text-xs leading-relaxed"
          >
            {/* Store Information */}
            <div className="text-center pb-3 border-b border-dashed border-slate-300">
              <h2 className="text-base font-bold tracking-wider uppercase text-slate-950">
                RetailFlow Store
              </h2>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Jl. Jenderal Sudirman No. 123, Jakarta
              </p>
              <p className="text-[11px] text-slate-600">
                Phone: (021) 555-0123
              </p>
              <div className="inline-block mt-1 px-2.5 py-0.5 border border-red-500 bg-red-50 text-red-700 rounded text-[10px] font-bold uppercase tracking-wider">
                Refund Receipt
              </div>
            </div>

            {/* Refund Metadata */}
            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px] text-slate-700">
              <div className="flex justify-between">
                <span>Refund Number:</span>
                <span className="font-semibold text-slate-900">{refund.refundNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Original Sale:</span>
                <span className="font-semibold text-slate-900">{refund.saleNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Refund Date:</span>
                <span>{formattedDate}</span>
              </div>
              <div className="flex justify-between">
                <span>Approved By:</span>
                <span className="truncate max-w-[170px] font-medium">{managerName}</span>
              </div>
              {refund.reason && (
                <div className="flex justify-between">
                  <span>Reason:</span>
                  <span className="truncate max-w-[170px] italic">{refund.reason}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Transaction Status:</span>
                <span className="font-bold text-red-600">{refund.saleStatus}</span>
              </div>
            </div>

            {/* Refunded Items List */}
            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-2">
              <div className="font-semibold text-slate-900 text-[11px] pb-1 border-b border-slate-100 flex justify-between">
                <span>REFUNDED ITEM</span>
                <span>TOTAL</span>
              </div>
              {refund.items.map((item) => (
                <div key={item.id} className="text-[11px]">
                  <div className="font-medium text-slate-900 leading-snug">
                    {item.product.name}
                  </div>
                  <div className="flex justify-between text-slate-600 pl-1 mt-0.5">
                    <span>
                      {item.quantity} x {formatRupiah(item.unitPrice)}
                    </span>
                    <span className="font-semibold text-slate-900">
                      {formatRupiah(item.totalPrice)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Refund Total */}
            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1.5 text-[11px]">
              <div className="flex justify-between text-slate-600">
                <span>Total Items Refunded:</span>
                <span className="font-medium text-slate-900">{totalItemsCount}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-950 pt-1 border-t border-slate-200">
                <span>TOTAL REFUND AMOUNT</span>
                <span className="text-red-600">{formatRupiah(refund.totalAmount)}</span>
              </div>
            </div>

            {/* Stock Restoration Notice */}
            <div className="pt-3 text-center text-[10px] text-slate-500 space-y-0.5">
              <p>Inventory stock has been restored.</p>
              <p>Customer refunded via original payment method.</p>
              <p className="pt-1 font-semibold text-slate-700">Thank you for your visit</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 no-print bg-slate-50/50 dark:bg-slate-800/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
}
