import { prisma } from "../lib/prisma";
import { getUserPermissions, hasPermission, clearAllPermissionCaches } from "../lib/rbac";
import { createPurchaseOrderAction, createGoodsReceiptAction, confirmGoodsReceiptAction } from "../app/purchasing/actions";
import { ForbiddenError } from "../lib/auth-guards";

let passedCount = 0;
let totalCount = 0;

function assert(condition: boolean, message: string) {
  totalCount++;
  if (!condition) {
    console.error(`  FAIL [${totalCount}]: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passedCount++;
  console.log(`  PASS [${totalCount}]: ${message}`);
}

async function setRolePermissions(roleName: string, permissionNames: string[]) {
  const role = await prisma.role.findUnique({
    where: { name: roleName },
    include: { rolePermissions: true },
  });
  if (!role) throw new Error(`Role ${roleName} not found`);

  const permissions = await prisma.permission.findMany({
    where: { name: { in: permissionNames } },
  });

  await prisma.$transaction(async (tx) => {
    await tx.rolePermission.deleteMany({ where: { roleId: role.id } });
    for (const p of permissions) {
      await tx.rolePermission.create({
        data: { roleId: role.id, permissionId: p.id },
      });
    }
  });

  clearAllPermissionCaches();
}

async function getRolePermissionNames(roleName: string): Promise<string[]> {
  const role = await prisma.role.findUnique({
    where: { name: roleName },
    include: { rolePermissions: { include: { permission: true } } },
  });
  return role ? role.rolePermissions.map((rp) => rp.permission.name) : [];
}

async function run() {
  console.log("================================================================================");
  console.log("RETAILFLOW RBAC ENFORCEMENT REGRESSION SUITE: PURCHASING & RECEIPT GOODS");
  console.log("================================================================================\n");

  const adminUser = await prisma.user.findFirst({
    where: { email: "admin@example.com" },
    include: { userRoles: { include: { role: true } } },
  });
  const superAdminUser = await prisma.user.findFirst({
    where: { email: "farhan@example.com" },
    include: { userRoles: { include: { role: true } } },
  });

  if (!adminUser || !superAdminUser) {
    throw new Error("Test users admin@example.com or farhan@example.com missing");
  }

  // Backup initial permissions
  const initialAdminPerms = await getRolePermissionNames("ADMIN");
  const initialSuperAdminPerms = await getRolePermissionNames("SUPER_ADMIN");

  console.log(`[SETUP] Admin initial permissions count: ${initialAdminPerms.length}`);
  console.log(`[SETUP] Super Admin initial permissions count: ${initialSuperAdminPerms.length}`);

  try {
    // -------------------------------------------------------------------------
    // SCENARIO 1: Admin + Purchasing View only
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 1: Admin + Purchasing View only ---");
    const s1Perms = initialAdminPerms.filter(
      (p) => !["PURCHASE_ORDER_CREATE", "PURCHASE_ORDER_SUBMIT", "PURCHASE"].includes(p)
    );
    if (!s1Perms.includes("PURCHASE_ORDER_VIEW")) s1Perms.push("PURCHASE_ORDER_VIEW");
    await setRolePermissions("ADMIN", s1Perms);

    const s1AdminPerms = await getUserPermissions(adminUser.id);
    const s1CanView = s1AdminPerms.includes("PURCHASE_ORDER_VIEW");
    const s1CanCreate = s1AdminPerms.includes("PURCHASE_ORDER_CREATE") || s1AdminPerms.includes("PURCHASE");
    const s1BackendAuth = await hasPermission(adminUser.id, "PURCHASE_ORDER_CREATE");

    assert(s1CanView, "Frontend: Admin can view purchasing orders");
    assert(!s1CanCreate, "Frontend: Admin CANNOT create purchasing transactions (button hidden)");
    assert(!s1BackendAuth, "Backend: Authoritative check rejects PURCHASE_ORDER_CREATE");

    // -------------------------------------------------------------------------
    // SCENARIO 2: Admin + Purchasing View + Purchase
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 2: Admin + Purchasing View + Purchase ---");
    const s2Perms = [...s1Perms, "PURCHASE_ORDER_CREATE"];
    await setRolePermissions("ADMIN", s2Perms);

    const s2AdminPerms = await getUserPermissions(adminUser.id);
    const s2CanView = s2AdminPerms.includes("PURCHASE_ORDER_VIEW");
    const s2CanCreate = s2AdminPerms.includes("PURCHASE_ORDER_CREATE");
    const s2BackendAuth = await hasPermission(adminUser.id, "PURCHASE_ORDER_CREATE");
    const s2AliasAuth = await hasPermission(adminUser.id, "PURCHASE");

    assert(s2CanView, "Frontend: Admin can view purchasing orders");
    assert(s2CanCreate, "Frontend: Admin CAN create purchasing transactions (button shown)");
    assert(s2BackendAuth, "Backend: Authoritative check allows PURCHASE_ORDER_CREATE");
    assert(s2AliasAuth, "Backend: Alias check allows PURCHASE");

    // -------------------------------------------------------------------------
    // SCENARIO 3: Admin + Receipt Goods View only
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 3: Admin + Receipt Goods View only ---");
    const s3Perms = s2Perms.filter(
      (p) => !["GOODS_RECEIPT_CREATE", "GOODS_RECEIPT_CONFIRM", "RECEIPT_GOODS"].includes(p)
    );
    if (!s3Perms.includes("GOODS_RECEIPT_VIEW")) s3Perms.push("GOODS_RECEIPT_VIEW");
    await setRolePermissions("ADMIN", s3Perms);

    const s3AdminPerms = await getUserPermissions(adminUser.id);
    const s3CanView = s3AdminPerms.includes("GOODS_RECEIPT_VIEW");
    const s3CanCreate = s3AdminPerms.includes("GOODS_RECEIPT_CREATE") || s3AdminPerms.includes("RECEIPT_GOODS");
    const s3BackendCreateAuth = await hasPermission(adminUser.id, "GOODS_RECEIPT_CREATE");
    const s3BackendConfirmAuth = await hasPermission(adminUser.id, "GOODS_RECEIPT_CONFIRM");

    assert(s3CanView, "Frontend: Admin can view goods receipts");
    assert(!s3CanCreate, "Frontend: Admin CANNOT create goods receipts (button hidden)");
    assert(!s3BackendCreateAuth, "Backend: Authoritative check rejects GOODS_RECEIPT_CREATE");
    assert(!s3BackendConfirmAuth, "Backend: Authoritative check rejects GOODS_RECEIPT_CONFIRM");

    // -------------------------------------------------------------------------
    // SCENARIO 4: Admin + Receipt Goods View + Receipt Goods
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 4: Admin + Receipt Goods View + Receipt Goods ---");
    const s4Perms = [...s3Perms, "GOODS_RECEIPT_CREATE", "GOODS_RECEIPT_CONFIRM"];
    await setRolePermissions("ADMIN", s4Perms);

    const s4AdminPerms = await getUserPermissions(adminUser.id);
    const s4CanView = s4AdminPerms.includes("GOODS_RECEIPT_VIEW");
    const s4CanCreate = s4AdminPerms.includes("GOODS_RECEIPT_CREATE");
    const s4BackendCreateAuth = await hasPermission(adminUser.id, "GOODS_RECEIPT_CREATE");
    const s4BackendConfirmAuth = await hasPermission(adminUser.id, "GOODS_RECEIPT_CONFIRM");
    const s4AliasAuth = await hasPermission(adminUser.id, "RECEIPT_GOODS");

    assert(s4CanView, "Frontend: Admin can view goods receipts");
    assert(s4CanCreate, "Frontend: Admin CAN create goods receipts (button shown)");
    assert(s4BackendCreateAuth, "Backend: Authoritative check allows GOODS_RECEIPT_CREATE");
    assert(s4BackendConfirmAuth, "Backend: Authoritative check allows GOODS_RECEIPT_CONFIRM");
    assert(s4AliasAuth, "Backend: Alias check allows RECEIPT_GOODS");

    // -------------------------------------------------------------------------
    // SCENARIO 5: Super Admin + Purchasing View only
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 5: Super Admin + Purchasing View only ---");
    const s5Perms = initialSuperAdminPerms.filter(
      (p) => !["PURCHASE_ORDER_CREATE", "PURCHASE_ORDER_SUBMIT", "PURCHASE"].includes(p)
    );
    if (!s5Perms.includes("PURCHASE_ORDER_VIEW")) s5Perms.push("PURCHASE_ORDER_VIEW");
    await setRolePermissions("SUPER_ADMIN", s5Perms);

    const s5SuperAdminPerms = await getUserPermissions(superAdminUser.id);
    const s5CanView = s5SuperAdminPerms.includes("PURCHASE_ORDER_VIEW");
    const s5CanCreate = s5SuperAdminPerms.includes("PURCHASE_ORDER_CREATE") || s5SuperAdminPerms.includes("PURCHASE");
    const s5BackendAuth = await hasPermission(superAdminUser.id, "PURCHASE_ORDER_CREATE");

    assert(s5CanView, "Frontend: Super Admin can view purchasing orders");
    assert(!s5CanCreate, "Frontend: Super Admin CANNOT create purchasing transactions without Purchase permission");
    assert(!s5BackendAuth, "Backend: Authoritative check rejects Super Admin without PURCHASE_ORDER_CREATE");

    // -------------------------------------------------------------------------
    // SCENARIO 6: Super Admin + Purchasing View + Purchase
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 6: Super Admin + Purchasing View + Purchase ---");
    const s6Perms = [...s5Perms, "PURCHASE_ORDER_CREATE"];
    await setRolePermissions("SUPER_ADMIN", s6Perms);

    const s6SuperAdminPerms = await getUserPermissions(superAdminUser.id);
    const s6CanView = s6SuperAdminPerms.includes("PURCHASE_ORDER_VIEW");
    const s6CanCreate = s6SuperAdminPerms.includes("PURCHASE_ORDER_CREATE");
    const s6BackendAuth = await hasPermission(superAdminUser.id, "PURCHASE_ORDER_CREATE");
    const s6AliasAuth = await hasPermission(superAdminUser.id, "PURCHASE");

    assert(s6CanView, "Frontend: Super Admin can view purchasing orders");
    assert(s6CanCreate, "Frontend: Super Admin CAN create purchasing transactions");
    assert(s6BackendAuth, "Backend: Authoritative check allows Super Admin with PURCHASE_ORDER_CREATE");
    assert(s6AliasAuth, "Backend: Alias check allows Super Admin with PURCHASE");

    // -------------------------------------------------------------------------
    // SCENARIO 7: Super Admin + Receipt Goods View only
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 7: Super Admin + Receipt Goods View only ---");
    const s7Perms = s6Perms.filter(
      (p) => !["GOODS_RECEIPT_CREATE", "GOODS_RECEIPT_CONFIRM", "RECEIPT_GOODS"].includes(p)
    );
    if (!s7Perms.includes("GOODS_RECEIPT_VIEW")) s7Perms.push("GOODS_RECEIPT_VIEW");
    await setRolePermissions("SUPER_ADMIN", s7Perms);

    const s7SuperAdminPerms = await getUserPermissions(superAdminUser.id);
    const s7CanView = s7SuperAdminPerms.includes("GOODS_RECEIPT_VIEW");
    const s7CanCreate = s7SuperAdminPerms.includes("GOODS_RECEIPT_CREATE") || s7SuperAdminPerms.includes("RECEIPT_GOODS");
    const s7BackendCreateAuth = await hasPermission(superAdminUser.id, "GOODS_RECEIPT_CREATE");
    const s7BackendConfirmAuth = await hasPermission(superAdminUser.id, "GOODS_RECEIPT_CONFIRM");

    assert(s7CanView, "Frontend: Super Admin can view goods receipts");
    assert(!s7CanCreate, "Frontend: Super Admin CANNOT create goods receipts without Receipt Goods permission");
    assert(!s7BackendCreateAuth, "Backend: Authoritative check rejects Super Admin without GOODS_RECEIPT_CREATE");
    assert(!s7BackendConfirmAuth, "Backend: Authoritative check rejects Super Admin without GOODS_RECEIPT_CONFIRM");

    // -------------------------------------------------------------------------
    // SCENARIO 8: Super Admin + Receipt Goods View + Receipt Goods
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 8: Super Admin + Receipt Goods View + Receipt Goods ---");
    const s8Perms = [...s7Perms, "GOODS_RECEIPT_CREATE", "GOODS_RECEIPT_CONFIRM"];
    await setRolePermissions("SUPER_ADMIN", s8Perms);

    const s8SuperAdminPerms = await getUserPermissions(superAdminUser.id);
    const s8CanView = s8SuperAdminPerms.includes("GOODS_RECEIPT_VIEW");
    const s8CanCreate = s8SuperAdminPerms.includes("GOODS_RECEIPT_CREATE");
    const s8BackendCreateAuth = await hasPermission(superAdminUser.id, "GOODS_RECEIPT_CREATE");
    const s8BackendConfirmAuth = await hasPermission(superAdminUser.id, "GOODS_RECEIPT_CONFIRM");
    const s8AliasAuth = await hasPermission(superAdminUser.id, "RECEIPT_GOODS");

    assert(s8CanView, "Frontend: Super Admin can view goods receipts");
    assert(s8CanCreate, "Frontend: Super Admin CAN create goods receipts");
    assert(s8BackendCreateAuth, "Backend: Authoritative check allows Super Admin with GOODS_RECEIPT_CREATE");
    assert(s8BackendConfirmAuth, "Backend: Authoritative check allows Super Admin with GOODS_RECEIPT_CONFIRM");
    assert(s8AliasAuth, "Backend: Alias check allows Super Admin with RECEIPT_GOODS");

    // -------------------------------------------------------------------------
    // RESTORE TO CURRENT USER CONFIGURATION (View Only for Admin & Super Admin)
    // -------------------------------------------------------------------------
    console.log("\n--- Restoring to user's desired configuration (View only) ---");
    await setRolePermissions("ADMIN", initialAdminPerms);
    await setRolePermissions("SUPER_ADMIN", initialSuperAdminPerms);

    const finalAdminPerms = await getUserPermissions(adminUser.id);
    const finalSuperAdminPerms = await getUserPermissions(superAdminUser.id);

    assert(finalAdminPerms.includes("PURCHASE_ORDER_VIEW"), "Final state: Admin has PURCHASE_ORDER_VIEW");
    assert(!finalAdminPerms.includes("PURCHASE_ORDER_CREATE"), "Final state: Admin lacks PURCHASE_ORDER_CREATE");
    assert(finalAdminPerms.includes("GOODS_RECEIPT_VIEW"), "Final state: Admin has GOODS_RECEIPT_VIEW");
    assert(!finalAdminPerms.includes("GOODS_RECEIPT_CREATE"), "Final state: Admin lacks GOODS_RECEIPT_CREATE");

    assert(finalSuperAdminPerms.includes("PURCHASE_ORDER_VIEW"), "Final state: Super Admin has PURCHASE_ORDER_VIEW");
    assert(!finalSuperAdminPerms.includes("PURCHASE_ORDER_CREATE"), "Final state: Super Admin lacks PURCHASE_ORDER_CREATE");
    assert(finalSuperAdminPerms.includes("GOODS_RECEIPT_VIEW"), "Final state: Super Admin has GOODS_RECEIPT_VIEW");
    assert(!finalSuperAdminPerms.includes("GOODS_RECEIPT_CREATE"), "Final state: Super Admin lacks GOODS_RECEIPT_CREATE");

    console.log(`\nAll ${passedCount}/${totalCount} RBAC assertions passed successfully!`);
  } catch (error) {
    // Restore even on error
    await setRolePermissions("ADMIN", initialAdminPerms);
    await setRolePermissions("SUPER_ADMIN", initialSuperAdminPerms);
    throw error;
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  });
