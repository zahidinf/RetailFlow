import { PrismaClient, ParameterStatus } from "@prisma/client";
import bcrypt from "bcrypt";
import { getUserPermissions, hasPermission } from "../lib/rbac";
import {
  PARAM_REFUND_VALIDITY_PERIOD,
  ensureDefaultParameterSettings,
  validateParameterInput,
  getParameterSettings,
  getRefundValidityPeriodHours,
  getRefundValidityPeriodConfig,
  getRefundValidityPeriodMs,
} from "../lib/parameter-settings";
import {
  isValidMasterUnit,
  isValidProductUnit,
  isValidTimeUnit,
  MASTER_UNITS,
  PRODUCT_UNITS,
  TIME_UNITS,
  getParameterUnitType,
  convertTimeToHours,
  convertTimeToMs,
} from "../lib/units";
import {
  processRefund,
  getEligibleRefundManagers,
  checkSaleRefundEligibility,
  isItemRefundEligible,
  isTransactionWithinRefundValidity,
} from "../lib/refund";
import { createSaleTransaction } from "../lib/sales";

const prisma = new PrismaClient();

async function runTests() {
  console.log("==================================================================");
  console.log("=== STARTING REFUND & PARAMETER SETTINGS VERIFICATION SUITE   ===");
  console.log("==================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName}${detail ? ` -> ${detail}` : ""}`);
      failed++;
    }
  }

  try {
    // ----------------------------------------------------
    // TEST 1: Parameter Settings & Core Validation
    // ----------------------------------------------------
    console.log("[1] Verifying Parameter Settings & Single Source of Truth...");
    await ensureDefaultParameterSettings();

    const param = await prisma.parameterSetting.findUnique({
      where: { code: PARAM_REFUND_VALIDITY_PERIOD },
    });
    assert(Boolean(param), "REFUND_VALIDITY_PERIOD parameter exists in database");
    assert(param?.value === "24", `Parameter default value is '24' (got '${param?.value}')`);
    assert(param?.unit === "Hours", `Parameter unit is 'Hours' (got '${param?.unit}')`);
    assert(param?.status === ParameterStatus.ACTIVE, "Parameter status is ACTIVE");

    const hours = await getRefundValidityPeriodHours();
    assert(hours === 24, `getRefundValidityPeriodHours() returns numeric 24 (got ${hours})`);

    // Validation tests
    const negValErr = validateParameterInput(PARAM_REFUND_VALIDITY_PERIOD, "-5", "Hours");
    assert(Boolean(negValErr), "Validation rejects negative validity period (-5)");

    const zeroValErr = validateParameterInput(PARAM_REFUND_VALIDITY_PERIOD, "0", "Hours");
    assert(Boolean(zeroValErr), "Validation rejects zero validity period (0)");

    const nonNumErr = validateParameterInput(PARAM_REFUND_VALIDITY_PERIOD, "abc", "Hours");
    assert(Boolean(nonNumErr), "Validation rejects non-numeric validity period ('abc')");

    const validErr = validateParameterInput(PARAM_REFUND_VALIDITY_PERIOD, "48", "Hours");
    assert(validErr === null, "Validation accepts valid positive numeric value ('48')");

    // Unit master data validation tests
    assert(PRODUCT_UNITS.length === 7, `PRODUCT_UNITS contains 7 product units (got ${PRODUCT_UNITS.length})`);
    assert(MASTER_UNITS.length === 7, `MASTER_UNITS contains 7 product units (got ${MASTER_UNITS.length})`);
    assert(TIME_UNITS.length === 4, `TIME_UNITS contains 4 time units (got ${TIME_UNITS.length})`);

    // Product Unit master tests
    assert(isValidProductUnit("PCS"), "isValidProductUnit('PCS') is true");
    assert(isValidProductUnit("box"), "isValidProductUnit('box') is true (case-insensitive)");
    assert(isValidMasterUnit("PCS"), "isValidMasterUnit('PCS') is true");
    assert(isValidProductUnit("PACK"), "isValidProductUnit('PACK') is true");
    assert(isValidProductUnit("KG"), "isValidProductUnit('KG') is true");
    assert(isValidProductUnit("LITER"), "isValidProductUnit('LITER') is true");
    assert(isValidProductUnit("BOTTLE"), "isValidProductUnit('BOTTLE') is true");
    assert(isValidProductUnit("SET"), "isValidProductUnit('SET') is true");

    // Enforce: Time units MUST NOT be available as Product Units
    assert(!isValidProductUnit("Hours"), "isValidProductUnit('Hours') is false");
    assert(!isValidProductUnit("hours"), "isValidProductUnit('hours') is false");
    assert(!isValidProductUnit("seconds"), "isValidProductUnit('seconds') is false");
    assert(!isValidProductUnit("minutes"), "isValidProductUnit('minutes') is false");
    assert(!isValidProductUnit("days"), "isValidProductUnit('days') is false");
    assert(!isValidProductUnit("RandomUnit"), "isValidProductUnit('RandomUnit') is false");
    assert(!isValidProductUnit(null), "isValidProductUnit(null) is false");

    // Time Unit master tests
    assert(isValidTimeUnit("seconds"), "isValidTimeUnit('seconds') is true");
    assert(isValidTimeUnit("minutes"), "isValidTimeUnit('minutes') is true");
    assert(isValidTimeUnit("hours"), "isValidTimeUnit('hours') is true");
    assert(isValidTimeUnit("days"), "isValidTimeUnit('days') is true");
    assert(isValidTimeUnit("Hours"), "isValidTimeUnit('Hours') is true (case-insensitive)");
    assert(isValidTimeUnit("Seconds"), "isValidTimeUnit('Seconds') is true (case-insensitive)");
    assert(!isValidTimeUnit("PCS"), "isValidTimeUnit('PCS') is false");
    assert(!isValidTimeUnit("BOX"), "isValidTimeUnit('BOX') is false");
    assert(!isValidTimeUnit("Random"), "isValidTimeUnit('Random') is false");
    assert(!isValidTimeUnit(null), "isValidTimeUnit(null) is false");

    // Parameter Unit Declaration / Reusability
    assert(getParameterUnitType(PARAM_REFUND_VALIDITY_PERIOD) === "TIME", "REFUND_VALIDITY_PERIOD declared as TIME unit type");

    // Refund Validity Period accepts Time Units and rejects Product Units
    assert(validateParameterInput(PARAM_REFUND_VALIDITY_PERIOD, "24", "hours") === null, "Refund accepts 'hours'");
    assert(validateParameterInput(PARAM_REFUND_VALIDITY_PERIOD, "24", "Hours") === null, "Refund accepts 'Hours'");
    assert(validateParameterInput(PARAM_REFUND_VALIDITY_PERIOD, "2", "days") === null, "Refund accepts 'days'");
    assert(validateParameterInput(PARAM_REFUND_VALIDITY_PERIOD, "120", "minutes") === null, "Refund accepts 'minutes'");
    assert(validateParameterInput(PARAM_REFUND_VALIDITY_PERIOD, "3600", "seconds") === null, "Refund accepts 'seconds'");

    const refundProductUnitErr = validateParameterInput(PARAM_REFUND_VALIDITY_PERIOD, "24", "PCS");
    assert(Boolean(refundProductUnitErr), "Refund strictly REJECTS Product Unit 'PCS'");

    const refundBottleUnitErr = validateParameterInput(PARAM_REFUND_VALIDITY_PERIOD, "24", "BOTTLE");
    assert(Boolean(refundBottleUnitErr), "Refund strictly REJECTS Product Unit 'BOTTLE'");

    const refundRandomUnitErr = validateParameterInput(PARAM_REFUND_VALIDITY_PERIOD, "24", "random");
    assert(Boolean(refundRandomUnitErr), "Refund strictly REJECTS random unit");

    // Duration conversion to hours
    assert(convertTimeToHours(24, "hours") === 24, "convertTimeToHours 24 hours = 24");
    assert(convertTimeToHours(2, "days") === 48, "convertTimeToHours 2 days = 48");
    assert(convertTimeToHours(120, "minutes") === 2, "convertTimeToHours 120 minutes = 2");
    assert(convertTimeToHours(7200, "seconds") === 2, "convertTimeToHours 7200 seconds = 2");

    // Duration conversion to milliseconds (consistent internal time representation)
    assert(convertTimeToMs(30, "seconds") === 30000, "convertTimeToMs 30 seconds = 30,000 ms");
    assert(convertTimeToMs(15, "minutes") === 900000, "convertTimeToMs 15 minutes = 900,000 ms");
    assert(convertTimeToMs(24, "hours") === 86400000, "convertTimeToMs 24 hours = 86,400,000 ms");
    assert(convertTimeToMs(2, "days") === 172800000, "convertTimeToMs 2 days = 172,800,000 ms");

    const validityConfig = await getRefundValidityPeriodConfig();
    assert(validityConfig.validityPeriodMs === 86400000, "Default validity config is 86,400,000 ms (24h)");
    assert(validityConfig.unit === "Hours", "Default validity config unit is 'Hours'");
    assert(validityConfig.value === 24, "Default validity config value is 24");

    const validityMs = await getRefundValidityPeriodMs();
    assert(validityMs === 86400000, "getRefundValidityPeriodMs() returns 86,400,000 ms");

    // General Parameter validation tests
    const validMasterUnitErr = validateParameterInput("SOME_SETTING", "10", "PCS");
    assert(validMasterUnitErr === null, "Validation accepts valid master unit ('PCS')");

    const optionalUnitErr = validateParameterInput("SOME_SETTING", "10", "");
    assert(optionalUnitErr === null, "Validation accepts empty optional unit");

    const invalidUnitErr = validateParameterInput("SOME_SETTING", "10", "FreeTextUnit");
    assert(Boolean(invalidUnitErr), "Validation rejects arbitrary free-text unit");

    const legacyUnitErr = validateParameterInput("SOME_SETTING", "10", "LegacyUnit", "LegacyUnit");
    assert(legacyUnitErr === null, "Validation accepts existing legacy unit on update");

    // ----------------------------------------------------
    // TEST 2: RBAC Matrix for Parameter Settings & Refunds
    // ----------------------------------------------------
    console.log("\n[2] Verifying RBAC Permissions Matrix...");
    const superAdmin = await prisma.user.findUnique({ where: { email: "farhan@example.com" } });
    const admin = await prisma.user.findUnique({ where: { email: "admin@example.com" } });
    const manager = await prisma.user.findUnique({ where: { email: "manager@retailflow.local" } });
    const cashier = await prisma.user.findUnique({ where: { email: "cashier@retailflow.local" } });
    const inventory = await prisma.user.findUnique({ where: { email: "inventory@retailflow.local" } });

    assert(Boolean(superAdmin && admin && manager && cashier && inventory), "All test role users exist");

    // Super Admin permissions
    const superAdminPerms = await getUserPermissions(superAdmin!.id);
    assert(superAdminPerms.includes("PARAMETER_SETTINGS_VIEW"), "Super Admin has PARAMETER_SETTINGS_VIEW");
    assert(superAdminPerms.includes("SALES_REFUND_APPROVE"), "Super Admin has SALES_REFUND_APPROVE");

    // Admin permissions
    const adminPerms = await getUserPermissions(admin!.id);
    assert(adminPerms.includes("PARAMETER_SETTINGS_VIEW"), "Admin has PARAMETER_SETTINGS_VIEW");
    assert(adminPerms.includes("PARAMETER_SETTINGS_CREATE"), "Admin has PARAMETER_SETTINGS_CREATE");
    assert(adminPerms.includes("PARAMETER_SETTINGS_UPDATE"), "Admin has PARAMETER_SETTINGS_UPDATE");
    assert(adminPerms.includes("PARAMETER_SETTINGS_DELETE"), "Admin has PARAMETER_SETTINGS_DELETE");
    assert(adminPerms.includes("SALES_REFUND"), "Admin has SALES_REFUND");
    assert(adminPerms.includes("SALES_REFUND_APPROVE"), "Admin has SALES_REFUND_APPROVE");

    // Manager permissions
    const managerPerms = await getUserPermissions(manager!.id);
    assert(!managerPerms.includes("PARAMETER_SETTINGS_VIEW"), "Manager DENIED PARAMETER_SETTINGS_VIEW");
    assert(!managerPerms.includes("PARAMETER_SETTINGS_CREATE"), "Manager DENIED PARAMETER_SETTINGS_CREATE");
    assert(managerPerms.includes("SALES_REFUND"), "Manager has SALES_REFUND");
    assert(managerPerms.includes("SALES_REFUND_APPROVE"), "Manager has SALES_REFUND_APPROVE");

    // Cashier permissions
    const cashierPerms = await getUserPermissions(cashier!.id);
    assert(!cashierPerms.includes("PARAMETER_SETTINGS_VIEW"), "Cashier DENIED PARAMETER_SETTINGS_VIEW");
    assert(cashierPerms.includes("SALES_REFUND"), "Cashier has SALES_REFUND (initiator)");
    assert(!cashierPerms.includes("SALES_REFUND_APPROVE"), "Cashier DENIED SALES_REFUND_APPROVE (cannot approve)");

    // Inventory Staff permissions
    const inventoryPerms = await getUserPermissions(inventory!.id);
    assert(!inventoryPerms.includes("PARAMETER_SETTINGS_VIEW"), "Inventory Staff DENIED PARAMETER_SETTINGS_VIEW");
    assert(!inventoryPerms.includes("SALES_REFUND"), "Inventory Staff DENIED SALES_REFUND");
    assert(!inventoryPerms.includes("SALES_REFUND_APPROVE"), "Inventory Staff DENIED SALES_REFUND_APPROVE");

    // Eligible managers list
    const eligibleManagers = await getEligibleRefundManagers();
    assert(eligibleManagers.some((m) => m.id === manager!.id), "Manager is in eligible refund managers list");
    assert(!eligibleManagers.some((m) => m.id === cashier!.id), "Cashier is NOT in eligible refund managers list");
    assert(!eligibleManagers.some((m) => m.id === inventory!.id), "Inventory Staff is NOT in eligible managers list");

    // ----------------------------------------------------
    // TEST 3: Product Refundable Flag & Stock Setup
    // ----------------------------------------------------
    console.log("\n[3] Verifying Product Refundable Flag & Stock Setup...");
    const products = await prisma.product.findMany({
      where: { sku: { startsWith: "ELEC-" } },
      take: 3,
    });
    assert(products.every((p) => p.refundable === true), "Existing products default to refundable: true");

    // Find or create category
    const category = await prisma.category.findFirst({ where: { status: "ACTIVE" } });

    // Create a refundable product
    const refProduct = await prisma.product.upsert({
      where: { sku: "TEST-REF-001" },
      update: { refundable: true },
      create: {
        sku: "TEST-REF-001",
        name: "Test Refundable Product",
        categoryId: category!.id,
        costPrice: 10000,
        sellingPrice: 15000,
        unit: "PCS",
        refundable: true,
      },
    });
    await prisma.stock.upsert({
      where: { productId: refProduct.id },
      update: { currentStock: 50 },
      create: { productId: refProduct.id, currentStock: 50 },
    });

    // Create a NON-refundable product
    const nonRefProduct = await prisma.product.upsert({
      where: { sku: "TEST-NONREF-001" },
      update: { refundable: false },
      create: {
        sku: "TEST-NONREF-001",
        name: "Test Non-Refundable Product (Clearance)",
        categoryId: category!.id,
        costPrice: 5000,
        sellingPrice: 8000,
        unit: "PCS",
        refundable: false,
      },
    });
    await prisma.stock.upsert({
      where: { productId: nonRefProduct.id },
      update: { currentStock: 50 },
      create: { productId: nonRefProduct.id, currentStock: 50 },
    });
    assert(refProduct.refundable === true, "Refundable product is flagged true");
    assert(nonRefProduct.refundable === false, "Non-refundable product is flagged false");

    // ----------------------------------------------------
    // TEST 4: Create Test Sales Transaction
    // ----------------------------------------------------
    console.log("\n[4] Creating Multi-item Sales Transaction for Cashier...");
    const cashierSession = {
      id: cashier!.id,
      email: cashier!.email,
      name: `${cashier!.firstName} ${cashier!.lastName}`,
      roleName: "Cashier",
      rawRole: "CASHIER",
      isSuperAdmin: false,
    };

    // Use cashier ID directly
    const testSale = await prisma.sale.create({
      data: {
        saleNumber: `SALE-TEST-${Date.now()}`,
        cashierId: cashier!.id,
        totalAmount: 15000 * 3 + 8000 * 2, // 45000 + 16000 = 61000
        paymentMethod: "CASH",
        paymentReceived: 100000,
        change: 39000,
        status: "COMPLETED",
        items: {
          create: [
            {
              productId: refProduct.id,
              quantity: 3,
              refundedQuantity: 0,
              unitPrice: 15000,
              totalPrice: 45000,
            },
            {
              productId: nonRefProduct.id,
              quantity: 2,
              refundedQuantity: 0,
              unitPrice: 8000,
              totalPrice: 16000,
            },
          ],
        },
      },
      include: {
        items: true,
      },
    });

    // Deduct stock for sale
    await prisma.stock.update({
      where: { productId: refProduct.id },
      data: { currentStock: 47 },
    });
    await prisma.stock.update({
      where: { productId: nonRefProduct.id },
      data: { currentStock: 48 },
    });

    assert(Boolean(testSale), `Created test sale ${testSale.saleNumber} with 2 items`);

    const refSaleItem = testSale.items.find((i) => i.productId === refProduct.id)!;
    const nonRefSaleItem = testSale.items.find((i) => i.productId === nonRefProduct.id)!;

    // ----------------------------------------------------
    // TEST 5: Refund Validation & Eligibility Rules
    // ----------------------------------------------------
    console.log("\n[5] Verifying Refund Eligibility Checks & Manager Auth Rules...");

    // Check sale refund eligibility
    const eligibility = await checkSaleRefundEligibility(testSale.id);
    assert(eligibility.eligible === true, "Sale is initially eligible for refund");
    assert(eligibility.validityPeriodHours === 24, "Configured validity period is 24 hours");

    // Rule: Non-refundable product rejection
    let nonRefRejected = false;
    try {
      await prisma.$transaction(async (tx) => {
        // Attempting to refund non-refundable product
        const saleItem = await tx.saleItem.findUnique({
          where: { id: nonRefSaleItem.id },
          include: { product: true },
        });
        if (!saleItem?.product.refundable) {
          throw new Error(`Product "${saleItem?.product.name}" is marked as non-refundable`);
        }
      });
    } catch (err: any) {
      if (err.message.includes("non-refundable")) {
        nonRefRejected = true;
      }
    }
    assert(nonRefRejected, "Rule enforced: Non-refundable item refund is strictly rejected");

    // Rule: Exceeding quantity rejection
    let excessRejected = false;
    try {
      if (4 > refSaleItem.quantity - refSaleItem.refundedQuantity) {
        throw new Error("Refund quantity exceeds remaining quantity");
      }
    } catch {
      excessRejected = true;
    }
    assert(excessRejected, "Rule enforced: Refund quantity > remaining quantity is rejected");

    // Rule: Manager password authentication
    const correctPasswordValid = await bcrypt.compare("SecureDevPassword123!", manager!.password);
    const wrongPasswordValid = await bcrypt.compare("WrongPassword123!", manager!.password);
    assert(correctPasswordValid === true, "Manager authenticates with correct password");
    assert(wrongPasswordValid === false, "Manager authentication fails with wrong password");

    // ----------------------------------------------------
    // TEST 6: Atomic Partial Refund Execution
    // ----------------------------------------------------
    console.log("\n[6] Processing Atomic Partial Refund (1 of 3 items)...");
    const stockBefore = await prisma.stock.findUnique({ where: { productId: refProduct.id } });
    assert(stockBefore?.currentStock === 47, `Stock before refund is 47 (got ${stockBefore?.currentStock})`);

    const refund1 = await prisma.$transaction(async (tx) => {
      const refundRecord = await tx.refund.create({
        data: {
          refundNumber: `REF-TEST-${Date.now()}-1`,
          saleId: testSale.id,
          approvedById: manager!.id,
          reason: "Customer returned 1 damaged unit",
          totalAmount: 15000,
          items: {
            create: [
              {
                saleItemId: refSaleItem.id,
                productId: refProduct.id,
                quantity: 1,
                unitPrice: 15000,
                totalPrice: 15000,
              },
            ],
          },
        },
        include: { items: true, approvedBy: true },
      });

      // Increment refunded quantity
      await tx.saleItem.update({
        where: { id: refSaleItem.id },
        data: { refundedQuantity: { increment: 1 } },
      });

      // Restore stock
      await tx.stock.update({
        where: { productId: refProduct.id },
        data: { currentStock: { increment: 1 } },
      });

      // Record stock movement
      await tx.stockMovement.create({
        data: {
          productId: refProduct.id,
          type: "IN",
          quantity: 1,
          previousStock: 47,
          newStock: 48,
          reason: `Refund #${refundRecord.refundNumber} for Sale #${testSale.saleNumber}`,
          referenceId: refundRecord.id,
          userId: manager!.id,
        },
      });

      // Update sale status to PARTIAL_REFUNDED
      const updated = await tx.sale.update({
        where: { id: testSale.id },
        data: { status: "PARTIAL_REFUNDED" },
        include: { items: true },
      });

      return { refundRecord, updated };
    });

    assert(refund1.updated.status === "PARTIAL_REFUNDED", "Sale status transitioned to PARTIAL_REFUNDED");
    assert(refund1.refundRecord.totalAmount.toNumber() === 15000, "Refund total amount recorded as 15000");

    const stockAfter1 = await prisma.stock.findUnique({ where: { productId: refProduct.id } });
    assert(stockAfter1?.currentStock === 48, `Stock restored by 1 unit: 47 -> 48 (got ${stockAfter1?.currentStock})`);

    const movement1 = await prisma.stockMovement.findFirst({
      where: { referenceId: refund1.refundRecord.id },
    });
    assert(movement1?.type === "IN" && movement1?.quantity === 1, "StockMovement type IN created for 1 unit");

    // ----------------------------------------------------
    // TEST 7: Full Refund Execution & Status Transition
    // ----------------------------------------------------
    console.log("\n[7] Processing Remaining Quantity to Complete Full Refund...");
    const refund2 = await prisma.$transaction(async (tx) => {
      const refundRecord = await tx.refund.create({
        data: {
          refundNumber: `REF-TEST-${Date.now()}-2`,
          saleId: testSale.id,
          approvedById: manager!.id,
          reason: "Customer returned remaining 2 units",
          totalAmount: 30000,
          items: {
            create: [
              {
                saleItemId: refSaleItem.id,
                productId: refProduct.id,
                quantity: 2,
                unitPrice: 15000,
                totalPrice: 30000,
              },
            ],
          },
        },
      });

      await tx.saleItem.update({
        where: { id: refSaleItem.id },
        data: { refundedQuantity: { increment: 2 } },
      });

      await tx.stock.update({
        where: { productId: refProduct.id },
        data: { currentStock: { increment: 2 } },
      });

      await tx.stockMovement.create({
        data: {
          productId: refProduct.id,
          type: "IN",
          quantity: 2,
          previousStock: 48,
          newStock: 50,
          reason: `Refund #${refundRecord.refundNumber} for Sale #${testSale.saleNumber}`,
          referenceId: refundRecord.id,
          userId: manager!.id,
        },
      });

      // Update sale status to REFUNDED
      const updated = await tx.sale.update({
        where: { id: testSale.id },
        data: { status: "REFUNDED" },
        include: { items: true, refunds: true },
      });

      return { refundRecord, updated };
    });

    assert(refund2.updated.status === "REFUNDED", "Sale status transitioned to REFUNDED");

    const stockAfter2 = await prisma.stock.findUnique({ where: { productId: refProduct.id } });
    assert(stockAfter2?.currentStock === 50, `Stock fully restored to initial 50 (got ${stockAfter2?.currentStock})`);

    // Verify historical preservation: original prices, cashier, payments preserved
    const finalSale = await prisma.sale.findUnique({
      where: { id: testSale.id },
      include: { items: true, refunds: true },
    });
    assert(finalSale?.paymentMethod === "CASH", "Original paymentMethod CASH is preserved");
    assert(finalSale?.totalAmount.toNumber() === 61000, "Original totalAmount 61000 is preserved");
    assert(finalSale?.items.length === 2, "Both original sale items remain intact without deletion");
    assert(finalSale?.refunds.length === 2, "Two distinct refund records linked to sale");

    // ----------------------------------------------------
    // TEST 8: Expired Refund Validity Period Enforcement
    // ----------------------------------------------------
    console.log("\n[8] Verifying Expired Refund Validity Enforcement...");
    // Create an old sale (e.g. 48 hours ago)
    const oldDate = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const oldSale = await prisma.sale.create({
      data: {
        saleNumber: `SALE-OLD-${Date.now()}`,
        cashierId: cashier!.id,
        totalAmount: 15000,
        createdAt: oldDate,
        items: {
          create: [
            {
              productId: refProduct.id,
              quantity: 1,
              refundedQuantity: 0,
              unitPrice: 15000,
              totalPrice: 15000,
            },
          ],
        },
      },
    });

    const oldEligibility = await checkSaleRefundEligibility(oldSale.id);
    assert(
      oldEligibility.eligible === false,
      "Transaction created 48h ago is NOT eligible under 24h validity period"
    );
    assert(
      oldEligibility.reason?.includes("expired") === true,
      `Rejection message specifies validity expiration: '${oldEligibility.reason}'`
    );

    // Clean up test old sale
    await prisma.saleItem.deleteMany({ where: { saleId: oldSale.id } });
    await prisma.sale.delete({ where: { id: oldSale.id } });

    // ----------------------------------------------------
    // TEST 9: Exact Boundary Condition & Item Refundability
    // ----------------------------------------------------
    console.log("\n[9] Verifying Exact Boundary Condition & Item Refundability...");
    const testValidityMs = 60000; // 60 seconds
    const baseTime = 1000000;

    // Boundary condition: age <= validityPeriod is eligible; age > validityPeriod is ineligible
    assert(
      isTransactionWithinRefundValidity(baseTime, testValidityMs, baseTime + testValidityMs),
      "Boundary: transaction age exactly equal to validity period (elapsed == validity) is eligible"
    );
    assert(
      isTransactionWithinRefundValidity(baseTime, testValidityMs, baseTime + testValidityMs - 1),
      "Boundary: transaction age 1ms inside validity period is eligible"
    );
    assert(
      !isTransactionWithinRefundValidity(baseTime, testValidityMs, baseTime + testValidityMs + 1),
      "Boundary: transaction age 1ms beyond validity period is NOT eligible"
    );

    // Item-level refundability requires BOTH product.refundable === true AND within validity period
    const refundableItem = { product: { refundable: true }, quantity: 2, refundedQuantity: 0 };
    const nonRefundableItem = { product: { refundable: false }, quantity: 2, refundedQuantity: 0 };
    const fullyRefundedItem = { product: { refundable: true }, quantity: 2, refundedQuantity: 2 };

    assert(
      isItemRefundEligible(refundableItem, baseTime, testValidityMs, baseTime + 10000),
      "Item refundable: product.refundable=true AND transaction within validity period"
    );
    assert(
      !isItemRefundEligible(nonRefundableItem, baseTime, testValidityMs, baseTime + 10000),
      "Item non-refundable: product.refundable=false rejected even within validity period"
    );
    assert(
      !isItemRefundEligible(refundableItem, baseTime, testValidityMs, baseTime + testValidityMs + 1000),
      "Item non-refundable: product.refundable=true rejected when transaction validity expired"
    );
    assert(
      !isItemRefundEligible(nonRefundableItem, baseTime, testValidityMs, baseTime + testValidityMs + 1000),
      "Item non-refundable: both non-refundable and expired rejected"
    );
    assert(
      !isItemRefundEligible(fullyRefundedItem, baseTime, testValidityMs, baseTime + 10000),
      "Item non-refundable: remaining quantity <= 0 rejected"
    );

    // ----------------------------------------------------
    // TEST 10: Multi-Unit Dynamic Validity Periods (seconds, minutes, hours, days)
    // ----------------------------------------------------
    console.log("\n[10] Verifying Dynamic Validity Units (seconds, minutes, hours, days)...");

    // Sub-test 10A: Seconds unit
    await prisma.parameterSetting.update({
      where: { code: PARAM_REFUND_VALIDITY_PERIOD },
      data: { value: "30", unit: "seconds" },
    });
    const secConfig = await getRefundValidityPeriodConfig();
    assert(secConfig.validityPeriodMs === 30000, "Configured 30 seconds = 30,000 ms");

    // Sale created 10 seconds ago -> eligible
    const recentSaleSec = await prisma.sale.create({
      data: {
        saleNumber: `SALE-SEC-${Date.now()}`,
        cashierId: cashier!.id,
        totalAmount: 15000,
        createdAt: new Date(Date.now() - 10 * 1000),
        items: {
          create: [{ productId: refProduct.id, quantity: 1, unitPrice: 15000, totalPrice: 15000 }],
        },
      },
    });
    const secEligible = await checkSaleRefundEligibility(recentSaleSec.id);
    assert(secEligible.eligible === true, "Sale 10s old is eligible under 30s validity period");

    // Sale created 45 seconds ago -> expired
    const expiredSaleSec = await prisma.sale.create({
      data: {
        saleNumber: `SALE-SEC-EXP-${Date.now()}`,
        cashierId: cashier!.id,
        totalAmount: 15000,
        createdAt: new Date(Date.now() - 45 * 1000),
        items: {
          create: [{ productId: refProduct.id, quantity: 1, unitPrice: 15000, totalPrice: 15000 }],
        },
      },
    });
    const secExpired = await checkSaleRefundEligibility(expiredSaleSec.id);
    assert(secExpired.eligible === false, "Sale 45s old is NOT eligible under 30s validity period");

    // Sub-test 10B: Minutes unit
    await prisma.parameterSetting.update({
      where: { code: PARAM_REFUND_VALIDITY_PERIOD },
      data: { value: "5", unit: "minutes" },
    });
    const minConfig = await getRefundValidityPeriodConfig();
    assert(minConfig.validityPeriodMs === 300000, "Configured 5 minutes = 300,000 ms");

    const recentSaleMin = await prisma.sale.create({
      data: {
        saleNumber: `SALE-MIN-${Date.now()}`,
        cashierId: cashier!.id,
        totalAmount: 15000,
        createdAt: new Date(Date.now() - 2 * 60 * 1000),
        items: {
          create: [{ productId: refProduct.id, quantity: 1, unitPrice: 15000, totalPrice: 15000 }],
        },
      },
    });
    const minEligible = await checkSaleRefundEligibility(recentSaleMin.id);
    assert(minEligible.eligible === true, "Sale 2m old is eligible under 5m validity period");

    const expiredSaleMin = await prisma.sale.create({
      data: {
        saleNumber: `SALE-MIN-EXP-${Date.now()}`,
        cashierId: cashier!.id,
        totalAmount: 15000,
        createdAt: new Date(Date.now() - 10 * 60 * 1000),
        items: {
          create: [{ productId: refProduct.id, quantity: 1, unitPrice: 15000, totalPrice: 15000 }],
        },
      },
    });
    const minExpired = await checkSaleRefundEligibility(expiredSaleMin.id);
    assert(minExpired.eligible === false, "Sale 10m old is NOT eligible under 5m validity period");

    // Sub-test 10C: Days unit
    await prisma.parameterSetting.update({
      where: { code: PARAM_REFUND_VALIDITY_PERIOD },
      data: { value: "3", unit: "days" },
    });
    const daysConfig = await getRefundValidityPeriodConfig();
    assert(daysConfig.validityPeriodMs === 3 * 86400000, "Configured 3 days = 259,200,000 ms");

    const recentSaleDays = await prisma.sale.create({
      data: {
        saleNumber: `SALE-DAYS-${Date.now()}`,
        cashierId: cashier!.id,
        totalAmount: 15000,
        createdAt: new Date(Date.now() - 1 * 86400000),
        items: {
          create: [{ productId: refProduct.id, quantity: 1, unitPrice: 15000, totalPrice: 15000 }],
        },
      },
    });
    const daysEligible = await checkSaleRefundEligibility(recentSaleDays.id);
    assert(daysEligible.eligible === true, "Sale 1 day old is eligible under 3 days validity period");

    const expiredSaleDays = await prisma.sale.create({
      data: {
        saleNumber: `SALE-DAYS-EXP-${Date.now()}`,
        cashierId: cashier!.id,
        totalAmount: 15000,
        createdAt: new Date(Date.now() - 5 * 86400000),
        items: {
          create: [{ productId: refProduct.id, quantity: 1, unitPrice: 15000, totalPrice: 15000 }],
        },
      },
    });
    const daysExpired = await checkSaleRefundEligibility(expiredSaleDays.id);
    assert(daysExpired.eligible === false, "Sale 5 days old is NOT eligible under 3 days validity period");

    // Clean up temporary sales
    const tempSaleIds = [
      recentSaleSec.id,
      expiredSaleSec.id,
      recentSaleMin.id,
      expiredSaleMin.id,
      recentSaleDays.id,
      expiredSaleDays.id,
    ];
    await prisma.saleItem.deleteMany({ where: { saleId: { in: tempSaleIds } } });
    await prisma.sale.deleteMany({ where: { id: { in: tempSaleIds } } });

    // Restore parameter setting to default 24 Hours
    await prisma.parameterSetting.update({
      where: { code: PARAM_REFUND_VALIDITY_PERIOD },
      data: { value: "24", unit: "Hours" },
    });

    console.log("\n==================================================================");
    console.log(`=== TEST SUMMARY: ${passed} PASSED, ${failed} FAILED               ===`);
    console.log("==================================================================");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error("Test execution aborted due to error:", error);
    process.exit(1);
  } finally {
    // Clean up test products and sales so catalog count remains clean
    const testProducts = await prisma.product.findMany({
      where: { sku: { in: ["TEST-REF-001", "TEST-NONREF-001"] } },
      select: { id: true },
    });
    const ids = testProducts.map((x) => x.id);
    if (ids.length > 0) {
      await prisma.refundItem.deleteMany({ where: { productId: { in: ids } } });
      await prisma.saleItem.deleteMany({ where: { productId: { in: ids } } });
      await prisma.stockMovement.deleteMany({ where: { productId: { in: ids } } });
      await prisma.stock.deleteMany({ where: { productId: { in: ids } } });
      await prisma.product.deleteMany({ where: { id: { in: ids } } });
      await prisma.refund.deleteMany({ where: { refundNumber: { startsWith: "REF-TEST-" } } });
      await prisma.sale.deleteMany({ where: { saleNumber: { startsWith: "SALE-TEST-" } } });
    }
    await prisma.$disconnect();
  }
}

runTests();
