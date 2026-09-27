"use client";

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
  const isActive = pathname.startsWith("/reports");

  if (!hasAccess) return null;

  return (
    <Link
      href="/reports"
      className={`text-sm font-medium transition-colors ${
        isActive
          ? "text-blue-600 dark:text-blue-400 font-semibold"
          : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
      }`}
    >
      Reports
    </Link>
  );
}
