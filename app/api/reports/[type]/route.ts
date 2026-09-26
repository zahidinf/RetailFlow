import { NextRequest, NextResponse } from "next/server";
import { getSession, SESSION_COOKIE_NAME } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import * as reports from "@/lib/reports";

// Map report types to required granular permissions
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

  if (type === "filters") {
    // Check if user has at least REPORT_VIEW
    const canViewReports = await hasPermission(session.id, "REPORT_VIEW");
    if (!canViewReports) {
      return NextResponse.json(
        { error: "Forbidden: Missing required permission: REPORT_VIEW" },
        { status: 403 }
      );
    }
    const filterOptions = await reports.getReportFilterOptions();
    return NextResponse.json({ data: filterOptions });
  }

  const requiredPermission = REPORT_PERMISSION_MAP[type];
  if (!requiredPermission) {
    return NextResponse.json({ error: `Unknown report type: ${type}` }, { status: 400 });
  }

  // Base permission check AND granular category permission check
  const [hasBaseReportView, hasCategoryView] = await Promise.all([
    hasPermission(session.id, "REPORT_VIEW"),
    hasPermission(session.id, requiredPermission),
  ]);

  if (!hasBaseReportView || !hasCategoryView) {
    return NextResponse.json(
      { error: `Forbidden: Missing required permission: ${requiredPermission}` },
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
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);

  try {
    let result: any;

    switch (type) {
      // Sales
      case "sales-summary":
        result = await reports.getSalesSummaryReport({ startDate, endDate });
        break;
      case "sales-transactions":
        result = await reports.getSalesTransactionsReport({
          startDate,
          endDate,
          cashierId,
          status,
          paymentMethod,
          search,
          page,
          pageSize,
        });
        break;
      case "sales-by-product":
        result = await reports.getSalesByProductReport({
          startDate,
          endDate,
          categoryId,
          search,
          page,
          pageSize,
        });
        break;
      case "sales-by-category":
        result = await reports.getSalesByCategoryReport({ startDate, endDate });
        break;
      case "sales-by-cashier":
        result = await reports.getSalesByCashierReport({ startDate, endDate });
        break;
      case "sales-by-payment-method":
        result = await reports.getSalesByPaymentMethodReport({ startDate, endDate });
        break;
      case "sales-refund":
        result = await reports.getRefundReport({ startDate, endDate, search, page, pageSize });
        break;
      case "sales-discount":
        result = await reports.getDiscountReport({ startDate, endDate, supplierId, search, page, pageSize });
        break;

      // Inventory
      case "stock-summary":
        result = await reports.getStockSummaryReport({ categoryId, status, search, page, pageSize });
        break;
      case "stock-movement":
        result = await reports.getStockMovementReport({
          startDate,
          endDate,
          productId,
          type: status,
          search,
          page,
          pageSize,
        });
        break;
      case "stock-adjustment":
        result = await reports.getStockAdjustmentReport({ startDate, endDate, search, page, pageSize });
        break;
      case "low-stock":
        result = await reports.getLowStockReport({ categoryId, search, page, pageSize });
        break;
      case "out-of-stock":
        result = await reports.getOutOfStockReport({ categoryId, search, page, pageSize });
        break;

      // Purchasing
      case "purchase-summary":
        result = await reports.getPurchaseSummaryReport({ startDate, endDate });
        break;
      case "purchase-orders":
        result = await reports.getPurchaseOrdersReport({
          startDate,
          endDate,
          supplierId,
          status,
          search,
          page,
          pageSize,
        });
        break;
      case "purchase-by-supplier":
        result = await reports.getPurchaseBySupplierReport({ startDate, endDate });
        break;
      case "purchase-by-product":
        result = await reports.getPurchaseByProductReport({ startDate, endDate, search, page, pageSize });
        break;
      case "outstanding-purchase-orders":
        result = await reports.getOutstandingPurchaseOrdersReport({ supplierId, search, page, pageSize });
        break;

      // Warehouse
      case "goods-receipt":
        result = await reports.getGoodsReceiptReport({
          startDate,
          endDate,
          supplierId,
          status,
          search,
          page,
          pageSize,
        });
        break;
      case "receiving-by-supplier":
        result = await reports.getReceivingBySupplierReport({ startDate, endDate });
        break;
      case "receiving-by-po":
        result = await reports.getReceivingByPOReport({ startDate, endDate, search, page, pageSize });
        break;
      case "receiving-discrepancy":
        result = await reports.getReceivingDiscrepancyReport({ supplierId, search, page, pageSize });
        break;
      case "pending-receiving":
        result = await reports.getPendingReceivingReport({ supplierId, search, page, pageSize });
        break;
      case "partial-receiving":
        result = await reports.getPartialReceivingReport({ supplierId, search, page, pageSize });
        break;

      // Finance
      case "revenue":
        result = await reports.getRevenueReport({ startDate, endDate });
        break;
      case "payment":
        result = await reports.getPaymentReport({ startDate, endDate });
        break;
      case "tax":
        result = await reports.getTaxReport({ startDate, endDate });
        break;
      case "refund":
        result = await reports.getRefundFinanceReport({ startDate, endDate });
        break;
      case "discount":
        result = await reports.getDiscountFinanceReport({ startDate, endDate });
        break;
      case "purchase-expense":
        result = await reports.getPurchaseExpenseReport({ startDate, endDate });
        break;

      // Cashier
      case "cashier-sales":
        result = await reports.getCashierSalesReport({ startDate, endDate });
        break;
      case "payment-summary":
        result = await reports.getPaymentSummaryReport({ startDate, endDate });
        break;
      case "cash-collection":
        result = await reports.getCashCollectionReport({ startDate, endDate });
        break;

      // Audit
      case "user-activity":
        result = await reports.getUserActivityReport({
          startDate,
          endDate,
          userId,
          action,
          module: auditModule,
          entity: auditEntity,
          search,
          page,
          pageSize,
        });
        break;
      case "login-activity":
        result = await reports.getLoginActivityReport({ startDate, endDate, search, page, pageSize });
        break;
      case "transaction-audit":
        result = await reports.getTransactionAuditReport({ startDate, endDate, search, page, pageSize });
        break;
      case "refund-audit":
        result = await reports.getRefundAuditReport({ startDate, endDate, search, page, pageSize });
        break;
      case "stock-adjustment-audit":
        result = await reports.getStockAdjustmentAuditReport({ startDate, endDate, search, page, pageSize });
        break;
      case "purchase-order-audit":
        result = await reports.getPurchaseOrderAuditReport({ startDate, endDate, search, page, pageSize });
        break;
      case "goods-receipt-audit":
        result = await reports.getGoodsReceiptAuditReport({ startDate, endDate, search, page, pageSize });
        break;

      default:
        return NextResponse.json({ error: "Report handler not found" }, { status: 404 });
    }

    return NextResponse.json({ data: result });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load report data" },
      { status: 500 }
    );
  }
}
