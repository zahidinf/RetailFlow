import { NextRequest, NextResponse } from "next/server";
import { getSession, SESSION_COOKIE_NAME } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import * as reports from "@/lib/reports";

const REPORT_PERMISSION_MAP: Record<string, string> = {
  // Sales
  "sales-summary": "REPORT_SALES_VIEW",
  "sales-transactions": "REPORT_SALES_VIEW",
  "sales-by-product": "REPORT_SALES_VIEW",
  "sales-by-category": "REPORT_SALES_VIEW",
  "sales-by-cashier": "REPORT_SALES_VIEW",
  "sales-by-payment-method": "REPORT_SALES_VIEW",
  "sales-refund": "REPORT_SALES_VIEW",
  "sales-discount": "REPORT_SALES_VIEW",

  // Inventory
  "stock-summary": "REPORT_INVENTORY_VIEW",
  "stock-movement": "REPORT_INVENTORY_VIEW",
  "stock-adjustment": "REPORT_INVENTORY_VIEW",
  "low-stock": "REPORT_INVENTORY_VIEW",
  "out-of-stock": "REPORT_INVENTORY_VIEW",

  // Purchasing
  "purchase-summary": "REPORT_PURCHASING_VIEW",
  "purchase-orders": "REPORT_PURCHASING_VIEW",
  "purchase-by-supplier": "REPORT_PURCHASING_VIEW",
  "purchase-by-product": "REPORT_PURCHASING_VIEW",
  "outstanding-purchase-orders": "REPORT_PURCHASING_VIEW",

  // Warehouse
  "goods-receipt": "REPORT_WAREHOUSE_VIEW",
  "receiving-by-supplier": "REPORT_WAREHOUSE_VIEW",
  "receiving-by-po": "REPORT_WAREHOUSE_VIEW",
  "receiving-discrepancy": "REPORT_WAREHOUSE_VIEW",
  "pending-receiving": "REPORT_WAREHOUSE_VIEW",
  "partial-receiving": "REPORT_WAREHOUSE_VIEW",

  // Finance
  "revenue": "REPORT_FINANCE_VIEW",
  "payment": "REPORT_FINANCE_VIEW",
  "tax": "REPORT_FINANCE_VIEW",
  "refund": "REPORT_FINANCE_VIEW",
  "discount": "REPORT_FINANCE_VIEW",
  "purchase-expense": "REPORT_FINANCE_VIEW",

  // Cashier
  "cashier-sales": "REPORT_CASHIER_VIEW",
  "payment-summary": "REPORT_CASHIER_VIEW",
  "cash-collection": "REPORT_CASHIER_VIEW",

  // Audit
  "user-activity": "REPORT_AUDIT_VIEW",
  "login-activity": "REPORT_AUDIT_VIEW",
  "transaction-audit": "REPORT_AUDIT_VIEW",
  "refund-audit": "REPORT_AUDIT_VIEW",
  "stock-adjustment-audit": "REPORT_AUDIT_VIEW",
  "purchase-order-audit": "REPORT_AUDIT_VIEW",
  "goods-receipt-audit": "REPORT_AUDIT_VIEW",
};

function convertToCSV(headers: string[], rows: any[][]): string {
  const escapeCell = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const headerLine = headers.map(escapeCell).join(",");
  const dataLines = rows.map((r) => r.map(escapeCell).join(","));
  return [headerLine, ...dataLines].join("\r\n");
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

  // For export, fetch maximum dataset (up to 5000 items)
  const pageSize = 5000;
  const page = 1;

  let filename = `${type}-report.csv`;
  let csvContent = "";

  try {
    switch (type) {
      case "sales-transactions": {
        const res = await reports.getSalesTransactionsReport({
          startDate,
          endDate,
          cashierId,
          status,
          paymentMethod,
          search,
          page,
          pageSize,
        });
        const headers = ["Sale Number", "Date", "Cashier", "Payment Method", "Items", "Gross", "Refund", "Net", "Status"];
        const rows = res.items.map((i) => [
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
        csvContent = convertToCSV(headers, rows);
        break;
      }
      case "sales-by-product": {
        const res = await reports.getSalesByProductReport({
          startDate,
          endDate,
          categoryId,
          search,
          page,
          pageSize,
        });
        const headers = ["SKU", "Product Name", "Category", "Quantity Sold", "Refunded Qty", "Net Qty", "Total Revenue"];
        const rows = res.items.map((i) => [
          i.sku,
          i.productName,
          i.categoryName,
          i.quantitySold,
          i.refundedQuantity,
          i.netQuantity,
          i.totalRevenue,
        ]);
        csvContent = convertToCSV(headers, rows);
        break;
      }
      case "stock-summary": {
        const res = await reports.getStockSummaryReport({ categoryId, status, search, page, pageSize });
        const headers = ["SKU", "Product Name", "Category", "Unit", "Current Stock", "Min Stock", "Cost Price", "Selling Price", "Stock Value", "Status"];
        const rows = res.items.map((i) => [
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
        csvContent = convertToCSV(headers, rows);
        break;
      }
      case "stock-movement": {
        const res = await reports.getStockMovementReport({
          startDate,
          endDate,
          productId,
          type: status,
          search,
          page,
          pageSize,
        });
        const headers = ["Date", "SKU", "Product", "Type", "Change Qty", "Prev Stock", "New Stock", "Reason", "Reference", "User"];
        const rows = res.items.map((i) => [
          i.date,
          i.sku,
          i.productName,
          i.type,
          i.quantity,
          i.previousStock,
          i.newStock,
          i.reason,
          `${i.referenceType} ${i.referenceId}`,
          i.performedBy,
        ]);
        csvContent = convertToCSV(headers, rows);
        break;
      }
      case "purchase-orders": {
        const res = await reports.getPurchaseOrdersReport({
          startDate,
          endDate,
          supplierId,
          status,
          search,
          page,
          pageSize,
        });
        const headers = ["PO Number", "Date", "Supplier", "Status", "Items", "Received", "Total Amount", "Created By"];
        const rows = res.items.map((i) => [
          i.poNumber,
          i.poDate,
          i.supplierName,
          i.status,
          i.itemCount,
          i.receivedCount,
          i.totalAmount,
          i.createdBy,
        ]);
        csvContent = convertToCSV(headers, rows);
        break;
      }
      case "goods-receipt": {
        const res = await reports.getGoodsReceiptReport({
          startDate,
          endDate,
          supplierId,
          status,
          search,
          page,
          pageSize,
        });
        const headers = ["GR Number", "PO Number", "Date", "Supplier", "Status", "Items Received", "Received By"];
        const rows = res.items.map((i) => [
          i.grNumber,
          i.poNumber,
          i.grDate,
          i.supplierName,
          i.status,
          i.totalItemsReceived,
          i.receivedBy,
        ]);
        csvContent = convertToCSV(headers, rows);
        break;
      }
      default: {
        // Generic fallback for any table report or summary report
        const apiRes = await fetch(
          new URL(`/api/reports/${type}?${searchParams.toString()}`, request.url).toString(),
          { headers: { cookie: request.headers.get("cookie") || "" } }
        );
        const data = await apiRes.json();
        const payload = data.data;

        if (payload?.items && Array.isArray(payload.items)) {
          const first = payload.items[0];
          if (first) {
            const headers = Object.keys(first);
            const rows = payload.items.map((item: any) => headers.map((h) => item[h]));
            csvContent = convertToCSV(headers, rows);
          }
        } else if (payload && typeof payload === "object") {
          const headers = ["Metric", "Value"];
          const rows = Object.entries(payload).map(([k, v]) => [k, v]);
          csvContent = convertToCSV(headers, rows);
        }
        break;
      }
    }

    if (!csvContent) {
      csvContent = "No data available for export";
    }

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
