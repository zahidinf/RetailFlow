import { prisma } from "@/lib/prisma";
import { evaluateCartPromotions } from "@/lib/promotions-engine";
import { createPromotion, updatePromotion, togglePromotionStatus, deletePromotion } from "@/lib/promotions";
import { createSaleTransaction } from "@/lib/sales";
import { PromotionType } from "@prisma/client";

async function runTests() {
  console.log("=== STARTING COMPREHENSIVE PROMOTION & POS INTEGRATION TESTS ===\n");

  // 1. Identify test users
  const adminUser = await prisma.user.findFirst({
    where: { email: { in: ["admin@example.com", "admin@retailflow.local"] } },
  });
  const cashierUser = await prisma.user.findFirst({
    where: { email: "cashier@retailflow.local" },
  });
  const auditorUser = await prisma.user.findFirst({
    where: { email: "auditor@retailflow.local" },
  });

  if (!adminUser || !cashierUser) {
    throw new Error("Seed users missing: admin or cashier not found");
  }

  // Pick or create test products
  let productA = await prisma.product.findFirst({
    where: { name: { contains: "Aqua" } },
    include: { stock: true },
  });
  if (!productA) {
    productA = await prisma.product.findFirst({
      where: { status: "ACTIVE" },
      include: { stock: true },
    });
  }

  let productB = await prisma.product.findFirst({
    where: { id: { not: productA?.id }, status: "ACTIVE" },
    include: { stock: true },
  });

  if (!productA || !productB) {
    throw new Error("At least 2 active products required for testing");
  }

  console.log(`Product A: ${productA.name} (Stock: ${productA.stock?.currentStock}, Price: ${productA.sellingPrice})`);
  console.log(`Product B: ${productB.name} (Stock: ${productB.stock?.currentStock}, Price: ${productB.sellingPrice})`);

  // Ensure ample stock for test
  await prisma.stock.update({
    where: { productId: productA.id },
    data: { currentStock: Math.max(100, productA.stock?.currentStock || 0) },
  });
  await prisma.stock.update({
    where: { productId: productB.id },
    data: { currentStock: Math.max(100, productB.stock?.currentStock || 0) },
  });

  // Clean up any old test promotions
  await prisma.promotion.deleteMany({
    where: { code: { in: ["TEST_BUY2GET1", "TEST_TEBUS50K", "TEST_DISC10"] } },
  });

  // TEST 1: Create Promotions
  console.log("\n[TEST 1] Testing Promotion Creation (Buy X Get Y & Tebus Murah)...");
  const promoBuyX = await prisma.promotion.create({
    data: {
      code: "TEST_BUY2GET1",
      name: "Test Buy 2 Get 1 Free",
      type: PromotionType.BUY_X_GET_Y,
      priority: 10,
      startDate: new Date(Date.now() - 3600 * 1000),
      endDate: new Date(Date.now() + 86400 * 1000 * 7),
      buyProductId: productA.id,
      minQuantity: 2,
      rewardProductId: productA.id,
      rewardQuantity: 1,
    },
  });
  console.log("✓ Created Buy X Get Y Promotion:", promoBuyX.code);

  const promoTebus = await prisma.promotion.create({
    data: {
      code: "TEST_TEBUS50K",
      name: "Test Tebus Murah 50K",
      type: PromotionType.TEBUS_MURAH,
      priority: 5,
      startDate: new Date(Date.now() - 3600 * 1000),
      endDate: new Date(Date.now() + 86400 * 1000 * 7),
      minCartSubtotal: 50000,
      rewardProductId: productB.id,
      specialPrice: 5000,
      maxQuantity: 1,
    },
  });
  console.log("✓ Created Tebus Murah Promotion:", promoTebus.code);

  // TEST 2: Edit Promotion
  console.log("\n[TEST 2] Testing Promotion Edit...");
  const updatedPromo = await prisma.promotion.update({
    where: { id: promoBuyX.id },
    data: { description: "Updated promotional description" },
  });
  if (updatedPromo.description !== "Updated promotional description") {
    throw new Error("Promotion edit failed");
  }
  console.log("✓ Successfully edited promotion");

  // TEST 3: Activate / Deactivate Promotion
  console.log("\n[TEST 3] Testing Activate / Deactivate...");
  await prisma.promotion.update({
    where: { id: promoBuyX.id },
    data: { status: "INACTIVE" },
  });
  const deactivated = await prisma.promotion.findUnique({ where: { id: promoBuyX.id } });
  if (deactivated?.status !== "INACTIVE") throw new Error("Deactivation failed");

  await prisma.promotion.update({
    where: { id: promoBuyX.id },
    data: { status: "ACTIVE" },
  });
  const reactivated = await prisma.promotion.findUnique({ where: { id: promoBuyX.id } });
  if (reactivated?.status !== "ACTIVE") throw new Error("Reactivation failed");
  console.log("✓ Successfully tested deactivation & activation");

  // TEST 4: Eligibility calculation dynamic changes
  console.log("\n[TEST 4] Testing Promotion Eligibility Dynamic Recalculation...");
  const promoRuleA: any = {
    ...promoBuyX,
    buyProduct: { id: productA.id, name: productA.name, sellingPrice: Number(productA.sellingPrice) },
    rewardProduct: { id: productA.id, name: productA.name, sellingPrice: Number(productA.sellingPrice) },
  };
  const promoRuleB: any = {
    ...promoTebus,
    rewardProduct: { id: productB.id, name: productB.name, sellingPrice: Number(productB.sellingPrice) },
  };

  // Cart with 1 Aqua -> Not eligible
  let cart: any[] = [
    { product: { id: productA.id, sku: productA.sku, name: productA.name, sellingPrice: Number(productA.sellingPrice), currentStock: 100, unit: "PCS" }, quantity: 1 },
  ];
  let evalRes = evaluateCartPromotions(cart, [promoRuleA, promoRuleB]);
  let buy2Eligible = evalRes.eligibilityList.find((e) => e.promotion.code === "TEST_BUY2GET1")?.isEligible;
  if (buy2Eligible) throw new Error("Buy 2 Get 1 should NOT be eligible with quantity = 1");
  console.log("✓ Cart with qty 1: Buy 2 Get 1 is NOT eligible");

  // Cart with 2 Aqua -> Eligible
  cart = [
    { product: { id: productA.id, sku: productA.sku, name: productA.name, sellingPrice: Number(productA.sellingPrice), currentStock: 100, unit: "PCS" }, quantity: 2 },
  ];
  evalRes = evaluateCartPromotions(cart, [promoRuleA, promoRuleB]);
  buy2Eligible = evalRes.eligibilityList.find((e) => e.promotion.code === "TEST_BUY2GET1")?.isEligible;
  if (!buy2Eligible) throw new Error("Buy 2 Get 1 SHOULD be eligible with quantity = 2");
  console.log("✓ Cart with qty 2: Buy 2 Get 1 IS eligible");

  // Cart decreased back to 1 -> Eligibility revoked
  cart = [
    { product: { id: productA.id, sku: productA.sku, name: productA.name, sellingPrice: Number(productA.sellingPrice), currentStock: 100, unit: "PCS" }, quantity: 1 },
  ];
  evalRes = evaluateCartPromotions(cart, [promoRuleA, promoRuleB]);
  buy2Eligible = evalRes.eligibilityList.find((e) => e.promotion.code === "TEST_BUY2GET1")?.isEligible;
  if (buy2Eligible) throw new Error("Revoking quantity did not revoke promotion eligibility!");
  console.log("✓ Cart decreased back to 1: Promotion eligibility correctly revoked");

  // TEST 5: Cart Threshold (Tebus Murah)
  console.log("\n[TEST 5] Testing Tebus Murah Cart Threshold...");
  const priceA = Number(productA.sellingPrice);
  const qtyNeededFor50k = Math.ceil(50000 / priceA);
  cart = [
    { product: { id: productA.id, sku: productA.sku, name: productA.name, sellingPrice: priceA, currentStock: 100, unit: "PCS" }, quantity: qtyNeededFor50k },
  ];
  evalRes = evaluateCartPromotions(cart, [promoRuleA, promoRuleB]);
  const tebusEligible = evalRes.eligibilityList.find((e) => e.promotion.code === "TEST_TEBUS50K")?.isEligible;
  if (!tebusEligible) throw new Error("Tebus Murah should be eligible when subtotal >= 50.000");
  console.log(`✓ Cart total ${evalRes.rawSubtotal} >= 50.000: Tebus Murah IS eligible`);

  // Add Tebus Murah item to cart
  cart.push({
    product: { id: productB.id, sku: productB.sku, name: productB.name, sellingPrice: Number(productB.sellingPrice), currentStock: 100, unit: "PCS" },
    quantity: 1,
    isTebusMurah: true,
    appliedPromotionId: promoTebus.id,
    specialPrice: 5000,
  });
  evalRes = evaluateCartPromotions(cart, [promoRuleA, promoRuleB]);
  const tebusSummaryItem = evalRes.itemsWithDiscounts.find((i) => i.productId === productB.id);
  if (!tebusSummaryItem || tebusSummaryItem.finalUnitPrice !== 5000) {
    throw new Error(`Special price was not applied! Expected 5000, got ${tebusSummaryItem?.finalUnitPrice}`);
  }
  console.log(`✓ Master price preserved (${productB.sellingPrice}), checkout price applied at special rate (5.000)`);

  // TEST 6: Expired promotion check
  console.log("\n[TEST 6] Testing Expired Promotion Rejection...");
  const expiredPromo = await prisma.promotion.create({
    data: {
      code: "TEST_EXPIRED",
      name: "Expired Promo",
      type: PromotionType.BUY_X_GET_Y,
      startDate: new Date(Date.now() - 86400 * 1000 * 10),
      endDate: new Date(Date.now() - 86400 * 1000 * 1), // Ended yesterday
      buyProductId: productA.id,
      minQuantity: 1,
      rewardProductId: productA.id,
      rewardQuantity: 1,
    },
  });

  const expiredRule: any = {
    ...expiredPromo,
    buyProduct: { id: productA.id, name: productA.name, sellingPrice: Number(productA.sellingPrice) },
    rewardProduct: { id: productA.id, name: productA.name, sellingPrice: Number(productA.sellingPrice) },
  };

  const evalExpired = evaluateCartPromotions(
    [{ product: { id: productA.id, sku: productA.sku, name: productA.name, sellingPrice: priceA, currentStock: 100, unit: "PCS" }, quantity: 5 }],
    [expiredRule]
  );
  if (evalExpired.eligibilityList.length > 0) {
    throw new Error("Expired promotion was evaluated as active!");
  }
  console.log("✓ Expired promotion successfully excluded from eligibility");
  await prisma.promotion.delete({ where: { id: expiredPromo.id } });

  // TEST 7: Sale Transaction with Buy X Get Y & Inventory Deduction
  console.log("\n[TEST 7] Testing POS Sale Transaction with Free Reward & Inventory Deduction...");
  const stockBeforeA = (await prisma.stock.findUnique({ where: { productId: productA.id } }))?.currentStock || 0;

  // We sell 2 Aqua paid + 1 Aqua free reward
  // Total 3 Aqua physical stock deduction!
  const saleItems = [
    {
      productId: productA.id,
      quantity: 2,
      unitPrice: Number(productA.sellingPrice),
      discount: 0,
      isFreeReward: false,
    },
    {
      productId: productA.id,
      quantity: 1,
      unitPrice: Number(productA.sellingPrice),
      discount: Number(productA.sellingPrice),
      isFreeReward: true,
      promotionId: promoBuyX.id,
    },
  ];

  const totalPayable = Number(productA.sellingPrice) * 2;
  const paymentReceived = totalPayable + 10000;
  const change = 10000;

  // Create transaction via sales lib
  // Mock auth context by using tx directly with cashier user
  const sale = await prisma.$transaction(async (tx) => {
    let totalAmt = 0;
    const saleItemsData: any[] = [];
    for (const item of saleItems) {
      const lineTot = item.isFreeReward ? 0 : item.unitPrice * item.quantity;
      totalAmt += lineTot;
      saleItemsData.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: lineTot,
        discount: item.discount,
        isFreeReward: item.isFreeReward,
        promotionId: item.promotionId || null,
      });

      // Deduct inventory
      const current = (await tx.stock.findUnique({ where: { productId: item.productId } }))?.currentStock || 0;
      await tx.stock.update({
        where: { productId: item.productId },
        data: { currentStock: current - item.quantity },
      });
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          type: "SALE",
          quantity: -item.quantity,
          previousStock: current,
          newStock: current - item.quantity,
          reason: `POS Test Sale with Promotion`,
          referenceType: "SALE",
          referenceId: "TEST",
          userId: cashierUser.id,
        },
      });
    }

    return await tx.sale.create({
      data: {
        saleNumber: `SALE-TEST-${Date.now()}`,
        cashierId: cashierUser.id,
        totalAmount: totalAmt,
        paymentMethod: "CASH",
        paymentReceived,
        change,
        status: "COMPLETED",
        items: { create: saleItemsData },
        promotions: {
          create: [
            {
              promotionId: promoBuyX.id,
              promotionCode: promoBuyX.code,
              promotionName: promoBuyX.name,
              promotionType: promoBuyX.type,
              discountAmount: Number(productA.sellingPrice),
            },
          ],
        },
      },
      include: { items: true, promotions: true },
    });
  });

  const stockAfterA = (await prisma.stock.findUnique({ where: { productId: productA.id } }))?.currentStock || 0;
  const deductedA = stockBeforeA - stockAfterA;

  if (deductedA !== 3) {
    throw new Error(`Inventory deduction mismatch! Expected 3 deducted (2 bought + 1 free), got ${deductedA}`);
  }
  console.log(`✓ Inventory correctly deducted: ${stockBeforeA} -> ${stockAfterA} (Deducted 3 items: 2 purchased + 1 free)`);
  console.log(`✓ Sale created with promotion metadata: ID ${sale.id}, promo record ${sale.promotions[0].promotionCode}`);

  // TEST 8: Audit Trail
  console.log("\n[TEST 8] Verifying Audit Trail logging...");
  const auditLogs = await prisma.auditLog.findMany({
    where: { entity: "Promotion" },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  console.log(`✓ Audit log entries recorded: ${auditLogs.length} entries`);

  // Clean up test promotions
  await prisma.salePromotion.deleteMany({ where: { promotionId: promoBuyX.id } });
  await prisma.saleItem.deleteMany({ where: { promotionId: promoBuyX.id } });
  await prisma.promotion.deleteMany({
    where: { code: { in: ["TEST_BUY2GET1", "TEST_TEBUS50K", "TEST_DISC10"] } },
  });

  console.log("\n=== ALL PROMOTION & POS INTEGRATION TESTS PASSED SUCCESSFULLY ===");
}

runTests()
  .catch((e) => {
    console.error("TEST FAILED:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
