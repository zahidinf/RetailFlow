"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePermissions } from "./PermissionProvider";

export default function PurchasingMenu() {
  const { hasPermission } = usePermissions();
  const pathname = usePathname();

  const canViewSuppliers = hasPermission("SUPPLIER_VIEW");
  const canViewOrders = hasPermission("PURCHASE_ORDER_VIEW");
  const canViewReceipts = hasPermission("GOODS_RECEIPT_VIEW");

  const hasAccess = canViewSuppliers || canViewOrders || canViewReceipts;

  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isActive = pathname.startsWith("/purchasing");

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  if (!hasAccess) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`text-sm font-medium transition-colors flex items-center gap-1.5 focus:outline-none ${
          isActive
            ? "text-blue-600 dark:text-blue-400 font-semibold"
            : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
        }`}
      >
        <span>Purchasing</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""} ${
            isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500"
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 py-1.5 z-50 transition-colors">
          {canViewSuppliers && (
            <Link
              href="/purchasing/suppliers"
              className={`block px-4 py-2.5 text-sm transition-colors ${
                pathname.startsWith("/purchasing/suppliers")
                  ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-medium"
                  : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
              }`}
              onClick={() => setIsOpen(false)}
            >
              <div className="flex items-center gap-2.5">
                <svg
                  className="w-4 h-4 text-slate-400 dark:text-slate-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
                <span>Suppliers</span>
              </div>
            </Link>
          )}

          {canViewOrders && (
            <Link
              href="/purchasing/orders"
              className={`block px-4 py-2.5 text-sm transition-colors ${
                pathname.startsWith("/purchasing/orders")
                  ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-medium"
                  : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
              }`}
              onClick={() => setIsOpen(false)}
            >
              <div className="flex items-center gap-2.5">
                <svg
                  className="w-4 h-4 text-slate-400 dark:text-slate-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span>Purchase Orders</span>
              </div>
            </Link>
          )}

          {canViewReceipts && (
            <Link
              href="/purchasing/receipts"
              className={`block px-4 py-2.5 text-sm transition-colors ${
                pathname.startsWith("/purchasing/receipts")
                  ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-medium"
                  : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
              }`}
              onClick={() => setIsOpen(false)}
            >
              <div className="flex items-center gap-2.5">
                <svg
                  className="w-4 h-4 text-slate-400 dark:text-slate-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
                <span>Goods Receipts</span>
              </div>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
