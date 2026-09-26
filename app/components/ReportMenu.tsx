"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePermissions } from "./PermissionProvider";

export default function ReportMenu() {
  const { hasPermission } = usePermissions();
  const pathname = usePathname();

  const canViewReports = hasPermission("REPORT_VIEW");
  const canViewSales = hasPermission("REPORT_SALES_VIEW");
  const canViewInventory = hasPermission("REPORT_INVENTORY_VIEW");
  const canViewPurchasing = hasPermission("REPORT_PURCHASING_VIEW");
  const canViewWarehouse = hasPermission("REPORT_WAREHOUSE_VIEW");
  const canViewFinance = hasPermission("REPORT_FINANCE_VIEW");
  const canViewCashier = hasPermission("REPORT_CASHIER_VIEW");
  const canViewAudit = hasPermission("REPORT_AUDIT_VIEW");

  const hasAnyReportCategory =
    canViewSales ||
    canViewInventory ||
    canViewPurchasing ||
    canViewWarehouse ||
    canViewFinance ||
    canViewCashier ||
    canViewAudit;

  const hasAccess = canViewReports && hasAnyReportCategory;

  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isActive = pathname.startsWith("/reports");

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
        <span>Reports</span>
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
        <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 py-1.5 z-50 transition-colors">
          <Link
            href="/reports"
            className={`block px-4 py-2 text-sm transition-colors font-medium border-b border-slate-100 dark:border-slate-800 ${
              pathname === "/reports"
                ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300"
                : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
            onClick={() => setIsOpen(false)}
          >
            All Reports Center
          </Link>

          {canViewSales && (
            <Link
              href="/reports?category=sales"
              className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Sales Reports
            </Link>
          )}

          {canViewInventory && (
            <Link
              href="/reports?category=inventory"
              className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Inventory Reports
            </Link>
          )}

          {canViewPurchasing && (
            <Link
              href="/reports?category=purchasing"
              className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Purchasing Reports
            </Link>
          )}

          {canViewWarehouse && (
            <Link
              href="/reports?category=warehouse"
              className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Warehouse Reports
            </Link>
          )}

          {canViewFinance && (
            <Link
              href="/reports?category=finance"
              className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Finance Reports
            </Link>
          )}

          {canViewCashier && (
            <Link
              href="/reports?category=cashier"
              className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Cashier Reports
            </Link>
          )}

          {canViewAudit && (
            <Link
              href="/reports?category=audit"
              className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Audit Reports
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
