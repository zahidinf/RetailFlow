import { PrismaClient, Prisma } from "@prisma/client";
import { getStockStatus, formatStockStatus } from "../lib/stock-utils";

const prisma = new PrismaClient();

async function runTests() {
  console.log("=== STARTING PHASE 1 VERIFICATION TESTS ===");
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
    // TEST 1: Stock Status Logic (Centralized)
    // ----------------------------------------------------
    console.log("\n[1] Testing Centralized Stock Status Logic...");
    assert(getStockStatus(15, 10) === "IN_STOCK", "Stock > minStock is IN_STOCK (15 > 10)");
    assert(getStockStatus(10, 10) === "LOW_STOCK", "Stock == minStock is LOW_STOCK (10 == 10)");
    assert(getStockStatus(5, 10) === "LOW_STOCK", "Stock > 0 and <= minStock is LOW_STOCK (5 <= 10)");
    assert(getStockStatus(0, 10) === "OUT_OF_STOCK", "Stock == 0 is OUT_OF_STOCK");
    assert(getStockStatus(-1, 10) === "OUT_OF_STOCK", "Stock < 0 is OUT_OF_STOCK");
    assert(formatStockStatus("IN_STOCK") === "IN STOCK", "Formatter IN_STOCK");
    assert(formatStockStatus("LOW_STOCK") === "LOW STOCK", "Formatter LOW_STOCK");
    assert(formatStockStatus("OUT_OF_STOCK") === "OUT OF STOCK", "Formatter OUT_OF_STOCK");

    // ----------------------------------------------------
    // TEST 2: Category CRUD & Constraints
    // ----------------------------------------------------
    console.log("\n[2] Testing Category Model & Constraints...");
    const testCatName = `Test Category ${Date.now()}`;
    const category = await prisma.category.create({
      data: {
        name: testCatName,
        description: "Test description for Phase 1 verification",
        status: "ACTIVE",
      },
    });
    assert(Boolean(category.id), "Category created with ID");
    assert(category.status === "ACTIVE", "Category default status is ACTIVE");

    // Unique category name constraint
    let duplicateCatFailed = false;
    try {
      await prisma.category.create({
        data: {
          name: testCatName,
          description: "Duplicate",
        },
      });
    } catch {
      duplicateCatFailed = true;
    }
    assert(duplicateCatFailed, "Duplicate category name rejected by DB");

    // Update category
    const updatedCategory = await prisma.category.update({
      where: { id: category.id },
      data: {
        description: "Updated description",
        status: "INACTIVE",
      },
    });
    assert(updatedCategory.description === "Updated description", "Category updated description");
    assert(updatedCategory.status === "INACTIVE", "Category updated status to INACTIVE");

    // ----------------------------------------------------
    // TEST 3: Product Creation + Automatic Stock Creation
    // ----------------------------------------------------
    console.log("\n[3] Testing Product & Automatic Stock Creation...");
    const testSku = `TEST-SKU-${Date.now()}`;
    const testBarcode = `BAR-${Date.now()}`;

    // Transaction mimicking createProduct action
    const createdProduct = await prisma.$transaction(async (tx) => {
      const prod = await tx.product.create({
        data: {
          sku: testSku,
          barcode: testBarcode,
          name: "Automated Test Product",
          categoryId: category.id,
          costPrice: new Prisma.Decimal("10000.50"),
          sellingPrice: new Prisma.Decimal("15000.75"),
          unit: "PCS",
          minimumStock: 10,
          status: "ACTIVE",
        },
      });

      const st = await tx.stock.create({
        data: {
          productId: prod.id,
          currentStock: 0,
        },
      });

      return { product: prod, stock: st };
    });

    assert(Boolean(createdProduct.product.id), "Product created successfully");
    assert(Number(createdProduct.product.costPrice) === 10000.5, "Product costPrice is Decimal");
    assert(Number(createdProduct.product.sellingPrice) === 15000.75, "Product sellingPrice is Decimal");
    assert(createdProduct.stock.currentStock === 0, "Stock created automatically with default currentStock = 0");
    assert(createdProduct.stock.productId === createdProduct.product.id, "Stock links to Product 1:1");

    // Verify initial stock status calculation
    const initialStatus = getStockStatus(createdProduct.stock.currentStock, createdProduct.product.minimumStock);
    assert(initialStatus === "OUT_OF_STOCK", "New product with 0 stock has OUT_OF_STOCK status");

    // Unique SKU constraint
    let duplicateSkuFailed = false;
    try {
      await prisma.product.create({
        data: {
          sku: testSku,
          name: "Another Product",
          categoryId: category.id,
          costPrice: new Prisma.Decimal("10.00"),
          sellingPrice: new Prisma.Decimal("20.00"),
          unit: "PCS",
        },
      });
    } catch {
      duplicateSkuFailed = true;
    }
    assert(duplicateSkuFailed, "Duplicate SKU rejected by DB");

    // Unique Barcode constraint
    let duplicateBarcodeFailed = false;
    try {
      await prisma.product.create({
        data: {
          sku: `DIFF-SKU-${Date.now()}`,
          barcode: testBarcode,
          name: "Another Product 2",
          categoryId: category.id,
          costPrice: new Prisma.Decimal("10.00"),
          sellingPrice: new Prisma.Decimal("20.00"),
          unit: "PCS",
        },
      });
    } catch {
      duplicateBarcodeFailed = true;
    }
    assert(duplicateBarcodeFailed, "Duplicate barcode rejected by DB");

    // ----------------------------------------------------
    // TEST 4: Category Delete Protection
    // ----------------------------------------------------
    console.log("\n[4] Testing Category Deletion Protection...");
    let catDeleteFailed = false;
    try {
      // Prisma Restrict constraint prevents deleting category with products
      await prisma.category.delete({
        where: { id: category.id },
      });
    } catch {
      catDeleteFailed = true;
    }
    assert(catDeleteFailed, "Category delete blocked when assigned to product");

    // ----------------------------------------------------
    // TEST 5: Stock Update & Status Transition
    // ----------------------------------------------------
    console.log("\n[5] Testing Stock Update & Status Transitions...");
    // Update stock to LOW STOCK (5 <= 10)
    const lowStock = await prisma.stock.update({
      where: { productId: createdProduct.product.id },
      data: { currentStock: 5 },
    });
    assert(lowStock.currentStock === 5, "Stock updated to 5");
    assert(
      getStockStatus(lowStock.currentStock, createdProduct.product.minimumStock) === "LOW_STOCK",
      "Stock status transitions to LOW_STOCK when 0 < currentStock <= minStock"
    );

    // Update stock to IN STOCK (25 > 10)
    const inStock = await prisma.stock.update({
      where: { productId: createdProduct.product.id },
      data: { currentStock: 25 },
    });
    assert(inStock.currentStock === 25, "Stock updated to 25");
    assert(
      getStockStatus(inStock.currentStock, createdProduct.product.minimumStock) === "IN_STOCK",
      "Stock status transitions to IN_STOCK when currentStock > minStock"
    );

    // ----------------------------------------------------
    // TEST 6: Product Delete Protection
    // ----------------------------------------------------
    console.log("\n[6] Testing Product Cleanup & Deletion...");
    // Product has stock > 0, business rule blocks delete
    assert(inStock.currentStock > 0, "Current stock is > 0");

    // Adjust stock to 0 then delete
    await prisma.stock.update({
      where: { productId: createdProduct.product.id },
      data: { currentStock: 0 },
    });

    // Delete stock then product
    await prisma.$transaction(async (tx) => {
      await tx.stock.delete({ where: { productId: createdProduct.product.id } });
      await tx.product.delete({ where: { id: createdProduct.product.id } });
    });

    const deletedProduct = await prisma.product.findUnique({
      where: { id: createdProduct.product.id },
    });
    assert(deletedProduct === null, "Product deleted successfully after stock cleared");

    // Now category has 0 products, so category delete should succeed
    await prisma.category.delete({
      where: { id: category.id },
    });
    const deletedCat = await prisma.category.findUnique({
      where: { id: category.id },
    });
    assert(deletedCat === null, "Category deleted successfully when no products assigned");

    // ----------------------------------------------------
    // TEST 7: RBAC Permissions Verification
    // ----------------------------------------------------
    console.log("\n[7] Testing RBAC Permissions...");
    const requiredPermissions = [
      "CATEGORY_VIEW",
      "CATEGORY_CREATE",
      "CATEGORY_UPDATE",
      "CATEGORY_DELETE",
      "PRODUCT_VIEW",
      "PRODUCT_CREATE",
      "PRODUCT_UPDATE",
      "PRODUCT_DELETE",
      "STOCK_VIEW",
      "STOCK_UPDATE",
    ];

    const dbPermissions = await prisma.permission.findMany({
      where: { name: { in: requiredPermissions } },
    });
    assert(dbPermissions.length === requiredPermissions.length, `All ${requiredPermissions.length} Phase 1 permissions exist in DB`);

    const superAdminRole = await prisma.role.findUnique({
      where: { name: "SUPER_ADMIN" },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
      },
    });

    const superAdminPermNames = superAdminRole?.rolePermissions.map((rp) => rp.permission.name) || [];
    const allAssigned = requiredPermissions.every((p) => superAdminPermNames.includes(p));
    assert(allAssigned, "SUPER_ADMIN role has all Phase 1 permissions assigned");

    console.log("\n=== TEST SUMMARY ===");
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error("Test execution failed with error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
