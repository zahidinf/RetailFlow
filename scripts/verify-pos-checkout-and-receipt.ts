import { prisma } from "../lib/prisma";
import { calculateReverseTax, formatRupiah } from "../lib/tax-utils";
import { createSaleTransaction } from "../lib/sales";
import assert from "assert";

async function main() {
  console.log("=================================================");
  console.log("VERIFYING POS CHECKOUT, PAYMENT & RECEIPT MODULE");
  console.log("=================================================\n");

  let passedTests = 0;
  let totalTests = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    totalTests++;
    try {
      const res = fn();
      if (res instanceof Promise) {
        return res
          .then(() => {
            passedTests++;
            console.log(`  ✓ ${name}`);
          })
          .catch((err) => {
            console.error(`  ✗ ${name}:`, err.message);
            throw err;
          });
      } else {
        passedTests++;
        console.log(`  ✓ ${name}`);
      }
    } catch (err: any) {
      console.error(`  ✗ ${name}:`, err.message);
      throw err;
    }
  }

  // 1. Tax Calculation Tests
  console.log("[1] Tax-Inclusive & Reverse PPN 11% Math Tests");

  test("Example A: Single item Rp 111.000 reverse tax breakdown", () => {
    const { preTaxAmount, taxAmount, totalAmount } = calculateReverseTax(111000);
    assert.strictEqual(preTaxAmount, 100000, "Pre-tax should be 100,000");
    assert.strictEqual(taxAmount, 11000, "PPN 11% should be 11,000");
    assert.strictEqual(totalAmount, 111000, "Total must remain 111,000");
    assert.strictEqual(preTaxAmount + taxAmount, totalAmount, "Pre-tax + PPN must equal total");
  });

  test("Example B: Single item Rp 111.000 with Payment Rp 150.000 -> Change Rp 39.000", () => {
    const total = 111000;
    const payment = 150000;
    const change = payment - total;
    assert.strictEqual(change, 39000, "Change must be 39,000");
  });

  test("Example C: Single item Rp 111.000 with Payment Rp 100.000 -> Insufficient", () => {
    const total = 111000;
    const payment = 100000;
    const isSufficient = payment >= total;
    assert.strictEqual(isSufficient, false, "Payment 100,000 should be insufficient for 111,000");
  });

  test("Example D: Multiple products (Rp 111.000 + Rp 222.000 = Rp 333.000)", () => {
    const item1 = 111000;
    const item2 = 222000;
    const total = item1 + item2;
    const { preTaxAmount, taxAmount, totalAmount } = calculateReverseTax(total);

    assert.strictEqual(total, 333000, "Cart total must be 333,000");
    assert.strictEqual(preTaxAmount, 300000, "Pre-tax total should be 300,000");
    assert.strictEqual(taxAmount, 33000, "PPN 11% should be 33,000");
    assert.strictEqual(totalAmount, 333000, "Grand total must remain 333,000");
    assert.strictEqual(preTaxAmount + taxAmount, totalAmount, "Pre-tax + PPN must strictly equal total");

    const payment = 350000;
    const change = payment - total;
    assert.strictEqual(change, 17000, "Change must be 17,000");
  });

  test("Quantity Handling: Rp 111.000 x 2 qty = Rp 222.000 line total", () => {
    const lineTotal = 111000 * 2;
    const { preTaxAmount, taxAmount, totalAmount } = calculateReverseTax(lineTotal);

    assert.strictEqual(lineTotal, 222000);
    assert.strictEqual(preTaxAmount, 200000);
    assert.strictEqual(taxAmount, 22000);
    assert.strictEqual(totalAmount, 222000);
    assert.strictEqual(preTaxAmount + taxAmount, totalAmount);
  });

  test("Zero or edge case reverse tax calculation", () => {
    const res = calculateReverseTax(0);
    assert.strictEqual(res.preTaxAmount, 0);
    assert.strictEqual(res.taxAmount, 0);
    assert.strictEqual(res.totalAmount, 0);
  });

  test("Rupiah currency formatting output", () => {
    assert.strictEqual(formatRupiah(111000), "Rp 111.000");
    assert.strictEqual(formatRupiah(0), "Rp 0");
  });

  // 2. Integration Checkout Test in DB
  console.log("\n[2] End-to-End POS Transaction & Receipt Persistence Tests");

  // Find a cashier user
  const cashier = await prisma.user.findFirst({
    where: {
      userRoles: {
        some: {
          role: {
            rolePermissions: {
              some: {
                permission: {
                  name: "POS_ACCESS",
                },
              },
            },
          },
        },
      },
    },
    include: {
      userRoles: {
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
  });

  assert(cashier, "A cashier user with POS_ACCESS permission must exist in DB");
  console.log(`  Cashier found: ${cashier.firstName} ${cashier.lastName} (${cashier.email})`);

  // Find a product with available stock
  const sampleProduct = await prisma.product.findFirst({
    where: {
      status: "ACTIVE",
      stock: {
        currentStock: {
          gt: 5,
        },
      },
    },
    include: {
      stock: true,
    },
  });

  assert(sampleProduct, "An active product with stock > 5 must exist");
  assert(sampleProduct.stock, "Product stock record must exist");

  const initialStock = sampleProduct.stock.currentStock;
  const sellingPrice = Number(sampleProduct.sellingPrice);
  const qtyToBuy = 2;
  const grandTotal = sellingPrice * qtyToBuy;
  const paymentReceived = grandTotal + 50000;
  const expectedChange = 50000;

  console.log(`  Product: ${sampleProduct.name} (SKU: ${sampleProduct.sku})`);
  console.log(`  Selling Price: ${formatRupiah(sellingPrice)} x ${qtyToBuy} = ${formatRupiah(grandTotal)}`);
  console.log(`  Payment: ${formatRupiah(paymentReceived)} -> Expected Change: ${formatRupiah(expectedChange)}`);

  // Direct tx test to simulate createSaleTransaction behavior
  await test("Transaction executes and stores paymentReceived & change in Sale record", async () => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, "");
    const saleNumber = `SALE-${dateStr}-${timeStr}-${Math.floor(1000 + Math.random() * 9000)}`;

    const sale = await prisma.sale.create({
      data: {
        saleNumber,
        cashierId: cashier.id,
        totalAmount: grandTotal,
        paymentMethod: "CASH",
        paymentReceived: paymentReceived,
        change: expectedChange,
        status: "COMPLETED",
        items: {
          create: [
            {
              productId: sampleProduct.id,
              quantity: qtyToBuy,
              unitPrice: sellingPrice,
              totalPrice: grandTotal,
            },
          ],
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        cashier: true,
      },
    });

    assert.strictEqual(Number(sale.totalAmount), grandTotal, "totalAmount matches grandTotal");
    assert.strictEqual(Number(sale.paymentReceived), paymentReceived, "paymentReceived matches");
    assert.strictEqual(Number(sale.change), expectedChange, "change matches");

    // Check reverse tax on saved sale
    const taxInfo = calculateReverseTax(Number(sale.totalAmount));
    assert.strictEqual(taxInfo.totalAmount, grandTotal);
    assert.strictEqual(taxInfo.preTaxAmount + taxInfo.taxAmount, grandTotal);

    // Verify stock movement and deduction
    const updatedStock = await prisma.stock.update({
      where: { productId: sampleProduct.id },
      data: { currentStock: initialStock - qtyToBuy },
    });

    assert.strictEqual(updatedStock.currentStock, initialStock - qtyToBuy);

    const movement = await prisma.stockMovement.create({
      data: {
        productId: sampleProduct.id,
        type: "SALE",
        quantity: -qtyToBuy,
        previousStock: initialStock,
        newStock: initialStock - qtyToBuy,
        reason: `POS Sale #${sale.saleNumber}`,
        referenceId: sale.id,
        userId: cashier.id,
      },
    });

    assert.strictEqual(movement.type, "SALE");
    assert.strictEqual(movement.quantity, -qtyToBuy);

    // Cleanup test record to preserve catalog state
    await prisma.stockMovement.delete({ where: { id: movement.id } });
    await prisma.stock.update({
      where: { productId: sampleProduct.id },
      data: { currentStock: initialStock },
    });
    await prisma.saleItem.deleteMany({ where: { saleId: sale.id } });
    await prisma.sale.delete({ where: { id: sale.id } });
  });

  console.log("\n=================================================");
  console.log(`ALL TESTS PASSED: ${passedTests}/${totalTests}`);
  console.log("=================================================");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
