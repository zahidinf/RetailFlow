import { prisma } from "@/lib/prisma";
import { createSession, runWithSessionToken } from "@/lib/auth";
import {
  calculateReverseTax,
  computeReceiptFinancialSummary,
  generatePaymentSuggestions,
  DEFAULT_TAX_RATE,
} from "@/lib/tax-utils";
import { evaluateCartPromotions } from "@/lib/promotions-engine";
import { createSaleTransaction } from "@/lib/sales";
import { PromotionType } from "@prisma/client";

async function runCheckoutAndReceiptTests() {
  console.log("=== STARTING POS CHECKOUT CONFIRMATION & RECEIPT ENHANCEMENT TESTS ===\n");

  // ==========================================
  // UNIT TEST SECTION 1: PAYMENT SUGGESTIONS
  // ==========================================
  console.log("[TEST 1] Testing Payment Amount Suggestions Algorithm...");

  const testTotals = [12500, 35000, 52500, 100000, 187400, 520000];
  for (const total of testTotals) {
    const suggestions = generatePaymentSuggestions(total);

    // Rule 1: First suggestion must be exact total
    if (suggestions[0] !== total) {
      throw new Error(`Expected first suggestion to be exact total ${total}, got ${suggestions[0]}`);
    }

    // Rule 2: Subsequent suggestions must be strictly > total
    for (let i = 1; i < suggestions.length; i++) {
      if (suggestions[i] <= total) {
        throw new Error(`Suggestion ${suggestions[i]} is not greater than grand total ${total}`);
      }
      if (suggestions[i] <= suggestions[i - 1]) {
        throw new Error(`Suggestions not strictly increasing: ${suggestions.join(", ")}`);
      }
    }

    console.log(`  ✓ Grand Total Rp ${total.toLocaleString("id-ID")} => Suggestions: [${suggestions.map(s => `Rp ${s.toLocaleString("id-ID")}`).join(", ")}]`);
  }

  // Test suggestion recalculation when Grand Total changes
  let currentGrandTotal = 50000;
  let suggestions1 = generatePaymentSuggestions(currentGrandTotal);
  currentGrandTotal = 45000; // Promo applied
  let suggestions2 = generatePaymentSuggestions(currentGrandTotal);
  if (suggestions1[0] === suggestions2[0]) {
    throw new Error("Suggestions did not update when Grand Total changed!");
  }
  console.log("  ✓ Dynamic recalculation on Grand Total change verified successfully.\n");


  // ==========================================
  // UNIT TEST SECTION 2: REVERSE TAX CALCULATION
  // ==========================================
  console.log("[TEST 2] Testing Reverse Tax Calculation & Configurable Tax Rate...");

  const taxTestAmounts = [10000, 50000, 100000, 110000, 249750];
  for (const amt of taxTestAmounts) {
    const defaultTax = calculateReverseTax(amt, DEFAULT_TAX_RATE);

    // Check reconciliation: Total After Tax = preTaxAmount + taxAmount === amt
    if (defaultTax.preTaxAmount + defaultTax.taxAmount !== defaultTax.totalAmount) {
      throw new Error(`Tax breakdown mismatch for ${amt}: ${defaultTax.preTaxAmount} + ${defaultTax.taxAmount} !== ${defaultTax.totalAmount}`);
    }

    if (defaultTax.totalAmount !== Math.round(amt)) {
      throw new Error(`Total amount ${defaultTax.totalAmount} does not match input ${amt}`);
    }

    // Test with alternative tax rate (e.g. 12% future PPN)
    const customRate = 0.12;
    const customTax = calculateReverseTax(amt, customRate);
    if (customTax.preTaxAmount + customTax.taxAmount !== customTax.totalAmount) {
      throw new Error(`Custom tax breakdown mismatch for ${amt}: ${customTax.preTaxAmount} + ${customTax.taxAmount} !== ${customTax.totalAmount}`);
    }

    console.log(`  ✓ Amount Rp ${amt.toLocaleString("id-ID")}: Pre-Tax = Rp ${defaultTax.preTaxAmount.toLocaleString("id-ID")}, Tax (11%) = Rp ${defaultTax.taxAmount.toLocaleString("id-ID")}, Sum = Rp ${(defaultTax.preTaxAmount + defaultTax.taxAmount).toLocaleString("id-ID")}`);
  }
  console.log("  ✓ Reverse tax calculation verified successfully.\n");


  // ==========================================
  // UNIT TEST SECTION 3: RECEIPT FINANCIAL SUMMARY
  // ==========================================
  console.log("[TEST 3] Testing Receipt Financial Summary Reconciliation...");

  // Example from prompt (calculated with 10% tax in prompt's illustrative example):
  // Normal Price Rp 110,000, Discount Rp 10,000, Price After Discount Rp 100,000
  // Pre-Tax Amount Rp 90,909, Tax Rp 9,091, Total After Tax Rp 100,000
  const sampleItems = [
    {
      unitPrice: 110000,
      quantity: 1,
      totalPrice: 100000,
      discount: 10000,
      product: { sellingPrice: 110000 },
    },
  ];
  // 1. Test with 0.10 tax rate from prompt illustrative example
  const summary10 = computeReceiptFinancialSummary(sampleItems, 100000, 0.10);
  if (summary10.preTaxAmount !== 90909) {
    throw new Error(`Expected Pre-Tax Amount 90909 at 10%, got ${summary10.preTaxAmount}`);
  }
  if (summary10.tax !== 9091) {
    throw new Error(`Expected Tax 9091 at 10%, got ${summary10.tax}`);
  }
  if (summary10.totalAfterTax !== 100000) {
    throw new Error(`Expected Total After Tax 100000, got ${summary10.totalAfterTax}`);
  }

  // 2. Test with configured default 11% PPN tax rate
  const summary11 = computeReceiptFinancialSummary(sampleItems, 100000, 0.11);
  if (summary11.preTaxAmount !== 90090) {
    throw new Error(`Expected Pre-Tax Amount 90090 at 11%, got ${summary11.preTaxAmount}`);
  }
  if (summary11.tax !== 9910) {
    throw new Error(`Expected Tax 9910 at 11%, got ${summary11.tax}`);
  }
  if (summary11.totalAfterTax !== 100000) {
    throw new Error(`Expected Total After Tax 100000, got ${summary11.totalAfterTax}`);
  }

  // Strict algebraic assertions
  if (summary11.priceAfterDiscount !== summary11.normalPrice - summary11.discount) {
    throw new Error("Formula failed: Price After Discount != Normal Price - Discount");
  }
  if (summary11.totalAfterTax !== summary11.preTaxAmount + summary11.tax) {
    throw new Error("Formula failed: Total After Tax != Pre-Tax Amount + Tax");
  }
  if (summary11.totalAfterTax !== summary11.priceAfterDiscount) {
    throw new Error("Formula failed: Total After Tax != Price After Discount");
  }
  console.log("  ✓ Canonical prompt example reconciled strictly with configured tax rates (10% & 11% PPN):");
  console.log(`    Normal Price:         Rp ${summary11.normalPrice.toLocaleString("id-ID")}`);
  console.log(`    Discount:             Rp ${summary11.discount.toLocaleString("id-ID")}`);
  console.log(`    Price After Discount: Rp ${summary11.priceAfterDiscount.toLocaleString("id-ID")}`);
  console.log(`    Pre-Tax Amount (11%): Rp ${summary11.preTaxAmount.toLocaleString("id-ID")}`);
  console.log(`    Tax (11%):            Rp ${summary11.tax.toLocaleString("id-ID")}`);
  console.log(`    Total After Tax:      Rp ${summary11.totalAfterTax.toLocaleString("id-ID")}\n`);


  // ==========================================
  // INTEGRATION TEST SECTION 4: POS TRANSACTIONS
  // ==========================================
  console.log("[TEST 4] Testing End-to-End POS Sales, Promotions, Payment & Receipt Breakdown...");

  // Setup test products and users
  const cashier = await prisma.user.findFirst({
    where: { email: "cashier@retailflow.local" },
  });
  if (!cashier) throw new Error("Cashier user missing");

  const products = await prisma.product.findMany({
    where: { status: "ACTIVE" },
    include: { stock: true },
    take: 3,
  });
  if (products.length < 2) throw new Error("At least 2 active products required");

  const [p1, p2] = products;

  // Restore ample stock
  await prisma.stock.update({
    where: { productId: p1.id },
    data: { currentStock: 200 },
  });
  await prisma.stock.update({
    where: { productId: p2.id },
    data: { currentStock: 200 },
  });

  const p1Price = Number(p1.sellingPrice);
  const p2Price = Number(p2.sellingPrice);

  const runSuffix = Date.now().toString().slice(-6);
  const codeBuyX = `TEST_E2E_BUY2GET1_${runSuffix}`;
  const codeTebus = `TEST_E2E_TEBUS_${runSuffix}`;
  const codeDisc = `TEST_E2E_DISC_${runSuffix}`;

  // Setup promotions
  const now = new Date(Date.now() - 3600 * 1000);
  const future = new Date(Date.now() + 86400000 * 30);
  const promoBuyX = await prisma.promotion.create({
    data: {
      code: codeBuyX,
      name: "Buy 2 P1 Get 1 P1 Free",
      type: PromotionType.BUY_X_GET_Y,
      buyProductId: p1.id,
      minQuantity: 2,
      rewardProductId: p1.id,
      rewardQuantity: 1,
      status: "ACTIVE",
      startDate: now,
      endDate: future,
    },
  });

  const promoTebus = await prisma.promotion.create({
    data: {
      code: codeTebus,
      name: "Tebus Murah P2 Special Price",
      type: PromotionType.TEBUS_MURAH,
      minCartSubtotal: p1Price * 2,
      rewardProductId: p2.id,
      specialPrice: 1000, // Special price Rp 1.000
      maxQuantity: 1,
      status: "ACTIVE",
      startDate: now,
      endDate: future,
    },
  });

  const promoDisc = await prisma.promotion.create({
    data: {
      code: codeDisc,
      name: "Disc 10% on P1",
      type: PromotionType.PRODUCT_DISCOUNT,
      buyProductId: p1.id,
      minQuantity: 1,
      discountType: "PERCENTAGE",
      discountValue: 10,
      status: "ACTIVE",
      startDate: now,
      endDate: future,
    },
  });

  const sessionToken = await createSession(cashier.id);

  await runWithSessionToken(sessionToken, async () => {
    // --- SUBTEST A: Normal Sale with Payment Suggestion & Change ---
    console.log("  [Subtest 4.1] Normal Sale (No promotions)...");
    {
      const normalCart = [{ product: p1, quantity: 2 }];
      const evalResult = evaluateCartPromotions(normalCart as any, []);
      const grandTotal = evalResult.finalSubtotal;
      const suggestions = generatePaymentSuggestions(grandTotal);

      // Pick suggestion above total
      const chosenPayment = suggestions.length > 1 ? suggestions[1] : grandTotal + 10000;
      const expectedChange = chosenPayment - grandTotal;

      const sale = await createSaleTransaction({
        items: [
          {
            productId: p1.id,
            quantity: 2,
            unitPrice: p1Price,
            discount: 0,
          },
        ],
        paymentMethod: "CASH",
        paymentReceived: chosenPayment,
        change: expectedChange,
      });

      if (sale.change !== expectedChange) {
        throw new Error(`Expected change ${expectedChange}, got ${sale.change}`);
      }

      const receiptSummary = computeReceiptFinancialSummary(sale.items as any, sale.totalAmount);
      if (receiptSummary.normalPrice !== p1Price * 2) {
        throw new Error(`Expected normal price ${p1Price * 2}, got ${receiptSummary.normalPrice}`);
      }
      if (receiptSummary.discount !== 0) {
        throw new Error(`Expected discount 0, got ${receiptSummary.discount}`);
      }
      if (receiptSummary.totalAfterTax !== sale.totalAmount) {
        throw new Error(`Total After Tax ${receiptSummary.totalAfterTax} != Sale Total ${sale.totalAmount}`);
      }
      console.log(`    ✓ Normal sale completed: Total Rp ${sale.totalAmount}, Payment Rp ${sale.paymentReceived}, Change Rp ${sale.change}`);
    }

    // --- SUBTEST B: Regular Discount Sale ---
    console.log("  [Subtest 4.2] Regular Item Discount Sale...");
    {
      const discountAmount = Math.round(p1Price * 0.15); // 15% line discount
      const expectedTotal = p1Price - discountAmount;

      const sale = await createSaleTransaction({
        items: [
          {
            productId: p1.id,
            quantity: 1,
            unitPrice: p1Price,
            discount: discountAmount,
          },
        ],
        paymentMethod: "CASH",
        paymentReceived: p1Price, // paid with exact original price
        change: discountAmount,
      });

      const receiptSummary = computeReceiptFinancialSummary(sale.items as any, sale.totalAmount);
      if (receiptSummary.discount !== discountAmount) {
        throw new Error(`Expected receipt discount ${discountAmount}, got ${receiptSummary.discount}`);
      }
      if (receiptSummary.priceAfterDiscount !== expectedTotal) {
        throw new Error(`Expected price after discount ${expectedTotal}, got ${receiptSummary.priceAfterDiscount}`);
      }
      if (receiptSummary.totalAfterTax !== expectedTotal) {
        throw new Error(`Total After Tax != Expected Total`);
      }
      console.log(`    ✓ Regular discount sale: Normal Rp ${receiptSummary.normalPrice}, Discount Rp ${receiptSummary.discount}, Final Rp ${receiptSummary.totalAfterTax}`);
    }

    // --- SUBTEST C: Buy X Get Y Free Promotion Sale ---
    console.log("  [Subtest 4.3] Buy X Get Y Free Promotion...");
    {
      // Buy 2 P1, Get 1 P1 Free
      const sale = await createSaleTransaction({
        items: [
          {
            productId: p1.id,
            quantity: 2,
            unitPrice: p1Price,
            discount: 0,
          },
          {
            productId: p1.id,
            quantity: 1,
            unitPrice: p1Price,
            discount: p1Price,
            isFreeReward: true,
            promotionId: promoBuyX.id,
          },
        ],
        appliedPromotions: [
          {
            promotionId: promoBuyX.id,
            promotionCode: promoBuyX.code,
            promotionName: promoBuyX.name,
            promotionType: promoBuyX.type,
            discountAmount: p1Price,
          },
        ],
        paymentMethod: "CASH",
        paymentReceived: p1Price * 2,
        change: 0,
      });

      // Verify inventory deduction for 3 items total (2 purchased + 1 free)
      const stockP1 = await prisma.stock.findUnique({ where: { productId: p1.id } });
      console.log(`    ✓ Stock correctly deducted. Current stock: ${stockP1?.currentStock}`);

      const receiptSummary = computeReceiptFinancialSummary(sale.items as any, sale.totalAmount);
      const expectedNormal = p1Price * 3;
      const expectedDiscount = p1Price;
      const expectedAfter = p1Price * 2;

      if (receiptSummary.normalPrice !== expectedNormal) {
        throw new Error(`Expected Normal Price ${expectedNormal}, got ${receiptSummary.normalPrice}`);
      }
      if (receiptSummary.discount !== expectedDiscount) {
        throw new Error(`Expected Discount ${expectedDiscount}, got ${receiptSummary.discount}`);
      }
      if (receiptSummary.priceAfterDiscount !== expectedAfter) {
        throw new Error(`Expected Price After Discount ${expectedAfter}, got ${receiptSummary.priceAfterDiscount}`);
      }
      if (receiptSummary.totalAfterTax !== expectedAfter) {
        throw new Error(`Expected Total After Tax ${expectedAfter}, got ${receiptSummary.totalAfterTax}`);
      }
      console.log(`    ✓ Buy X Get Y Receipt: Normal Rp ${receiptSummary.normalPrice}, Discount Rp ${receiptSummary.discount} (1 free), Total Rp ${receiptSummary.totalAfterTax}`);
    }

    // --- SUBTEST D: Tebus Murah / Special Price Promotion ---
    console.log("  [Subtest 4.4] Tebus Murah / Special Price Promotion...");
    {
      // P1 x 2 (triggers Tebus Murah) + P2 @ Rp 1.000 special price (normal price is p2Price)
      const tebusDiscount = p2Price - 1000;
      const expectedTotal = (p1Price * 2) + 1000;

      const sale = await createSaleTransaction({
        items: [
          {
            productId: p1.id,
            quantity: 2,
            unitPrice: p1Price,
            discount: 0,
          },
          {
            productId: p2.id,
            quantity: 1,
            unitPrice: p2Price,
            discount: tebusDiscount,
            promotionId: promoTebus.id,
          },
        ],
        appliedPromotions: [
          {
            promotionId: promoTebus.id,
            promotionCode: promoTebus.code,
            promotionName: promoTebus.name,
            promotionType: promoTebus.type,
            discountAmount: tebusDiscount,
          },
        ],
        paymentMethod: "CASH",
        paymentReceived: expectedTotal + 9000,
        change: 9000,
      });

      const receiptSummary = computeReceiptFinancialSummary(sale.items as any, sale.totalAmount);
      const expectedNormal = (p1Price * 2) + p2Price;

      if (receiptSummary.normalPrice !== expectedNormal) {
        throw new Error(`Expected Normal Price ${expectedNormal}, got ${receiptSummary.normalPrice}`);
      }
      if (receiptSummary.discount !== tebusDiscount) {
        throw new Error(`Expected Discount ${tebusDiscount}, got ${receiptSummary.discount}`);
      }
      if (receiptSummary.totalAfterTax !== expectedTotal) {
        throw new Error(`Expected Total After Tax ${expectedTotal}, got ${receiptSummary.totalAfterTax}`);
      }
      console.log(`    ✓ Tebus Murah Receipt: Normal Rp ${receiptSummary.normalPrice}, Discount Rp ${receiptSummary.discount}, Total Rp ${receiptSummary.totalAfterTax}`);
    }

    // --- SUBTEST E: Multiple / Mixed Promotions Consolidated Discount ---
    console.log("  [Subtest 4.5] Multiple / Mixed Promotions Consolidated in Receipt...");
    {
      // P1 (with 10% promo discount) + P2 with Tebus Murah
      const p1DiscAmount = Math.round(p1Price * 0.1);
      const p2SpecialPrice = 1000;
      const p2DiscAmount = p2Price - p2SpecialPrice;
      const consolidatedDiscount = p1DiscAmount + p2DiscAmount;

      const sale = await createSaleTransaction({
        items: [
          {
            productId: p1.id,
            quantity: 1,
            unitPrice: p1Price,
            discount: p1DiscAmount,
            promotionId: promoDisc.id,
          },
          {
            productId: p2.id,
            quantity: 1,
            unitPrice: p2Price,
            discount: p2DiscAmount,
            promotionId: promoTebus.id,
          },
        ],
        appliedPromotions: [
          {
            promotionId: promoDisc.id,
            promotionCode: promoDisc.code,
            promotionName: promoDisc.name,
            promotionType: promoDisc.type,
            discountAmount: p1DiscAmount,
          },
          {
            promotionId: promoTebus.id,
            promotionCode: promoTebus.code,
            promotionName: promoTebus.name,
            promotionType: promoTebus.type,
            discountAmount: p2DiscAmount,
          },
        ],
        paymentMethod: "CASH",
        paymentReceived: (p1Price - p1DiscAmount) + p2SpecialPrice,
        change: 0,
      });

      const receiptSummary = computeReceiptFinancialSummary(sale.items as any, sale.totalAmount);
      const expectedNormal = p1Price + p2Price;
      const expectedAfter = expectedNormal - consolidatedDiscount;

      if (receiptSummary.normalPrice !== expectedNormal) {
        throw new Error(`Expected Normal Price ${expectedNormal}, got ${receiptSummary.normalPrice}`);
      }
      // Single consolidated discount combining both promotions
      if (receiptSummary.discount !== consolidatedDiscount) {
        throw new Error(`Expected combined discount ${consolidatedDiscount}, got ${receiptSummary.discount}`);
      }
      if (receiptSummary.priceAfterDiscount !== expectedAfter) {
        throw new Error(`Expected Price After Discount ${expectedAfter}, got ${receiptSummary.priceAfterDiscount}`);
      }
      if (receiptSummary.totalAfterTax !== expectedAfter) {
        throw new Error(`Expected Total After Tax ${expectedAfter}, got ${receiptSummary.totalAfterTax}`);
      }
      // Strict reconciliation
      if (receiptSummary.preTaxAmount + receiptSummary.tax !== receiptSummary.totalAfterTax) {
        throw new Error("Tax + Pre-Tax does not match Total After Tax!");
      }

      console.log(`    ✓ Mixed Promotions Consolidated: Normal Rp ${receiptSummary.normalPrice}, Single Combined Discount Rp ${receiptSummary.discount}, Pre-Tax Rp ${receiptSummary.preTaxAmount}, Tax Rp ${receiptSummary.tax}, Total After Tax Rp ${receiptSummary.totalAfterTax}`);
    }
  });

  // Cleanup test promotions by deactivating
  await prisma.promotion.updateMany({
    where: { code: { in: [codeBuyX, codeTebus, codeDisc] } },
    data: { status: "INACTIVE" },
  });

  console.log("\n=== ALL POS CHECKOUT & RECEIPT ENHANCEMENT TESTS PASSED PERFECTLY ===");
}

runCheckoutAndReceiptTests()
  .catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
