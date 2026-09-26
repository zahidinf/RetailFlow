import { prisma } from "../lib/prisma";

async function verify() {
  console.log("=== VERIFYING DATABASE & POS ENHANCEMENTS ===\n");
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${desc}`);
      failed++;
    }
  }

  // 1. Verify required categories exist
  console.log("[1] Checking Categories...");
  const categories = await prisma.category.findMany();
  const catNames = new Set(categories.map((c) => c.name));
  const expectedCategories = [
    "Food & Beverage",
    "Electronics",
    "Office Supplies",
    "Personal Care",
    "Household",
    "Baby & Kids",
    "Beauty",
    "Pet Supplies",
  ];
  for (const exp of expectedCategories) {
    assert(catNames.has(exp), `Category "${exp}" exists in database`);
  }

  // 2. Verify all 50 products exist
  console.log("\n[2] Checking 50 Products...");
  const expected50SKUs = [
    "BEV-AQU-600", "BEV-COK-390", "BEV-TBS-450", "BEV-SPR-390", "BEV-GDC-250",
    "FOD-IND-MG85", "FOD-IND-SM75", "FOD-IND-AB69", "FOD-POP-MGP80", "FOD-SED-GR90",
    "SNK-OREO-120", "SNK-CHT-BBQ68", "SNK-SQN-ALM65", "SNK-ROM-KLP300", "SNK-PRG-ORG107",
    "PC-LIF-450", "PC-PAN-290", "PC-PEP-190", "PC-SUN-170", "PC-DOV-100",
    "HOU-RNS-770", "HOU-SNL-755", "HOU-MLT-900", "HOU-BYG-600", "HOU-VIX-500",
    "ELE-PHI-LED9", "ELE-ENG-AA2", "ELE-PAN-AA2", "ELE-LOG-M185", "ELE-KRB-USBC",
    "STA-PIL-G2", "STA-FBC-2B", "STA-JYK-CT", "STA-BNT-A4", "STA-3M-POST3",
    "BAB-ZWT-100", "BAB-SWT-GLDM", "BAB-MAM-PNTXL", "BAB-CUS-COL100", "BAB-JHN-PWD200",
    "BTY-WRD-MIC100", "BTY-EMN-FW50", "BTY-NIV-SUN50", "BTY-GAR-MIC125", "BTY-PND-SER20",
    "PET-WHK-TUN80", "PET-MEO-TUN400", "PET-PDG-DOG400", "PET-CCZ-CAT800", "PET-VTK-TRT",
  ];

  const found50 = await prisma.product.findMany({
    where: { sku: { in: expected50SKUs } },
    include: { category: true, stock: true },
  });

  assert(found50.length === 50, `Found all 50 target products in database (${found50.length}/50)`);

  // 3. Verify all 50 products have valid categories
  const invalidCategory = found50.filter((p) => !p.category || !p.categoryId);
  assert(invalidCategory.length === 0, "All 50 products have valid associated category records");

  // 4. Verify all SKUs are unique in database
  const allProducts = await prisma.product.findMany({ select: { sku: true } });
  const skuSet = new Set(allProducts.map((p) => p.sku));
  assert(allProducts.length === skuSet.size, `All ${allProducts.length} SKUs in database are strictly unique`);

  // 5. Verify all 50 products have stock records and varied stock
  const withoutStock = found50.filter((p) => !p.stock);
  assert(withoutStock.length === 0, "All 50 products have a stock record");

  const lowStock = found50.filter((p) => (p.stock?.currentStock ?? 0) <= p.minimumStock);
  assert(lowStock.length > 0, `Varied stock includes low-stock products (${lowStock.length} items <= minStock)`);

  // 6. Verify pre-existing records were not deleted
  const preExistingSKUs = [
    "ELEC-WLM-001", "ELEC-USB-002", "FNB-COF-001", "FNB-TEA-002",
    "OFC-PPR-001", "OFC-PEN-002", "FNB-MILK-003", "ELEC-KBD-003",
  ];
  const preExistingFound = await prisma.product.findMany({
    where: { sku: { in: preExistingSKUs } },
  });
  assert(preExistingFound.length === 8, `All 8 pre-existing products preserved (${preExistingFound.length}/8)`);

  // 7-11. POS Logic simulation tests
  console.log("\n[3] Testing POS Pagination & Filter Logic...");
  const ITEMS_PER_PAGE = 9;

  // Simulate 50 products
  const simulatePagination = (items: typeof found50, page: number) => {
    const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
    const paginated = items.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
    return { totalPages, paginated };
  };

  // Test 50 items pagination
  const p1 = simulatePagination(found50, 1);
  assert(p1.paginated.length === 9, `Page 1 displays exactly 9 items`);
  const p2 = simulatePagination(found50, 2);
  assert(p2.paginated.length === 9, `Page 2 displays exactly 9 items`);
  const p5 = simulatePagination(found50, 5);
  assert(p5.paginated.length === 9, `Page 5 displays exactly 9 items`);
  const p6 = simulatePagination(found50, 6);
  assert(p6.paginated.length === 5, `Page 6 displays remaining 5 items (${p6.paginated.length}/5)`);
  assert(p1.totalPages === 6, `Total pages for 50 items is 6`);

  // Test category filtering simulation
  const householdItems = found50.filter((p) => p.category.name === "Household");
  const householdP1 = simulatePagination(householdItems, 1);
  assert(householdItems.length === 5, `Household category has 5 items`);
  assert(householdP1.totalPages === 1, `Household category has 1 page`);
  assert(householdP1.paginated.length === 5, `Page 1 of Household displays 5 items with no pagination needed`);

  // Test search simulation
  const indomieItems = found50.filter((p) => p.name.toLowerCase().includes("indomie"));
  const indomieP1 = simulatePagination(indomieItems, 1);
  assert(indomieItems.length === 3, `Search 'indomie' returns 3 items`);
  assert(indomieP1.totalPages === 1, `Search 'indomie' has 1 page (no unnecessary pagination controls)`);

  console.log(`\nVerification complete: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

verify()
  .catch((e) => {
    console.error("Verification failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
