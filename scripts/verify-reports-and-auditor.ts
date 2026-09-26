import { prisma } from "@/lib/prisma";
import { getUserPermissions, hasPermission } from "@/lib/rbac";
import * as reports from "@/lib/reports";
import assert from "assert";

async function main() {
  console.log("================================================================================");
  console.log("=== VERIFYING REPORTS MODULE & AUDITOR RBAC MATRIX                           ===");
  console.log("================================================================================\n");

  // 1. Verify Auditor Role & Dev User
  console.log("[1] Verifying Auditor Role & User Creation...");
  const auditorRole = await prisma.role.findUnique({
    where: { name: "AUDITOR" },
    include: { rolePermissions: { include: { permission: true } } },
  });
  assert(Boolean(auditorRole), "Auditor role exists in database");

  const auditorUser = await prisma.user.findUnique({
    where: { email: "auditor@retailflow.local" },
    include: { userRoles: { include: { role: true } } },
  });
  assert(Boolean(auditorUser), "Auditor user auditor@retailflow.local exists");
  assert(
    auditorUser?.userRoles.some((ur) => ur.role.name === "AUDITOR"),
    "Auditor user has AUDITOR role assigned"
  );
  console.log("  ✓ PASS: Auditor role & user verified");

  // 2. Verify Auditor Permissions are strictly READ-ONLY
  console.log("\n[2] Verifying Auditor Permission Boundaries (Strictly Read-Only)...");
  const auditorPerms = await getUserPermissions(auditorUser!.id);

  // Must have report permissions
  assert(auditorPerms.includes("REPORT_VIEW"), "Auditor has REPORT_VIEW");
  assert(auditorPerms.includes("REPORT_SALES_VIEW"), "Auditor has REPORT_SALES_VIEW");
  assert(auditorPerms.includes("REPORT_INVENTORY_VIEW"), "Auditor has REPORT_INVENTORY_VIEW");
  assert(auditorPerms.includes("REPORT_PURCHASING_VIEW"), "Auditor has REPORT_PURCHASING_VIEW");
  assert(auditorPerms.includes("REPORT_WAREHOUSE_VIEW"), "Auditor has REPORT_WAREHOUSE_VIEW");
  assert(auditorPerms.includes("REPORT_FINANCE_VIEW"), "Auditor has REPORT_FINANCE_VIEW");
  assert(auditorPerms.includes("REPORT_CASHIER_VIEW"), "Auditor has REPORT_CASHIER_VIEW");
  assert(auditorPerms.includes("REPORT_AUDIT_VIEW"), "Auditor has REPORT_AUDIT_VIEW");
  assert(auditorPerms.includes("REPORT_EXPORT"), "Auditor has REPORT_EXPORT");
  console.log("  ✓ PASS: Auditor has all required report permissions");

  // Must NOT have operational write permissions
  const forbiddenWrites = [
    "CATEGORY_CREATE",
    "CATEGORY_UPDATE",
    "CATEGORY_DELETE",
    "PRODUCT_CREATE",
    "PRODUCT_UPDATE",
    "PRODUCT_DELETE",
    "STOCK_UPDATE",
    "POS_ACCESS",
    "POS_SALE_CREATE",
    "SALES_VOID",
    "SALES_REFUND",
    "SALES_REFUND_APPROVE",
    "TRANSACTION_REFUND_CREATE",
    "TRANSACTION_REFUND_APPROVE",
    "USER_CREATE",
    "USER_UPDATE",
    "USER_DELETE",
    "ROLE_CREATE",
    "ROLE_UPDATE",
    "ROLE_DELETE",
    "ROLE_MANAGE",
    "PARAMETER_SETTINGS_CREATE",
    "PARAMETER_SETTINGS_UPDATE",
    "PARAMETER_SETTINGS_DELETE",
    "SUPPLIER_CREATE",
    "SUPPLIER_UPDATE",
    "SUPPLIER_DELETE",
    "PURCHASE_ORDER_CREATE",
    "PURCHASE_ORDER_UPDATE",
    "PURCHASE_ORDER_SUBMIT",
    "PURCHASE_ORDER_APPROVE",
    "PURCHASE_ORDER_CANCEL",
    "GOODS_RECEIPT_CREATE",
    "GOODS_RECEIPT_UPDATE",
    "GOODS_RECEIPT_CONFIRM",
    "GOODS_RECEIPT_CANCEL",
  ];

  for (const perm of forbiddenWrites) {
    const has = await hasPermission(auditorUser!.id, perm);
    assert(!has, `Auditor MUST NOT have ${perm}`);
  }
  console.log(`  ✓ PASS: Auditor strictly lacks all ${forbiddenWrites.length} write/operational permissions`);

  // 3. Verify Separation of Granular Report Permissions
  console.log("\n[3] Verifying Granular Role-Based Report Access Separation...");

  const cashier = await prisma.user.findUnique({ where: { email: "cashier@retailflow.local" } });
  const cashierCanViewCashierReport = await hasPermission(cashier!.id, "REPORT_CASHIER_VIEW");
  const cashierCanViewFinanceReport = await hasPermission(cashier!.id, "REPORT_FINANCE_VIEW");
  const cashierCanViewAuditReport = await hasPermission(cashier!.id, "REPORT_AUDIT_VIEW");
  assert(cashierCanViewCashierReport, "Cashier can view Cashier report");
  assert(!cashierCanViewFinanceReport, "Cashier CANNOT view Finance reports");
  assert(!cashierCanViewAuditReport, "Cashier CANNOT view Audit reports");
  console.log("  ✓ PASS: Cashier role report access scoped correctly");

  const inventoryStaff = await prisma.user.findUnique({ where: { email: "inventory@retailflow.local" } });
  const invCanViewInvReport = await hasPermission(inventoryStaff!.id, "REPORT_INVENTORY_VIEW");
  const invCanViewFinance = await hasPermission(inventoryStaff!.id, "REPORT_FINANCE_VIEW");
  assert(invCanViewInvReport, "Inventory staff can view Inventory report");
  assert(!invCanViewFinance, "Inventory staff CANNOT view Finance reports");
  console.log("  ✓ PASS: Inventory Staff role report access scoped correctly");

  const purchasing = await prisma.user.findUnique({ where: { email: "purchasing@retailflow.local" } });
  const purCanViewPurReport = await hasPermission(purchasing!.id, "REPORT_PURCHASING_VIEW");
  const purCanViewFinance = await hasPermission(purchasing!.id, "REPORT_FINANCE_VIEW");
  assert(purCanViewPurReport, "Purchasing staff can view Purchasing report");
  assert(!purCanViewFinance, "Purchasing staff CANNOT view Finance reports");
  console.log("  ✓ PASS: Purchasing role report access scoped correctly");

  const warehouse = await prisma.user.findUnique({ where: { email: "warehouse@retailflow.local" } });
  const whCanViewWhReport = await hasPermission(warehouse!.id, "REPORT_WAREHOUSE_VIEW");
  const whCanViewFinance = await hasPermission(warehouse!.id, "REPORT_FINANCE_VIEW");
  assert(whCanViewWhReport, "Warehouse staff can view Warehouse report");
  assert(!whCanViewFinance, "Warehouse staff CANNOT view Finance reports");
  console.log("  ✓ PASS: Warehouse role report access scoped correctly");

  const accountant = await prisma.user.findUnique({ where: { email: "accountant@retailflow.local" } });
  const accCanViewFinance = await hasPermission(accountant!.id, "REPORT_FINANCE_VIEW");
  const accCanViewSales = await hasPermission(accountant!.id, "REPORT_SALES_VIEW");
  const accCanAdjustStock = await hasPermission(accountant!.id, "STOCK_UPDATE");
  assert(accCanViewFinance, "Accountant can view Finance reports");
  assert(accCanViewSales, "Accountant can view Sales reports");
  assert(!accCanAdjustStock, "Accountant CANNOT adjust stock");
  console.log("  ✓ PASS: Accountant role report access scoped correctly");

  // 4. Verify Super Admin uses RBAC (Has permissions assigned, not bypassing)
  console.log("\n[4] Verifying Super Admin Uses RBAC...");
  const superAdmin = await prisma.user.findUnique({ where: { email: "farhan@example.com" } });
  const superAdminHasReportView = await hasPermission(superAdmin!.id, "REPORT_VIEW");
  const superAdminHasExport = await hasPermission(superAdmin!.id, "REPORT_EXPORT");
  assert(superAdminHasReportView, "Super Admin has REPORT_VIEW via RBAC role assignment");
  assert(superAdminHasExport, "Super Admin has REPORT_EXPORT via RBAC role assignment");
  console.log("  ✓ PASS: Super Admin uses RBAC");

  // 5. Verify Report Data Generation (All Categories)
  console.log("\n[5] Verifying Report Data Functions Execution...");

  // Sales
  const salesSummary = await reports.getSalesSummaryReport();
  assert(typeof salesSummary.totalTransactions === "number", "Sales summary returns metrics");
  const salesTx = await reports.getSalesTransactionsReport();
  assert(Array.isArray(salesTx.items), "Sales transactions returns items");

  // Inventory
  const stockSummary = await reports.getStockSummaryReport();
  assert(Array.isArray(stockSummary.items), "Stock summary returns items");
  const lowStock = await reports.getLowStockReport();
  assert(Array.isArray(lowStock.items), "Low stock returns items");

  // Purchasing
  const poSummary = await reports.getPurchaseSummaryReport();
  assert(typeof poSummary.totalOrders === "number", "PO summary returns metrics");
  const poList = await reports.getPurchaseOrdersReport();
  assert(Array.isArray(poList.items), "PO list returns items");

  // Warehouse
  const grList = await reports.getGoodsReceiptReport();
  assert(Array.isArray(grList.items), "GR list returns items");

  // Finance
  const revenue = await reports.getRevenueReport();
  assert(typeof revenue.netRevenue === "number", "Revenue report returns metrics");
  const tax = await reports.getTaxReport();
  assert(typeof tax.outputTax === "number", "Tax report returns metrics");

  // Cashier
  const cashColl = await reports.getCashCollectionReport();
  assert(typeof cashColl.netCashCollected === "number", "Cash collection returns metrics");

  // Audit
  const auditLogs = await reports.getUserActivityReport();
  assert(Array.isArray(auditLogs.items), "Audit logs returns items");
  const loginAct = await reports.getLoginActivityReport();
  assert(Array.isArray(loginAct.items), "Login activity returns items");

  console.log("  ✓ PASS: All report query handlers executed and returned valid structures");

  console.log("\n================================================================================");
  console.log("=== ALL REPORT & AUDITOR VERIFICATIONS PASSED SUCCESSFULLY!                 ===");
  console.log("================================================================================\n");
}

main()
  .catch((err) => {
    console.error("Verification failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
