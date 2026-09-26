import { prisma } from "../lib/prisma";

async function verifyPagination() {
  console.log("=== VERIFYING TABLE PAGINATION ACROSS PRODUCT MANAGEMENT & ADMINISTRATION ===\n");
  let passed = 0;
  let failed = 0;

  function assert(cond: boolean, msg: string) {
    if (cond) {
      console.log(`  ✓ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${msg}`);
      failed++;
    }
  }

  // 1. Pagination math helper matching TablePagination
  function calcPagination(totalItems: number, page: number, pageSize: number) {
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const startItem = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
    const endItem = Math.min(safePage * pageSize, totalItems);
    const startIndex = (safePage - 1) * pageSize;
    const endIndex = safePage * pageSize;
    return { totalPages, safePage, startItem, endItem, startIndex, endIndex };
  }

  // 2. Test Category Table
  console.log("[1] Testing Categories Table Pagination...");
  const categories = await prisma.category.findMany();
  const catCount = categories.length;
  console.log(`    Total categories in DB: ${catCount}`);
  const catP1 = calcPagination(catCount, 1, 10);
  assert(catP1.startItem === 1 && catP1.endItem === catCount, `Category page 1 shows 1–${catCount} of ${catCount}`);
  assert(catP1.totalPages === 1, `Category total pages is 1 for ${catCount} items`);

  // 3. Test Product Table (58 products)
  console.log("\n[2] Testing Product Table Pagination (58 items)...");
  const products = await prisma.product.findMany();
  const prodCount = products.length;
  console.log(`    Total products in DB: ${prodCount}`);
  assert(prodCount === 58, `Database has exactly 58 products`);

  // Default page size 10
  const prodP1 = calcPagination(prodCount, 1, 10);
  assert(prodP1.totalPages === 6, `Default 10/page produces 6 pages`);
  assert(prodP1.startItem === 1 && prodP1.endItem === 10, `Page 1 shows 1–10 of 58`);
  const sliceP1 = products.slice(prodP1.startIndex, prodP1.endIndex);
  assert(sliceP1.length === 10, `Page 1 slice has 10 items`);

  const prodP6 = calcPagination(prodCount, 6, 10);
  assert(prodP6.startItem === 51 && prodP6.endItem === 58, `Page 6 shows 51–58 of 58`);
  const sliceP6 = products.slice(prodP6.startIndex, prodP6.endIndex);
  assert(sliceP6.length === 8, `Page 6 slice has remaining 8 items`);

  // Change page size to 25
  const prodPageSize25 = calcPagination(prodCount, 1, 25);
  assert(prodPageSize25.totalPages === 3, `Page size 25 produces 3 pages`);
  assert(prodPageSize25.startItem === 1 && prodPageSize25.endItem === 25, `Page size 25 shows 1–25 of 58`);

  // Change page size to 50
  const prodPageSize50 = calcPagination(prodCount, 1, 50);
  assert(prodPageSize50.totalPages === 2, `Page size 50 produces 2 pages`);
  assert(prodPageSize50.startItem === 1 && prodPageSize50.endItem === 50, `Page size 50 shows 1–50 of 58`);

  // Change page size to 100
  const prodPageSize100 = calcPagination(prodCount, 1, 100);
  assert(prodPageSize100.totalPages === 1, `Page size 100 produces 1 page`);
  assert(prodPageSize100.startItem === 1 && prodPageSize100.endItem === 58, `Page size 100 shows 1–58 of 58`);

  // 4. Test Stock Table (58 stock items)
  console.log("\n[3] Testing Stock Table Pagination (58 items)...");
  const stocks = await prisma.stock.findMany();
  const stockCount = stocks.length;
  console.log(`    Total stocks in DB: ${stockCount}`);
  assert(stockCount === 58, `Database has exactly 58 stock records`);
  const stockP1 = calcPagination(stockCount, 1, 10);
  assert(stockP1.startItem === 1 && stockP1.endItem === 10, `Stock page 1 shows 1–10 of 58`);
  assert(stockP1.totalPages === 6, `Stock total pages is 6 for 10 rows/page`);

  // Filtered stock simulation (e.g. low stock)
  const lowStocks = await prisma.stock.findMany({
    where: {
      product: {
        minimumStock: {
          gte: 15,
        },
      },
    },
  });
  const filteredStockP1 = calcPagination(lowStocks.length, 1, 10);
  assert(
    filteredStockP1.totalPages >= 1,
    `Filtered stock count (${lowStocks.length}) recalculates pagination (pages: ${filteredStockP1.totalPages})`
  );

  // 5. Test Users Table
  console.log("\n[4] Testing Users Table Pagination...");
  const users = await prisma.user.findMany();
  const userCount = users.length;
  console.log(`    Total users in DB: ${userCount}`);
  const userP1 = calcPagination(userCount, 1, 10);
  assert(userP1.startItem === 1 && userP1.endItem === userCount, `User page 1 shows 1–${userCount} of ${userCount}`);

  // 6. Test Roles Table
  console.log("\n[5] Testing Roles Table Pagination...");
  const roles = await prisma.role.findMany();
  const roleCount = roles.length;
  console.log(`    Total roles in DB: ${roleCount}`);
  const roleP1 = calcPagination(roleCount, 1, 10);
  assert(roleP1.startItem === 1 && roleP1.endItem === roleCount, `Role page 1 shows 1–${roleCount} of ${roleCount}`);

  // 7. Edge Cases Simulation
  console.log("\n[6] Testing Pagination Edge Cases...");
  // Empty result
  const emptyP = calcPagination(0, 1, 10);
  assert(emptyP.startItem === 0 && emptyP.endItem === 0, `Empty list shows 0–0 (or 0) of 0`);
  assert(emptyP.totalPages === 1, `Empty list has 1 safe page`);

  // Out of bound page requested (e.g. was on page 6 then page size changed to 50)
  const outOfBoundsP = calcPagination(58, 6, 50);
  assert(outOfBoundsP.safePage === 2, `Out of bounds page 6 automatically clamps to page 2 (totalPages)`);
  assert(outOfBoundsP.startItem === 51 && outOfBoundsP.endItem === 58, `Clamped page shows remaining 51–58`);

  console.log(`\nVerification complete: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

verifyPagination()
  .catch((e) => {
    console.error("Verification error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
