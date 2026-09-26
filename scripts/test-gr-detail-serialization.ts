import { prisma } from "../lib/prisma";
import { getGoodsReceiptDetail, getEligiblePOsForReceiving, serializeDecimals } from "../lib/purchasing";
import { Prisma } from "@prisma/client";

function findDecimals(obj: any, path: string = ""): string[] {
  const found: string[] = [];
  if (obj === null || obj === undefined) return found;

  if (Prisma.Decimal.isDecimal(obj)) {
    found.push(`${path}: Prisma.Decimal (${obj.toString()})`);
    return found;
  }

  if (
    typeof obj === "object" &&
    obj !== null &&
    "d" in obj &&
    "e" in obj &&
    "s" in obj &&
    typeof (obj as any).toNumber === "function"
  ) {
    found.push(`${path}: Decimal-like object (${obj.toString()})`);
    return found;
  }

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      found.push(...findDecimals(item, `${path}[${index}]`));
    });
  } else if (typeof obj === "object" && !(obj instanceof Date)) {
    for (const [key, value] of Object.entries(obj)) {
      found.push(...findDecimals(value, path ? `${path}.${key}` : key));
    }
  }

  return found;
}

async function run() {
  console.log("=== Testing Goods Receipt Detail Serialization ===");

  // Find any goods receipt in DB
  const gr = await prisma.goodsReceipt.findFirst({
    include: {
      items: true,
      purchaseOrder: true,
    },
  });

  if (!gr) {
    console.log("No Goods Receipt found in DB to test. Creating dummy data...");
    // If none exists, we test with mock data and serializeDecimals directly
    const testDecimalObj = {
      id: "test-gr",
      purchaseOrder: {
        id: "po-1",
        subtotal: new Prisma.Decimal("1000.00"),
        discount: new Prisma.Decimal("50.00"),
        tax: new Prisma.Decimal("100.00"),
        totalAmount: new Prisma.Decimal("1050.00"),
        items: [
          {
            unitPrice: new Prisma.Decimal("100.00"),
            totalPrice: new Prisma.Decimal("200.00"),
          },
        ],
      },
      items: [
        {
          unitPrice: new Prisma.Decimal("100.00"),
          totalPrice: new Prisma.Decimal("200.00"),
          product: {
            costPrice: new Prisma.Decimal("80.00"),
            sellingPrice: new Prisma.Decimal("120.00"),
          },
          purchaseOrderItem: {
            unitPrice: new Prisma.Decimal("100.00"),
            totalPrice: new Prisma.Decimal("200.00"),
          },
        },
      ],
    };

    const before = findDecimals(testDecimalObj);
    console.log(`Before serialization decimals count: ${before.length}`);
    if (before.length === 0) throw new Error("Expected test object to have decimals");

    const serialized = serializeDecimals(testDecimalObj);
    const after = findDecimals(serialized);
    console.log(`After serialization decimals count: ${after.length}`);
    if (after.length > 0) {
      throw new Error(`Found decimals after serialization: ${after.join(", ")}`);
    }
    console.log("PASS: serializeDecimals stripped all decimals successfully.");
    return;
  }

  console.log(`Found existing Goods Receipt: ${gr.grNumber} (${gr.id})`);

  // Mock session requirement by checking the receipt detail query
  const grDetail = await prisma.goodsReceipt.findUnique({
    where: { id: gr.id },
    include: {
      purchaseOrder: {
        select: {
          id: true,
          poNumber: true,
          status: true,
        },
      },
      supplier: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
      receivedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      items: {
        include: {
          product: {
            select: {
              id: true,
              sku: true,
              name: true,
              unit: true,
              stock: {
                select: {
                  currentStock: true,
                },
              },
            },
          },
          purchaseOrderItem: {
            select: {
              id: true,
              orderedQuantity: true,
              receivedQuantity: true,
              unitPrice: true,
              totalPrice: true,
            },
          },
        },
      },
    },
  });

  if (!grDetail) throw new Error("Could not find Goods Receipt");

  const formatted = serializeDecimals({
    ...grDetail,
    items: grDetail.items.map((i) => ({
      ...i,
      unitPrice: Number(i.unitPrice),
      totalPrice: Number(i.totalPrice),
      orderedQuantity: i.purchaseOrderItem.orderedQuantity,
      previouslyReceived: i.purchaseOrderItem.receivedQuantity,
      purchaseOrderItem: {
        ...i.purchaseOrderItem,
        unitPrice: Number(i.purchaseOrderItem.unitPrice),
        totalPrice: Number(i.purchaseOrderItem.totalPrice),
      },
    })),
  });

  const decimalIssues = findDecimals(formatted);
  console.log(`Decimal fields found in goods receipt detail payload: ${decimalIssues.length}`);
  if (decimalIssues.length > 0) {
    console.error("FAILED: Found Decimal objects:", decimalIssues);
    process.exit(1);
  }

  console.log("PASS: Goods receipt detail payload is 100% plain objects, no Decimal instances found!");

  // Also verify eligible POs
  const eligiblePOs = await prisma.purchaseOrder.findMany({
    where: {
      status: { in: ["APPROVED", "PARTIALLY_RECEIVED"] },
    },
    include: {
      supplier: {
        select: { id: true, code: true, name: true },
      },
      items: {
        include: {
          product: {
            select: {
              id: true,
              sku: true,
              name: true,
              unit: true,
              stock: { select: { currentStock: true } },
            },
          },
        },
      },
    },
  });

  const formattedEligible = serializeDecimals(
    eligiblePOs.map((po) => ({
      ...po,
      subtotal: Number(po.subtotal),
      discount: Number(po.discount),
      tax: Number(po.tax),
      totalAmount: Number(po.totalAmount),
      items: po.items.map((i) => ({
        ...i,
        unitPrice: Number(i.unitPrice),
        discount: Number(i.discount),
        tax: Number(i.tax),
        totalPrice: Number(i.totalPrice),
        remainingQuantity: i.orderedQuantity - i.receivedQuantity,
      })),
    }))
  );

  const poDecimalIssues = findDecimals(formattedEligible);
  console.log(`Decimal fields in eligible POs payload: ${poDecimalIssues.length}`);
  if (poDecimalIssues.length > 0) {
    console.error("FAILED: Found Decimal objects in eligible POs:", poDecimalIssues);
    process.exit(1);
  }

  console.log("PASS: Eligible POs payload is 100% plain objects, no Decimal instances found!");
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
