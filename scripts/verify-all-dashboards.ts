import { prisma } from "@/lib/prisma";
import { getUserPermissions } from "@/lib/rbac";
import {
  getSuperAdminDashboardData,
  getAdminDashboardData,
  getAccountantDashboardData,
  getAuditorDashboardData,
  getCashierDashboardData,
  getManagerDashboardData,
  getInventoryStaffDashboardData,
  getPurchasingDashboardData,
  getWarehouseDashboardData,
} from "@/lib/dashboard";
import assert from "assert";

async function main() {
  console.log("================================================================================");
  console.log("=== VERIFYING DASHBOARD ENHANCEMENT FOR ALL 9 ROLES & RBAC                   ===");
  console.log("================================================================================\n");

  const roles = [
    { email: "farhan@example.com", role: "SUPER_ADMIN" },
    { email: "admin@example.com", role: "ADMIN" },
    { email: "manager@retailflow.local", role: "MANAGER" },
    { email: "accountant@retailflow.local", role: "ACCOUNTANT" },
    { email: "auditor@retailflow.local", role: "AUDITOR" },
    { email: "cashier@retailflow.local", role: "CASHIER" },
    { email: "inventory@retailflow.local", role: "INVENTORY" },
    { email: "purchasing@retailflow.local", role: "PURCHASING" },
    { email: "warehouse@retailflow.local", role: "WAREHOUSE" },
  ];

  // 1. Verify User & Permission Mapping for all 9 roles
  console.log("[1] Verifying Dashboard permissions for all 9 roles...");
  for (const { email, role } of roles) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { userRoles: { include: { role: true } } },
    });
    assert(Boolean(user), `User ${email} exists`);
    const perms = await getUserPermissions(user!.id);
    assert(perms.includes("DASHBOARD_VIEW"), `${role} has DASHBOARD_VIEW permission`);
    console.log(`  ✓ PASS: ${role} mapped with ${perms.length} effective permissions`);
  }

  // 2. Verify Data Fetchers for all 9 roles execute without error
  console.log("\n[2] Executing Dashboard Data Loaders for each role...");

  console.log("  Testing Super Admin Dashboard Data...");
  const saData = await getSuperAdminDashboardData("today");
  assert(typeof saData.totalSalesToday === "number", "SA totalSalesToday is number");
  assert(Array.isArray(saData.salesPerformance), "SA salesPerformance is array");
  assert(Array.isArray(saData.salesByCategory), "SA salesByCategory is array");
  assert(Array.isArray(saData.salesByPaymentMethod), "SA salesByPaymentMethod is array");
  assert(typeof saData.inventoryOverview.inStock === "number", "SA inventoryOverview is valid");
  console.log("  ✓ PASS: Super Admin Data OK");

  console.log("  Testing Admin Dashboard Data...");
  const adminData = await getAdminDashboardData();
  assert(typeof adminData.totalUsers === "number", "Admin totalUsers is number");
  assert(Array.isArray(adminData.userActivityTrend), "Admin userActivityTrend is array");
  assert(Array.isArray(adminData.usersByRole), "Admin usersByRole is array");
  console.log("  ✓ PASS: Admin Data OK");

  console.log("  Testing Accountant Dashboard Data...");
  const accData = await getAccountantDashboardData("today");
  assert(typeof accData.todaySales === "number", "Accountant todaySales is number");
  assert(typeof accData.taxCollected === "number", "Accountant taxCollected is number");
  assert(typeof accData.taxSummary.taxAmount === "number", "Accountant taxSummary is calculated");
  console.log("  ✓ PASS: Accountant Data OK");

  console.log("  Testing Auditor Dashboard Data...");
  const auditData = await getAuditorDashboardData();
  assert(typeof auditData.totalAuditEvents === "number", "Auditor totalAuditEvents is number");
  assert(Array.isArray(auditData.auditActivityTrend), "Auditor auditActivityTrend is array");
  assert(Array.isArray(auditData.recentAuditActivity), "Auditor recentAuditActivity is array");
  console.log("  ✓ PASS: Auditor Data OK");

  console.log("  Testing Cashier Dashboard Data...");
  const cashierUser = await prisma.user.findUnique({ where: { email: "cashier@retailflow.local" } });
  const cashierData = await getCashierDashboardData(cashierUser!.id);
  assert(typeof cashierData.todayTransactions === "number", "Cashier todayTransactions is number");
  assert(Array.isArray(cashierData.hourlySales), "Cashier hourlySales is array");
  console.log("  ✓ PASS: Cashier Data OK");

  console.log("  Testing Manager Dashboard Data...");
  const mgrData = await getManagerDashboardData();
  assert(typeof mgrData.todaySales === "number", "Manager todaySales is number");
  assert(Array.isArray(mgrData.salesByCategory), "Manager salesByCategory is array");
  console.log("  ✓ PASS: Manager Data OK");

  console.log("  Testing Inventory Dashboard Data...");
  const invData = await getInventoryStaffDashboardData();
  assert(typeof invData.totalProducts === "number", "Inventory totalProducts is number");
  assert(Array.isArray(invData.lowStockItems), "Inventory lowStockItems is array");
  console.log("  ✓ PASS: Inventory Data OK");

  console.log("  Testing Purchasing Dashboard Data...");
  const purchData = await getPurchasingDashboardData();
  assert(typeof purchData.pendingPurchaseOrders === "number", "Purchasing pendingPurchaseOrders is number");
  assert(Array.isArray(purchData.poStatusDistribution), "Purchasing poStatusDistribution is array");
  console.log("  ✓ PASS: Purchasing Data OK");

  console.log("  Testing Warehouse Dashboard Data...");
  const whData = await getWarehouseDashboardData();
  assert(typeof whData.pendingReceipts === "number", "Warehouse pendingReceipts is number");
  assert(Array.isArray(whData.goodsReceiptTrend), "Warehouse goodsReceiptTrend is array");
  console.log("  ✓ PASS: Warehouse Data OK");

  console.log("\n================================================================================");
  console.log("=== ALL DASHBOARDS AND ROLE QUERIES VERIFIED SUCCESSFULLY!                   ===");
  console.log("================================================================================");
}

main()
  .catch((e) => {
    console.error("Verification failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
