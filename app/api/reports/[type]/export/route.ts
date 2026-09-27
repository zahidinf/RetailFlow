import { NextRequest, NextResponse } from "next/server";
import { getSession, SESSION_COOKIE_NAME } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import * as reports from "@/lib/reports";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/lib/audit";
import { REPORT_PERMISSION_MAP } from "../route";

export const REPORT_NAME_MAP: Record<string, string> = {
  // Sales
  "sales-summary": "Sales Summary",
  "sales-transactions": "Sales Transactions",
  "sales-by-product": "Sales by Product",
  "sales-by-category": "Sales by Category",
  "sales-by-cashier": "Sales by Cashier",
  "sales-by-payment-method": "Sales by Payment Method",
  "sales-refund": "Refund Report",
  "sales-discount": "Discount Report",

  // Inventory
  "stock-summary": "Stock Summary",
  "stock-movement": "Stock Movement",
  "stock-adjustment": "Stock Adjustment",
  "low-stock": "Low Stock",
  "out-of-stock": "Out of Stock",

  // Purchasing
  "purchase-summary": "Purchase Summary",
  "purchase-orders": "Purchase Orders",
  "purchase-by-supplier": "Purchase by Supplier",
  "purchase-by-product": "Purchase by Product",
  "outstanding-purchase-orders": "Outstanding Purchase Orders",

  // Warehouse
  "goods-receipt": "Goods Receipt",
  "receiving-by-supplier": "Receiving by Supplier",
  "receiving-by-po": "Receiving by Purchase Order",
  "receiving-discrepancy": "Receiving Discrepancy",
  "pending-receiving": "Pending Receiving",
  "partial-receiving": "Partial Receiving",

  // Finance
  "revenue": "Revenue Report",
  "payment": "Payment Report",
  "tax": "Tax Report",
  "refund": "Refund Report",
  "discount": "Discount Report",
  "purchase-expense": "Purchase Expense",

  // Cashier
  "cashier-sales": "Cashier Sales",
  "payment-summary": "Payment Summary",
  "cash-collection": "Cash Collection",

  // Audit
  "user-activity": "User Activity",
  "login-activity": "Login Activity",
  "transaction-audit": "Transaction Audit",
  "refund-audit": "Refund Audit",
  "stock-adjustment-audit": "Stock Adjustment Audit",
  "purchase-order-audit": "Purchase Order Audit",
  "goods-receipt-audit": "Goods Receipt Audit",
};

function formatLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

function formatExportTimestamp(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function escapeCSVCell(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

interface FilterItem {
  key: string;
  label: string;
  value: string;
}

function getApplicableFilterDefinitions(reportType: string): Array<{ key: string; label: string }> {
  const dateReports = [
    "sales-summary",
    "sales-transactions",
    "sales-by-product",
    "sales-by-category",
    "sales-by-cashier",
    "sales-by-payment-method",
    "sales-refund",
    "sales-discount",
    "stock-movement",
    "stock-adjustment",
    "purchase-summary",
    "purchase-orders",
    "purchase-by-supplier",
    "purchase-by-product",
    "goods-receipt",
    "receiving-by-supplier",
    "receiving-by-po",
    "receiving-discrepancy",
    "revenue",
    "payment",
    "tax",
    "refund",
    "discount",
    "purchase-expense",
    "cashier-sales",
    "payment-summary",
    "cash-collection",
    "user-activity",
    "login-activity",
    "transaction-audit",
    "refund-audit",
    "stock-adjustment-audit",
    "purchase-order-audit",
    "goods-receipt-audit",
  ];

  const searchReports = [
    "sales-transactions",
    "sales-by-product",
    "sales-refund",
    "sales-discount",
    "stock-summary",
    "stock-movement",
    "stock-adjustment",
    "low-stock",
    "out-of-stock",
    "purchase-orders",
    "purchase-by-product",
    "outstanding-purchase-orders",
    "goods-receipt",
    "receiving-by-po",
    "receiving-discrepancy",
    "pending-receiving",
    "partial-receiving",
    "user-activity",
    "login-activity",
    "transaction-audit",
    "refund-audit",
    "stock-adjustment-audit",
    "purchase-order-audit",
    "goods-receipt-audit",
  ];

  const categoryReports = ["sales-by-product", "stock-summary", "low-stock", "out-of-stock"];
  const supplierReports = [
    "sales-discount",
    "purchase-orders",
    "outstanding-purchase-orders",
    "goods-receipt",
    "receiving-discrepancy",
    "pending-receiving",
    "partial-receiving",
  ];
  const cashierReports = ["sales-transactions"];
  const paymentMethodReports = ["sales-transactions"];
  const statusReports = ["sales-transactions", "purchase-orders", "goods-receipt", "stock-summary", "stock-movement"];
  const productReports = ["stock-movement"];
  const auditReports = ["user-activity"];

  const defs: Array<{ key: string; label: string }> = [];

  if (dateReports.includes(reportType)) {
    defs.push({ key: "startDate", label: "Date From" });
    defs.push({ key: "endDate", label: "Date To" });
  }

  if (searchReports.includes(reportType)) {
    defs.push({ key: "search", label: "Search" });
  }

  if (categoryReports.includes(reportType)) {
    defs.push({ key: "categoryId", label: "Category" });
  }

  if (supplierReports.includes(reportType)) {
    defs.push({ key: "supplierId", label: "Supplier" });
  }

  if (cashierReports.includes(reportType)) {
    defs.push({ key: "cashierId", label: "Cashier" });
  }

  if (paymentMethodReports.includes(reportType)) {
    defs.push({ key: "paymentMethod", label: "Payment Method" });
  }

  if (statusReports.includes(reportType)) {
    defs.push({ key: "status", label: "Status" });
  }

  if (productReports.includes(reportType)) {
    defs.push({ key: "productId", label: "Product" });
  }

  if (auditReports.includes(reportType)) {
    defs.push({ key: "userId", label: "User" });
    defs.push({ key: "module", label: "Module" });
    defs.push({ key: "entity", label: "Entity" });
    defs.push({ key: "action", label: "Action" });
  }

  return defs;
}

async function resolveAppliedFilters(
  reportType: string,
  searchParams: URLSearchParams
): Promise<FilterItem[]> {
  const definitions = getApplicableFilterDefinitions(reportType);
  const handledKeys = new Set<string>();
  const results: FilterItem[] = [];

  for (const def of definitions) {
    handledKeys.add(def.key);
    const rawVal = searchParams.get(def.key);
    const resolved = await formatFilterValue(def.key, rawVal);
    results.push({
      key: def.key,
      label: def.label,
      value: resolved,
    });
  }

  // Dynamically capture any other extra query parameters supplied
  const ignoredKeys = new Set(["page", "pageSize", "_r", "export"]);
  for (const [key, value] of searchParams.entries()) {
    if (!handledKeys.has(key) && !ignoredKeys.has(key) && value && value.trim() !== "") {
      const resolved = await formatFilterValue(key, value);
      results.push({
        key,
        label: formatLabel(key),
        value: resolved,
      });
    }
  }

  return results;
}

async function formatFilterValue(key: string, val: string | null | undefined): Promise<string> {
  if (!val || val === "ALL" || val.trim() === "") {
    return "All";
  }

  const trimmed = val.trim();

  try {
    switch (key) {
      case "categoryId": {
        const cat = await prisma.category.findUnique({
          where: { id: trimmed },
          select: { name: true },
        });
        return cat?.name || trimmed;
      }
      case "supplierId": {
        const sup = await prisma.supplier.findUnique({
          where: { id: trimmed },
          select: { name: true, code: true },
        });
        return sup ? `${sup.name} (${sup.code})` : trimmed;
      }
      case "cashierId": {
        const user = await prisma.user.findUnique({
          where: { id: trimmed },
          select: { firstName: true, lastName: true },
        });
        return user ? `${user.firstName} ${user.lastName}`.trim() : trimmed;
      }
      case "userId": {
        const user = await prisma.user.findUnique({
          where: { id: trimmed },
          select: { firstName: true, lastName: true, email: true },
        });
        if (user) {
          const name = `${user.firstName} ${user.lastName}`.trim();
          return name ? `${name} (${user.email})` : user.email;
        }
        return trimmed;
      }
      case "productId": {
        const prod = await prisma.product.findUnique({
          where: { id: trimmed },
          select: { name: true, sku: true },
        });
        return prod ? `${prod.name} (${prod.sku})` : trimmed;
      }
      default:
        return trimmed;
    }
  } catch {
    return trimmed;
  }
}

function buildCSVOutput(
  reportName: string,
  exportedBy: string,
  exportedAt: string,
  filters: FilterItem[],
  headers: string[],
  rows: any[][]
): string {
  const metadataLines: string[] = [
    `${escapeCSVCell("Report Name")},${escapeCSVCell(reportName)}`,
    `${escapeCSVCell("Exported By")},${escapeCSVCell(exportedBy)}`,
    `${escapeCSVCell("Exported At")},${escapeCSVCell(exportedAt)}`,
    ...filters.map((f) => `${escapeCSVCell(`Filter - ${f.label}`)},${escapeCSVCell(f.value)}`),
  ];

  const headerLine = headers.map(escapeCSVCell).join(",");
  const dataLines = rows.map((r) => r.map(escapeCSVCell).join(","));

  return [...metadataLines, "", headerLine, ...dataLines].join("\r\n");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const token = request.cookies?.get?.(SESSION_COOKIE_NAME)?.value;
  const session = await getSession(token);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { type } = await params;
  const requiredPermission = REPORT_PERMISSION_MAP[type];
  if (!requiredPermission) {
    return NextResponse.json({ error: `Unknown report type: ${type}` }, { status: 400 });
  }

  // Strictly check REPORT_EXPORT and category view permission
  const [canExport, canView] = await Promise.all([
    hasPermission(session.id, "REPORT_EXPORT"),
    hasPermission(session.id, requiredPermission),
  ]);

  if (!canExport || !canView) {
    return NextResponse.json(
      { error: "Forbidden: Missing required permission: REPORT_EXPORT" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;
  const search = searchParams.get("search") || undefined;
  const status = searchParams.get("status") || undefined;
  const categoryId = searchParams.get("categoryId") || undefined;
  const supplierId = searchParams.get("supplierId") || undefined;
  const cashierId = searchParams.get("cashierId") || undefined;
  const paymentMethod = searchParams.get("paymentMethod") || undefined;
  const productId = searchParams.get("productId") || undefined;
  const userId = searchParams.get("userId") || undefined;
  const action = searchParams.get("action") || undefined;
  const auditModule = searchParams.get("module") || undefined;
  const auditEntity = searchParams.get("entity") || undefined;

  // For export, fetch maximum dataset (up to 5000 items)
  const pageSize = 5000;
  const page = 1;

  const reportName = REPORT_NAME_MAP[type] || formatLabel(type);
  const filename = `${type}-report.csv`;

  // Authenticated user identity
  const userFullName = `${session.firstName || ""} ${session.lastName || ""}`.trim();
  const exportedBy = userFullName ? `${userFullName} (${session.email})` : session.email;
  const exportTimestamp = formatExportTimestamp();

  try {
    const [resultData, resolvedFilters] = await Promise.all([
      reports.executeReportQuery(type, {
        startDate,
        endDate,
        search,
        status,
        categoryId,
        supplierId,
        cashierId,
        paymentMethod,
        productId,
        userId,
        action,
        module: auditModule,
        entity: auditEntity,
        page,
        pageSize,
      }),
      resolveAppliedFilters(type, searchParams),
    ]);
    const result: any = resultData;

    let headers: string[] = [];
    let rows: any[][] = [];

    switch (type) {
      case "sales-transactions": {
        headers = ["Sale Number", "Date", "Cashier", "Payment Method", "Items", "Gross", "Refund", "Net", "Status"];
        rows = (result.items || []).map((i: any) => [
          i.saleNumber,
          i.date,
          i.cashier,
          i.paymentMethod,
          i.itemsCount,
          i.grossAmount,
          i.refundAmount,
          i.netAmount,
          i.status,
        ]);
        break;
      }
      case "sales-by-product": {
        headers = ["SKU", "Product Name", "Category", "Quantity Sold", "Refunded Qty", "Net Qty", "Total Revenue"];
        rows = (result.items || []).map((i: any) => [
          i.sku,
          i.productName,
          i.categoryName,
          i.quantitySold,
          i.refundedQuantity,
          i.netQuantity,
          i.totalRevenue,
        ]);
        break;
      }
      case "stock-summary": {
        headers = ["SKU", "Product Name", "Category", "Unit", "Current Stock", "Min Stock", "Cost Price", "Selling Price", "Stock Value", "Status"];
        rows = (result.items || []).map((i: any) => [
          i.sku,
          i.name,
          i.categoryName,
          i.unit,
          i.currentStock,
          i.minimumStock,
          i.costPrice,
          i.sellingPrice,
          i.stockValue,
          i.stockStatus,
        ]);
        break;
      }
      case "stock-movement": {
        headers = ["Date", "Product", "SKU", "Type", "Quantity", "Previous Stock", "New Stock", "Reference", "Notes"];
        rows = (result.items || []).map((i: any) => [
          i.date,
          i.productName,
          i.sku,
          i.type,
          i.quantity,
          i.previousStock,
          i.newStock,
          i.reference || "-",
          i.notes || "-",
        ]);
        break;
      }
      case "stock-adjustment": {
        headers = ["Date", "Adjustment Number", "Items", "Reason", "Adjusted By", "Status"];
        rows = (result.items || []).map((i: any) => [
          i.date,
          i.adjustmentNumber,
          i.itemsCount,
          i.reason,
          i.adjustedBy,
          i.status,
        ]);
        break;
      }
      case "purchase-orders": {
        headers = ["PO Number", "Date", "Supplier", "Items", "Total Amount", "Status"];
        rows = (result.items || []).map((i: any) => [
          i.poNumber,
          i.date,
          i.supplierName,
          i.itemsCount,
          i.totalAmount,
          i.status,
        ]);
        break;
      }
      case "purchase-by-product": {
        headers = ["SKU", "Product Name", "Category", "Total Ordered", "Total Received", "Total Spend"];
        rows = (result.items || []).map((i: any) => [
          i.sku,
          i.productName,
          i.categoryName,
          i.totalOrdered,
          i.totalReceived,
          i.totalSpend,
        ]);
        break;
      }
      case "outstanding-purchase-orders": {
        headers = ["PO Number", "Date", "Supplier", "Ordered Qty", "Received Qty", "Remaining Qty", "Status"];
        rows = (result.items || []).map((i: any) => [
          i.poNumber,
          i.date,
          i.supplierName,
          i.orderedQty,
          i.receivedQty,
          i.remainingQty,
          i.status,
        ]);
        break;
      }
      case "goods-receipt": {
        headers = ["GRN Number", "Date", "PO Number", "Supplier", "Items Received", "Received By", "Status"];
        rows = (result.items || []).map((i: any) => [
          i.grnNumber,
          i.date,
          i.poNumber,
          i.supplierName,
          i.totalItemsReceived,
          i.receivedBy,
          i.status,
        ]);
        break;
      }
      case "receiving-by-po": {
        headers = ["PO Number", "GRN Number", "Date", "Supplier", "Items Received", "Received By"];
        rows = (result.items || []).map((i: any) => [
          i.poNumber,
          i.grnNumber,
          i.date,
          i.supplierName,
          i.totalItemsReceived,
          i.receivedBy,
        ]);
        break;
      }
      case "user-activity": {
        headers = ["Timestamp", "User", "Module", "Entity", "Action", "Record", "Description", "Status"];
        rows = (result.items || []).map((i: any) => [
          i.timestamp,
          i.user,
          i.module,
          i.entity,
          i.action,
          i.record,
          i.description,
          i.status,
        ]);
        break;
      }
      default: {
        // Universal handler for table or summary reports
        const items = result?.items && Array.isArray(result.items) ? result.items : Array.isArray(result) ? result : null;

        if (items && items.length > 0) {
          const ignoredColumns = new Set([
            "id",
            "cashierId",
            "supplierId",
            "productId",
            "categoryId",
            "userId",
            "previousValue",
            "newValue",
            "details",
          ]);
          const first = items[0];
          const rawKeys = Object.keys(first).filter((k) => !ignoredColumns.has(k));
          headers = rawKeys.map(formatLabel);
          rows = items.map((item: any) => rawKeys.map((k) => item[k]));
        } else if (result && typeof result === "object") {
          headers = ["Metric", "Value"];
          rows = Object.entries(result)
            .filter(([k, v]) => typeof v !== "object" && k !== "total" && k !== "page" && k !== "pageSize")
            .map(([k, v]) => [formatLabel(k), v]);
        }
        break;
      }
    }

    if (headers.length === 0) {
      headers = ["Status"];
      rows = [["No data available for export"]];
    }

    const csvContent = buildCSVOutput(
      reportName,
      exportedBy,
      exportTimestamp,
      resolvedFilters,
      headers,
      rows
    );

    // Record audit trail in existing audit logging system
    const filterAuditMap: Record<string, string> = {};
    for (const f of resolvedFilters) {
      filterAuditMap[f.label] = f.value;
    }

    await recordAuditLog({
      userId: session.id,
      username: exportedBy,
      action: "REPORT_EXPORT",
      module: "Reports",
      entity: "Report",
      recordId: type,
      recordIdentifier: reportName,
      description: `Exported ${reportName} to CSV`,
      details: {
        reportType: type,
        reportName,
        format: "CSV",
        exportedAt: exportTimestamp,
        appliedFilters: filterAuditMap,
      },
      newValue: {
        format: "CSV",
        filters: filterAuditMap,
      },
    });

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to generate report export" },
      { status: 500 }
    );
  }
}
