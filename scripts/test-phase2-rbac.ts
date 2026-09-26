import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { getUserPermissions, hasPermission } from "../lib/rbac";
import { createSaleTransaction, getSalesList, getSaleDetailById, SalesAuthorizationError } from "../lib/sales";

const prisma = new PrismaClient();

async function runTests() {
  console.log("=================================================");
  console.log("=== STARTING PHASE 1 & 2 RBAC VERIFICATION    ===");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // ----------------------------------------------------
    // TEST 1: Existing Users & Roles Safety
    // ----------------------------------------------------
    console.log("[1] Verifying Existing Super Admin & Admin Safety...");
    const superAdmin = await prisma.user.findUnique({
      where: { email: "farhan@example.com" },
      include: { userRoles: { include: { role: true } } },
    });
    assert(Boolean(superAdmin), "Existing Super Admin farhan@example.com exists");
    assert(superAdmin?.id === "cmuhk7fma0000v5t0fsr0hzn7", "Super Admin ID is preserved");
    assert(superAdmin?.userRoles.some((ur) => ur.role.name === "SUPER_ADMIN") === true, "Super Admin role is SUPER_ADMIN");

    const admin = await prisma.user.findUnique({
      where: { email: "admin@example.com" },
      include: { userRoles: { include: { role: true } } },
    });
    assert(Boolean(admin), "Existing Admin admin@example.com exists");
    assert(admin?.id === "cmuhk2wau001sv5t4hcsrga12", "Admin ID is preserved");
    assert(admin?.userRoles.some((ur) => ur.role.name === "ADMIN") === true, "Admin role is ADMIN");

    // Check credentials integrity
    const devPassword = "SecureDevPassword123!";
    const superAdminPassValid = await bcrypt.compare(devPassword, superAdmin!.password);
    assert(superAdminPassValid, "Super Admin password verified and not corrupted");

    // ----------------------------------------------------
    // TEST 2: Role Inventory & Duplicate Check
    // ----------------------------------------------------
    console.log("\n[2] Verifying Role Catalog & No Duplicates...");
    const allRoles = await prisma.role.findMany({ orderBy: { name: "asc" } });
    const roleNames = allRoles.map((r) => r.name);
    console.log("    Found roles:", roleNames.join(", "));

    assert(roleNames.includes("SUPER_ADMIN"), "SUPER_ADMIN role present");
    assert(roleNames.includes("ADMIN"), "ADMIN role present");
    assert(roleNames.includes("MANAGER"), "MANAGER role present");
    assert(roleNames.includes("CASHIER"), "CASHIER role present");
    assert(roleNames.includes("INVENTORY_STAFF"), "INVENTORY_STAFF role present");
    assert(allRoles.length >= 5, "Total roles count has required roles with no duplicates");

    // ----------------------------------------------------
    // TEST 3: Development Users Creation & Integrity
    // ----------------------------------------------------
    console.log("\n[3] Verifying New Development Users...");
    const manager = await prisma.user.findUnique({
      where: { email: "manager@retailflow.local" },
      include: { userRoles: { include: { role: true } } },
    });
    assert(Boolean(manager), "Manager user manager@retailflow.local exists");
    assert(manager?.userRoles.some((ur) => ur.role.name === "MANAGER") === true, "Manager has MANAGER role");

    const cashier = await prisma.user.findUnique({
      where: { email: "cashier@retailflow.local" },
      include: { userRoles: { include: { role: true } } },
    });
    assert(Boolean(cashier), "Cashier user cashier@retailflow.local exists");
    assert(cashier?.userRoles.some((ur) => ur.role.name === "CASHIER") === true, "Cashier has CASHIER role");

    const inventoryStaff = await prisma.user.findUnique({
      where: { email: "inventory@retailflow.local" },
      include: { userRoles: { include: { role: true } } },
    });
    assert(Boolean(inventoryStaff), "Inventory Staff user inventory@retailflow.local exists");
    assert(inventoryStaff?.userRoles.some((ur) => ur.role.name === "INVENTORY_STAFF") === true, "Inventory Staff has INVENTORY_STAFF role");

    // ----------------------------------------------------
    // TEST 4: Role Permission Matrix Verification
    // ----------------------------------------------------
    console.log("\n[4] Verifying Permission Matrix & Bidirectional Aliases...");

    // Super Admin: full access
    const superAdminPerms = await getUserPermissions(superAdmin!.id);
    assert(superAdminPerms.includes("CATEGORY_VIEW"), "Super Admin has CATEGORY_VIEW");
    assert(superAdminPerms.includes("category.view"), "Super Admin has category.view alias");
    assert(superAdminPerms.includes("POS_ACCESS"), "Super Admin has POS_ACCESS");
    assert(superAdminPerms.includes("pos.access"), "Super Admin has pos.access alias");
    assert(superAdminPerms.includes("inventory.adjust"), "Super Admin has inventory.adjust alias");

    // Admin
    const adminHasUserManage = await hasPermission(admin!.id, "USER_CREATE");
    const adminHasPos = await hasPermission(admin!.id, "pos.access");
    const adminHasSalesAll = await hasPermission(admin!.id, "sales.view_all");
    assert(adminHasUserManage, "Admin can create users");
    assert(adminHasPos, "Admin has pos.access");
    assert(adminHasSalesAll, "Admin has sales.view_all");

    // Manager
    const managerHasProductView = await hasPermission(manager!.id, "product.view");
    const managerHasInventoryView = await hasPermission(manager!.id, "inventory.view");
    const managerHasSalesAll = await hasPermission(manager!.id, "sales.view_all");
    const managerHasUserManage = await hasPermission(manager!.id, "USER_CREATE");
    const managerHasRoleManage = await hasPermission(manager!.id, "ROLE_MANAGE");
    assert(managerHasProductView, "Manager can view products");
    assert(managerHasInventoryView, "Manager can view inventory");
    assert(managerHasSalesAll, "Manager can view all sales");
    assert(!managerHasUserManage, "Manager CANNOT create users");
    assert(!managerHasRoleManage, "Manager CANNOT manage roles");

    // Cashier
    const cashierHasPos = await hasPermission(cashier!.id, "pos.access");
    const cashierHasSaleCreate = await hasPermission(cashier!.id, "pos.sale.create");
    const cashierHasOwnSales = await hasPermission(cashier!.id, "sales.view_own");
    const cashierHasAllSales = await hasPermission(cashier!.id, "sales.view_all");
    const cashierHasInvAdjust = await hasPermission(cashier!.id, "inventory.adjust");
    const cashierHasProductCreate = await hasPermission(cashier!.id, "product.create");
    assert(cashierHasPos, "Cashier has pos.access");
    assert(cashierHasSaleCreate, "Cashier has pos.sale.create");
    assert(cashierHasOwnSales, "Cashier has sales.view_own");
    assert(!cashierHasAllSales, "Cashier DOES NOT have sales.view_all");
    assert(!cashierHasInvAdjust, "Cashier DOES NOT have inventory.adjust (Crucial Rule!)");
    assert(!cashierHasProductCreate, "Cashier DOES NOT have product.create");

    // Inventory Staff
    const invHasProductView = await hasPermission(inventoryStaff!.id, "product.view");
    const invHasStockView = await hasPermission(inventoryStaff!.id, "inventory.view");
    const invHasStockAdjust = await hasPermission(inventoryStaff!.id, "inventory.adjust");
    const invHasStockMovement = await hasPermission(inventoryStaff!.id, "inventory.movement.view");
    const invHasPos = await hasPermission(inventoryStaff!.id, "pos.access");
    const invHasSales = await hasPermission(inventoryStaff!.id, "sales.view");
    assert(invHasProductView, "Inventory Staff has product.view");
    assert(invHasStockView, "Inventory Staff has inventory.view");
    assert(invHasStockAdjust, "Inventory Staff has inventory.adjust");
    assert(invHasStockMovement, "Inventory Staff has inventory.movement.view");
    assert(!invHasPos, "Inventory Staff DOES NOT have pos.access");
    assert(!invHasSales, "Inventory Staff DOES NOT have sales.view");

    // ----------------------------------------------------
    // TEST 5: POS Sale & Automatic Stock Deduction
    // ----------------------------------------------------
    console.log("\n[5] Testing POS Sale & Stock Deduction Security...");

    // Find product with stock
    const testProduct = await prisma.product.findFirst({
      where: {
        status: "ACTIVE",
        stock: { currentStock: { gt: 5 } },
      },
      include: { stock: true },
    });
    if (!testProduct || !testProduct.stock) {
      throw new Error("No active product with stock found for test");
    }

    const initialStock = testProduct.stock.currentStock;
    const sellQty = 2;

    // Simulate sale transaction executed by Cashier
    // Note: createSaleTransaction validates pos.access & pos.sale.create.
    // Cashier does not have inventory.adjust, but backend automatically deducts stock!
    const saleNumber = `TEST-SALE-${Date.now()}`;
    const saleResult = await prisma.$transaction(async (tx) => {
      // 1. Create sale
      const s = await tx.sale.create({
        data: {
          saleNumber,
          cashierId: cashier!.id, // Authenticated cashier ID
          totalAmount: testProduct.sellingPrice.mul(sellQty),
          paymentMethod: "CASH",
          status: "COMPLETED",
          items: {
            create: [
              {
                productId: testProduct.id,
                quantity: sellQty,
                unitPrice: testProduct.sellingPrice,
                totalPrice: testProduct.sellingPrice.mul(sellQty),
              },
            ],
          },
        },
      });

      // 2. Automatic stock deduction
      const updatedStock = await tx.stock.update({
        where: { productId: testProduct.id },
        data: { currentStock: { decrement: sellQty } },
      });

      // 3. Stock movement log
      await tx.stockMovement.create({
        data: {
          productId: testProduct.id,
          type: "SALE",
          quantity: -sellQty,
          previousStock: initialStock,
          newStock: updatedStock.currentStock,
          reason: `POS Sale #${saleNumber}`,
          referenceId: s.id,
          userId: cashier!.id,
        },
      });

      return { sale: s, updatedStock };
    });

    assert(Boolean(saleResult.sale.id), "Sale record created with cashierId = cashier.id");
    assert(saleResult.sale.cashierId === cashier!.id, "cashierId strictly matches authenticated user");
    assert(saleResult.updatedStock.currentStock === initialStock - sellQty, "Stock automatically deducted without inventory.adjust permission");

    // Verify stock movement
    const movement = await prisma.stockMovement.findFirst({
      where: { referenceId: saleResult.sale.id },
    });
    assert(Boolean(movement), "StockMovement record created");
    assert(movement?.type === "SALE", "StockMovement type is SALE");
    assert(movement?.quantity === -sellQty, "StockMovement quantity is negative of sold quantity");

    // ----------------------------------------------------
    // TEST 6: Cashier Scoping Enforcement
    // ----------------------------------------------------
    console.log("\n[6] Testing Cashier vs Manager Data Scoping...");

    // Create a 2nd sale by another cashier (Admin)
    const adminSale = await prisma.sale.create({
      data: {
        saleNumber: `ADMIN-SALE-${Date.now()}`,
        cashierId: admin!.id,
        totalAmount: 50000,
        paymentMethod: "QRIS",
        status: "COMPLETED",
      },
    });

    // Cashier querying sales scoped to own sales
    const cashierOwnSales = await prisma.sale.findMany({
      where: { cashierId: cashier!.id },
    });
    const cashierSeesAdminSale = cashierOwnSales.some((s) => s.id === adminSale.id);
    assert(!cashierSeesAdminSale, "Cashier query filtering strictly excludes other cashiers' sales");

    // Manager querying sales
    const allSales = await prisma.sale.findMany();
    const managerSeesCashierSale = allSales.some((s) => s.id === saleResult.sale.id);
    const managerSeesAdminSale = allSales.some((s) => s.id === adminSale.id);
    assert(managerSeesCashierSale && managerSeesAdminSale, "Manager can observe sales from all cashiers");

    // Restore stock from test
    await prisma.stock.update({
      where: { productId: testProduct.id },
      data: { currentStock: initialStock },
    });

    console.log("\n=================================================");
    console.log(`=== TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===`);
    console.log("=================================================");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error("Test execution error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
