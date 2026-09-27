"use client";

import { useEffect, useRef } from "react";
import {
  formatRupiah,
  computeReceiptFinancialSummary,
  DEFAULT_TAX_RATE,
} from "@/lib/tax-utils";

export interface ReceiptSaleItem {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  discount?: number;
  isFreeReward?: boolean;
  product: {
    sku: string;
    name: string;
    unit?: string;
    sellingPrice?: number;
  };
}

export interface ReceiptSale {
  id: string;
  saleNumber: string;
  totalAmount: number;
  paymentMethod: string;
  paymentReceived: number;
  change: number;
  createdAt: string | Date;
  cashier?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  items: ReceiptSaleItem[];
  promotions?: any[];
}

interface ReceiptModalProps {
  sale: ReceiptSale;
  onClose: () => void;
  taxRate?: number;
}

export default function ReceiptModal({
  sale,
  onClose,
  taxRate = DEFAULT_TAX_RATE,
}: ReceiptModalProps) {
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

  const formattedDate = new Date(sale.createdAt).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const cashierName = sale.cashier
    ? `${sale.cashier.firstName} ${sale.cashier.lastName}`
    : "Cashier";

  const totalItemsCount = sale.items.reduce((sum, item) => sum + item.quantity, 0);

  // Customer-facing unified financial summary:
  // Normal Price, Discount, Price After Discount, Pre-Tax Amount, Tax, Total After Tax
  const summary = computeReceiptFinancialSummary(sale.items, sale.totalAmount, taxRate);
  const taxPercentLabel = `${Math.round(taxRate * 100)}%`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      {/* Print-specific style injection to guarantee only receipt is printed */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #receipt-printable,
          #receipt-printable * {
            visibility: visible !important;
          }
          #receipt-printable {
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
            <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Sale completed successfully
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                {sale.saleNumber}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Printable Receipt Paper Container */}
        <div className="p-6 overflow-y-auto max-h-[70vh] bg-slate-100/50 dark:bg-slate-950/40 flex justify-center">
          <div
            id="receipt-printable"
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
              <div className="inline-block mt-1 px-2 py-0.5 border border-slate-400 rounded text-[10px] font-semibold uppercase tracking-wider">
                Receipt
              </div>
            </div>

            {/* Transaction Metadata */}
            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px] text-slate-700">
              <div className="flex justify-between">
                <span>Transaction Number:</span>
                <span className="font-semibold text-slate-900">{sale.saleNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{formattedDate}</span>
              </div>
              <div className="flex justify-between">
                <span>Cashier:</span>
                <span className="truncate max-w-[170px]">{cashierName}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment Method:</span>
                <span className="font-semibold text-slate-900">{sale.paymentMethod}</span>
              </div>
            </div>

            {/* Purchased Items List */}
            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-2">
              <div className="font-semibold text-slate-900 text-[11px] pb-1 border-b border-slate-100 flex justify-between">
                <span>ITEM</span>
                <span>TOTAL</span>
              </div>
              {sale.items.map((item) => {
                const isFree = item.isFreeReward || item.totalPrice === 0;

                return (
                  <div key={item.id} className="text-[11px]">
                    <div className="font-medium text-slate-900 leading-snug">
                      {item.product.name}
                      {item.isFreeReward && (
                        <span className="ml-1 text-[10px] font-bold text-slate-700">(FREE)</span>
                      )}
                    </div>
                    <div className="flex justify-between text-slate-600 pl-1 mt-0.5">
                      <span>
                        {item.quantity} x {formatRupiah(item.unitPrice)}
                      </span>
                      <span className="font-semibold text-slate-900">
                        {isFree ? "FREE" : formatRupiah(item.totalPrice)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Standardized Customer-Facing Tax & Discount Breakdown */}
            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1.5 text-[11px]">
              {/* Block 1: Price and Discount Summary */}
              <div className="space-y-1">
                <div className="flex justify-between text-slate-700">
                  <span>Normal Price</span>
                  <span className="font-medium text-slate-900">
                    {formatRupiah(summary.normalPrice)}
                  </span>
                </div>

                <div className="flex justify-between text-slate-700 font-medium">
                  <span>Discount</span>
                  <span className="text-slate-900">
                    {formatRupiah(summary.discount)}
                  </span>
                </div>

                <div className="flex justify-between text-slate-700 font-medium pt-0.5">
                  <span>Price After Discount</span>
                  <span className="font-semibold text-slate-900">
                    {formatRupiah(summary.priceAfterDiscount)}
                  </span>
                </div>
              </div>

              {/* Visual space between Price Summary and Tax Breakdown */}
              <div className="pt-2 border-t border-dotted border-slate-200" />

              {/* Block 2: Reverse Tax Reconciliation */}
              <div className="space-y-1">
                <div className="flex justify-between text-slate-600 text-[10.5px]">
                  <span>Pre-Tax Amount</span>
                  <span>{formatRupiah(summary.preTaxAmount)}</span>
                </div>

                <div className="flex justify-between text-slate-600 text-[10.5px]">
                  <span>Tax</span>
                  <span>{formatRupiah(summary.tax)}</span>
                </div>

                <div className="flex justify-between text-slate-950 font-bold text-sm pt-1 border-t border-slate-300">
                  <span>Total After Tax</span>
                  <span>{formatRupiah(summary.totalAfterTax)}</span>
                </div>
              </div>
            </div>

            {/* Payment & Change Details */}
            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
              <div className="flex justify-between text-slate-700">
                <span>Payment Received ({sale.paymentMethod})</span>
                <span className="font-semibold text-slate-900">
                  {formatRupiah(sale.paymentReceived)}
                </span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Change</span>
                <span className="font-bold text-slate-950 text-xs">
                  {formatRupiah(sale.change)}
                </span>
              </div>
            </div>

            {/* Footer Notes */}
            <div className="pt-3 text-center text-[10px] text-slate-500 space-y-1">
              <p className="font-medium text-slate-700">
                * All prices are tax-inclusive (PPN {taxPercentLabel}) *
              </p>
              <p>Thank you for your purchase!</p>
              <p>Items purchased cannot be returned or exchanged</p>
            </div>
          </div>
        </div>

        {/* Modal Action Buttons (hidden during print) */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 no-print bg-slate-50/50 dark:bg-slate-800/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
}
