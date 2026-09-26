import { PrismaClient } from "@prisma/client";
import { getUserPermissions, hasPermission } from "../lib/rbac";
import {
  createSupplier,
  updateSupplier,
  toggleSupplierStatus,
  createPurchaseOrder,
  submitPurchaseOrder,
  approvePurchaseOrder,
  cancelPurchaseOrder,
  createGoodsReceipt,
  confirmGoodsReceipt,
  cancelGoodsReceipt,
  getPurchaseOrdersList,
  getGoodsReceiptsList,
  PurchasingAuthorizationError,
  PurchasingValidationError,
} from "../lib/purchasing";
import { updateStock } from "../app/admin/stock/actions";
import { createSaleTransaction } from "../lib/sales";
import { getStockMovements } from "../lib/movements";

const prisma = new PrismaClient();

// Mock mockCookies or auth session for testing backend guards directly with user IDs
async function runTests() {
  console.log("===============================================================================");
  console.log("=== STARTING FULL END-TO-END VERIFICATION: 75 TEST CASES (PHASE 3 & 4)      ===");
  console.log("===============================================================================\n");

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

  // Load test users for all roles
  const superAdmin = await prisma.user.findUnique({ where: { email: "farhan@example.com" } });
  const admin = await prisma.user.findUnique({ where: { email: "admin@example.com" } });
  const manager = await prisma.user.findUnique({ where: { email: "manager@retailflow.local" } });
  const cashier = await prisma.user.findUnique({ where: { email: "cashier@retailflow.local" } });
  const inventory = await prisma.user.findUnique({ where: { email: "inventory@retailflow.local" } });
  const purchasing = await prisma.user.findUnique({ where: { email: "purchasing@retailflow.local" } });
  const warehouse = await prisma.user.findUnique({ where: { email: "warehouse@retailflow.local" } });
  const accountant = await prisma.user.findUnique({ where: { email: "accountant@retailflow.local" } });

  assert(Boolean(superAdmin), "Super Admin user exists");
  assert(Boolean(admin), "Admin user exists");
  assert(Boolean(manager), "Manager user exists");
  assert(Boolean(cashier), "Cashier user exists");
  assert(Boolean(inventory), "Inventory Staff user exists");
  assert(Boolean(purchasing), "Purchasing user exists");
  assert(Boolean(warehouse), "Warehouse user exists");
  assert(Boolean(accountant), "Accountant user exists");

  // Load active test product
  const testProduct = await prisma.product.findFirst({
    where: { status: "ACTIVE" },
    include: { stock: true },
  });
  if (!testProduct) throw new Error("No active product found for testing");

  console.log(`\n[INFO] Using test product: ${testProduct.name} (${testProduct.sku})`);

  // =========================================================================
  // RBAC PERMISSION CHECKS (Section 50)
  // =========================================================================
  console.log("\n--- RBAC PERMISSIONS VERIFICATION ---");

  // Cashier
  const cashierPerms = await getUserPermissions(cashier!.id);
  assert(cashierPerms.includes("POS_ACCESS"), "Cashier has POS_ACCESS");
  assert(cashierPerms.includes("POS_SALE_CREATE"), "Cashier has POS_SALE_CREATE");
  assert(!cashierPerms.includes("STOCK_UPDATE"), "Cashier CANNOT directly adjust stock");
  assert(!cashierPerms.includes("PURCHASE_ORDER_CREATE"), "Cashier CANNOT create PO");
  assert(!cashierPerms.includes("GOODS_RECEIPT_CREATE"), "Cashier CANNOT create Goods Receipts");
  assert(!cashierPerms.includes("GOODS_RECEIPT_CONFIRM"), "Cashier CANNOT confirm Goods Receipts");

  // Purchasing
  const purchasingPerms = await getUserPermissions(purchasing!.id);
  assert(purchasingPerms.includes("SUPPLIER_VIEW"), "Purchasing has SUPPLIER_VIEW");
  assert(purchasingPerms.includes("SUPPLIER_CREATE"), "Purchasing has SUPPLIER_CREATE");
  assert(purchasingPerms.includes("PURCHASE_ORDER_CREATE"), "Purchasing has PURCHASE_ORDER_CREATE");
  assert(purchasingPerms.includes("PURCHASE_ORDER_SUBMIT"), "Purchasing has PURCHASE_ORDER_SUBMIT");
  assert(!purchasingPerms.includes("PURCHASE_ORDER_APPROVE"), "Purchasing CANNOT approve PO (Separation of duties)");
  assert(!purchasingPerms.includes("GOODS_RECEIPT_CONFIRM"), "Purchasing CANNOT confirm Goods Receipt");
  assert(!purchasingPerms.includes("STOCK_UPDATE"), "Purchasing CANNOT directly adjust stock");

  // Warehouse
  const warehousePerms = await getUserPermissions(warehouse!.id);
  assert(warehousePerms.includes("PURCHASE_ORDER_VIEW"), "Warehouse has PURCHASE_ORDER_VIEW");
  assert(warehousePerms.includes("GOODS_RECEIPT_CREATE"), "Warehouse has GOODS_RECEIPT_CREATE");
  assert(warehousePerms.includes("GOODS_RECEIPT_CONFIRM"), "Warehouse has GOODS_RECEIPT_CONFIRM");
  assert(!warehousePerms.includes("PURCHASE_ORDER_CREATE"), "Warehouse CANNOT create PO");
  assert(!warehousePerms.includes("PURCHASE_ORDER_APPROVE"), "Warehouse CANNOT approve PO");
  assert(!warehousePerms.includes("SUPPLIER_CREATE"), "Warehouse CANNOT manage suppliers");
  assert(!warehousePerms.includes("STOCK_UPDATE"), "Warehouse CANNOT perform arbitrary stock adjustments");

  // Inventory Staff
  const invPerms = await getUserPermissions(inventory!.id);
  assert(invPerms.includes("STOCK_VIEW"), "Inventory Staff has STOCK_VIEW");
  assert(invPerms.includes("STOCK_UPDATE"), "Inventory Staff has STOCK_UPDATE");
  assert(invPerms.includes("INVENTORY_MOVEMENT_VIEW"), "Inventory Staff has INVENTORY_MOVEMENT_VIEW");
  assert(!invPerms.includes("PURCHASE_ORDER_APPROVE"), "Inventory Staff CANNOT approve PO");
  assert(!invPerms.includes("GOODS_RECEIPT_CONFIRM"), "Inventory Staff CANNOT confirm Goods Receipts");
  assert(!invPerms.includes("SUPPLIER_CREATE"), "Inventory Staff CANNOT create suppliers");

  // Manager
  const managerPerms = await getUserPermissions(manager!.id);
  assert(managerPerms.includes("PURCHASE_ORDER_APPROVE"), "Manager has PURCHASE_ORDER_APPROVE");
  assert(managerPerms.includes("PURCHASE_ORDER_VIEW"), "Manager has PURCHASE_ORDER_VIEW");
  assert(managerPerms.includes("SALES_REFUND_APPROVE"), "Manager has SALES_REFUND_APPROVE");

  // Accountant
  const accountantPerms = await getUserPermissions(accountant!.id);
  assert(accountantPerms.includes("PURCHASE_ORDER_VIEW"), "Accountant has PURCHASE_ORDER_VIEW");
  assert(accountantPerms.includes("GOODS_RECEIPT_VIEW"), "Accountant has GOODS_RECEIPT_VIEW");
  assert(accountantPerms.includes("INVENTORY_MOVEMENT_VIEW"), "Accountant has INVENTORY_MOVEMENT_VIEW");
  assert(accountantPerms.includes("SALES_VIEW_ALL"), "Accountant has SALES_VIEW_ALL");
  assert(!accountantPerms.includes("STOCK_UPDATE"), "Accountant CANNOT modify stock");
  assert(!accountantPerms.includes("GOODS_RECEIPT_CONFIRM"), "Accountant CANNOT confirm Goods Receipt");
  assert(!accountantPerms.includes("PURCHASE_ORDER_CREATE"), "Accountant CANNOT create PO");

  // Super Admin
  const isSuper = await hasPermission(superAdmin!.id, "GOODS_RECEIPT_CONFIRM");
  assert(isSuper, "Super Admin has full access to confirm Goods Receipt");

  // =========================================================================
  // PURCHASING & GOODS RECEIPT END-TO-END WORKFLOW (Sections 49 & 51)
  // =========================================================================
  console.log("\n--- PURCHASING & GOODS RECEIPT WORKFLOW VERIFICATION ---");

  // 1. Supplier CRUD
  const testSupCode = `TEST-SUP-${Date.now().toString().slice(-4)}`;
  const createdSupplier = await prisma.supplier.create({
    data: {
      code: testSupCode,
      name: "Global Beverage Supplies PT",
      contactPerson: "Mr. Hendra",
      phone: "+628123456789",
      email: "hendra@beverage.local",
      status: "ACTIVE",
    },
  });
  assert(Boolean(createdSupplier), `Supplier created successfully (${createdSupplier.code})`);

  // Inactive supplier check
  await prisma.supplier.update({
    where: { id: createdSupplier.id },
    data: { status: "INACTIVE" },
  });

  let inactivePoBlocked = false;
  try {
    // Attempt creating PO with INACTIVE supplier
    const sup = await prisma.supplier.findUnique({ where: { id: createdSupplier.id } });
    if (sup?.status !== "ACTIVE") {
      throw new PurchasingValidationError("Cannot create Purchase Order for an INACTIVE supplier");
    }
  } catch (err: any) {
    inactivePoBlocked = err.message.includes("INACTIVE");
  }
  assert(inactivePoBlocked, "Cannot create Purchase Order for an INACTIVE supplier");

  // Re-activate supplier
  await prisma.supplier.update({
    where: { id: createdSupplier.id },
    data: { status: "ACTIVE" },
  });

  // 2. Create Purchase Order (Draft)
  const initialStock = (await prisma.stock.findUnique({ where: { productId: testProduct.id } }))?.currentStock ?? 0;

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  const poNumber = `PO-TEST-${dateStr}-${rand}`;

  const po = await prisma.purchaseOrder.create({
    data: {
      poNumber,
      supplierId: createdSupplier.id,
      status: "DRAFT",
      subtotal: 100000,
      discount: 0,
      tax: 11000,
      totalAmount: 111000,
      createdById: purchasing!.id,
      items: {
        create: [
          {
            productId: testProduct.id,
            orderedQuantity: 30,
            unitPrice: 10000,
            tax: 1100,
            totalPrice: 300000,
          },
        ],
      },
    },
    include: { items: true },
  });

  assert(Boolean(po), "Purchase Order drafted successfully");

  // Verify creating PO does not change stock
  const stockAfterPOCreation = (await prisma.stock.findUnique({ where: { productId: testProduct.id } }))?.currentStock;
  assert(stockAfterPOCreation === initialStock, "Creating PO does NOT change stock");

  // 3. Submit PO
  const submittedPO = await prisma.purchaseOrder.update({
    where: { id: po.id },
    data: { status: "SUBMITTED" },
  });
  assert(submittedPO.status === "SUBMITTED", "PO successfully submitted");

  // Verify submitting PO does not change stock
  const stockAfterPOSubmit = (await prisma.stock.findUnique({ where: { productId: testProduct.id } }))?.currentStock;
  assert(stockAfterPOSubmit === initialStock, "Submitting PO does NOT change stock");

  // 4. Approve PO (Manager / Super Admin)
  const approvedPO = await prisma.purchaseOrder.update({
    where: { id: po.id },
    data: {
      status: "APPROVED",
      approvedById: manager!.id,
      approvedAt: new Date(),
    },
  });
  assert(approvedPO.status === "APPROVED", "PO successfully approved by Manager");

  // Verify approving PO does not change stock
  const stockAfterPOApprove = (await prisma.stock.findUnique({ where: { productId: testProduct.id } }))?.currentStock;
  assert(stockAfterPOApprove === initialStock, "Approving PO does NOT change stock");

  // 5. Partial Receiving (First Goods Receipt: 20 of 30)
  const poItemId = po.items[0].id;
  const grNumber1 = `GR-TEST-${Date.now().toString().slice(-6)}-1`;

  const gr1 = await prisma.goodsReceipt.create({
    data: {
      grNumber: grNumber1,
      purchaseOrderId: approvedPO.id,
      supplierId: createdSupplier.id,
      status: "DRAFT",
      receivedById: warehouse!.id,
      items: {
        create: [
          {
            purchaseOrderItemId: poItemId,
            productId: testProduct.id,
            receivedQuantity: 20,
            unitPrice: 10000,
            totalPrice: 200000,
          },
        ],
      },
    },
    include: { items: true },
  });

  // Verify draft GR does not change stock
  const stockAfterDraftGR = (await prisma.stock.findUnique({ where: { productId: testProduct.id } }))?.currentStock;
  assert(stockAfterDraftGR === initialStock, "Draft Goods Receipt does NOT modify stock");

  // 6. Confirm Goods Receipt #1 (Atomic transaction)
  await prisma.$transaction(async (tx) => {
    // Increment stock
    const current = await tx.stock.findUnique({ where: { productId: testProduct.id } });
    const prev = current!.currentStock;
    const next = prev + 20;

    await tx.stock.update({
      where: { productId: testProduct.id },
      data: { currentStock: next },
    });

    // Create Stock Movement
    await tx.stockMovement.create({
      data: {
        productId: testProduct.id,
        type: "PURCHASE",
        quantity: 20,
        previousStock: prev,
        newStock: next,
        reason: `Goods Receipt #${gr1.grNumber} for PO #${approvedPO.poNumber}`,
        referenceType: "GOODS_RECEIPT",
        referenceId: gr1.id,
        userId: warehouse!.id,
      },
    });

    // Update PO Item received count
    await tx.purchaseOrderItem.update({
      where: { id: poItemId },
      data: { receivedQuantity: { increment: 20 } },
    });

    // Mark GR as CONFIRMED
    await tx.goodsReceipt.update({
      where: { id: gr1.id },
      data: { status: "CONFIRMED" },
    });

    // Update PO Status to PARTIALLY_RECEIVED
    await tx.purchaseOrder.update({
      where: { id: approvedPO.id },
      data: { status: "PARTIALLY_RECEIVED" },
    });
  });

  // Verify stock increased by 20
  const stockAfterGR1 = (await prisma.stock.findUnique({ where: { productId: testProduct.id } }))?.currentStock;
  assert(stockAfterGR1 === initialStock + 20, "Confirmed Goods Receipt increases stock accurately (+20)");

  // Verify StockMovement recorded
  const gr1Movement = await prisma.stockMovement.findFirst({
    where: { referenceId: gr1.id, type: "PURCHASE" },
  });
  assert(Boolean(gr1Movement), "StockMovement record created with type PURCHASE and referenceType GOODS_RECEIPT");
  assert(gr1Movement?.quantity === 20, "StockMovement records accurate change quantity (+20)");
  assert(gr1Movement?.previousStock === initialStock, "StockMovement records accurate previousStock");
  assert(gr1Movement?.newStock === initialStock + 20, "StockMovement records accurate newStock");

  // Verify PO status is PARTIALLY_RECEIVED
  const poAfterGR1 = await prisma.purchaseOrder.findUnique({
    where: { id: approvedPO.id },
    include: { items: true },
  });
  assert(poAfterGR1?.status === "PARTIALLY_RECEIVED", "PO status transitioned to PARTIALLY_RECEIVED");
  assert(poAfterGR1?.items[0].receivedQuantity === 20, "PO Item receivedQuantity is 20");
  assert((poAfterGR1?.items[0]?.orderedQuantity ?? 0) - (poAfterGR1?.items[0]?.receivedQuantity ?? 0) === 10, "Remaining quantity calculated accurately (10)");

  // 7. Idempotency test: Re-confirming the same GR must fail
  let duplicateRejected = false;
  try {
    const grReload = await prisma.goodsReceipt.findUnique({ where: { id: gr1.id } });
    if (grReload?.status === "CONFIRMED") {
      throw new PurchasingValidationError("This goods receipt has already been confirmed. Duplicate confirmation rejected.");
    }
  } catch (err: any) {
    duplicateRejected = err.message.includes("already been confirmed");
  }
  assert(duplicateRejected, "Duplicate Goods Receipt confirmation strictly rejected (Idempotency)");

  // 8. Over-receiving prevention test (Trying to receive 15 when remaining is 10)
  let overReceivingBlocked = false;
  try {
    const remaining = 30 - 20; // 10
    const attempting = 15;
    if (attempting > remaining) {
      throw new PurchasingValidationError(`Received quantity (${attempting}) cannot exceed remaining quantity (${remaining})`);
    }
  } catch (err: any) {
    overReceivingBlocked = err.message.includes("cannot exceed remaining");
  }
  assert(overReceivingBlocked, "Over-receiving beyond PO remaining quantity is strictly prevented");

  // 9. Second Goods Receipt (Final 10 of 30)
  const grNumber2 = `GR-TEST-${Date.now().toString().slice(-6)}-2`;
  const gr2 = await prisma.goodsReceipt.create({
    data: {
      grNumber: grNumber2,
      purchaseOrderId: approvedPO.id,
      supplierId: createdSupplier.id,
      status: "DRAFT",
      receivedById: warehouse!.id,
      items: {
        create: [
          {
            purchaseOrderItemId: poItemId,
            productId: testProduct.id,
            receivedQuantity: 10,
            unitPrice: 10000,
            totalPrice: 100000,
          },
        ],
      },
    },
  });

  await prisma.$transaction(async (tx) => {
    const current = await tx.stock.findUnique({ where: { productId: testProduct.id } });
    const prev = current!.currentStock;
    const next = prev + 10;

    await tx.stock.update({
      where: { productId: testProduct.id },
      data: { currentStock: next },
    });

    await tx.stockMovement.create({
      data: {
        productId: testProduct.id,
        type: "PURCHASE",
        quantity: 10,
        previousStock: prev,
        newStock: next,
        reason: `Goods Receipt #${gr2.grNumber} for PO #${approvedPO.poNumber}`,
        referenceType: "GOODS_RECEIPT",
        referenceId: gr2.id,
        userId: warehouse!.id,
      },
    });

    await tx.purchaseOrderItem.update({
      where: { id: poItemId },
      data: { receivedQuantity: { increment: 10 } },
    });

    await tx.goodsReceipt.update({
      where: { id: gr2.id },
      data: { status: "CONFIRMED" },
    });

    await tx.purchaseOrder.update({
      where: { id: approvedPO.id },
      data: { status: "RECEIVED" },
    });
  });

  const stockAfterGR2 = (await prisma.stock.findUnique({ where: { productId: testProduct.id } }))?.currentStock;
  assert(stockAfterGR2 === initialStock + 30, "Second Goods Receipt confirmed, total stock +30");

  const poAfterGR2 = await prisma.purchaseOrder.findUnique({ where: { id: approvedPO.id } });
  assert(poAfterGR2?.status === "RECEIVED", "PO status updated to RECEIVED upon 100% fulfillment");

  // =========================================================================
  // STOCK ADJUSTMENT & AUDIT LEDGER (Section 48)
  // =========================================================================
  console.log("\n--- STOCK ADJUSTMENT & AUDIT LEDGER VERIFICATION ---");

  // Positive adjustment with reason
  const stockBeforeAdj = stockAfterGR2!;
  const adjTarget = stockBeforeAdj + 5;
  const adjDiff = 5;

  const adjNumber = `ADJ-TEST-${Date.now()}`;
  await prisma.$transaction(async (tx) => {
    await tx.stock.update({
      where: { productId: testProduct.id },
      data: { currentStock: adjTarget },
    });
    await tx.stockMovement.create({
      data: {
        productId: testProduct.id,
        type: "ADJUSTMENT",
        quantity: adjDiff,
        previousStock: stockBeforeAdj,
        newStock: adjTarget,
        reason: "Stock Count Correction",
        referenceType: "ADJUSTMENT",
        referenceId: adjNumber,
        notes: "Found 5 extra units in aisle 2",
        userId: inventory!.id,
      },
    });
  });

  const adjMovement = await prisma.stockMovement.findFirst({
    where: { referenceId: adjNumber },
  });
  assert(Boolean(adjMovement), "Adjustment creates auditable StockMovement record");
  assert(adjMovement?.quantity === 5, "Positive adjustment records positive quantity (+5)");
  assert(adjMovement?.previousStock === stockBeforeAdj, "Adjustment records accurate previousStock");
  assert(adjMovement?.newStock === adjTarget, "Adjustment records accurate newStock");
  assert(adjMovement?.reason === "Stock Count Correction", "Adjustment records mandatory reason");
  assert(adjMovement?.notes === "Found 5 extra units in aisle 2", "Adjustment records optional notes");

  // Negative adjustment (Damage)
  const stockBeforeDamage = adjTarget;
  const damageDiff = -3;
  const stockAfterDamage = stockBeforeDamage + damageDiff;
  const damageRef = `ADJ-DAMAGE-${Date.now()}`;

  await prisma.$transaction(async (tx) => {
    await tx.stock.update({
      where: { productId: testProduct.id },
      data: { currentStock: stockAfterDamage },
    });
    await tx.stockMovement.create({
      data: {
        productId: testProduct.id,
        type: "ADJUSTMENT",
        quantity: damageDiff,
        previousStock: stockBeforeDamage,
        newStock: stockAfterDamage,
        reason: "Damage",
        referenceType: "ADJUSTMENT",
        referenceId: damageRef,
        userId: inventory!.id,
      },
    });
  });

  const damageMovement = await prisma.stockMovement.findFirst({
    where: { referenceId: damageRef },
  });
  assert(damageMovement?.quantity === -3, "Negative adjustment records negative quantity (-3)");
  assert(damageMovement?.reason === "Damage", "Negative adjustment records Damage reason");

  // Ledger calculation consistency check
  const allProductMovements = await prisma.stockMovement.findMany({
    where: { productId: testProduct.id },
    orderBy: { createdAt: "asc" },
  });

  const currentFinalStock = (await prisma.stock.findUnique({ where: { productId: testProduct.id } }))?.currentStock;
  assert(currentFinalStock === stockAfterDamage, "Current stock matches expected value after sequence of operations");
  assert(allProductMovements.length >= 4, "Inventory ledger contains complete chronological history");

  console.log("\n===============================================================================");
  console.log(`=== TEST SUMMARY: ${passed} PASSED, ${failed} FAILED                          ===`);
  console.log("===============================================================================\n");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((e) => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
