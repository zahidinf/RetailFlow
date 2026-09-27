import { prisma } from "../lib/prisma";
import { createSession } from "../lib/auth";
import { GET as exportHandler } from "../app/api/reports/[type]/export/route";
import { NextRequest } from "next/server";
import * as fs from "fs";
import * as path from "path";

function parseCSVLines(csv: string): string[] {
  return csv.split(/\r?\n/);
}

async function main() {
  console.log("=================================================");
  console.log("VERIFY REPORTS SIMPLIFICATION & CSV EXPORT AUDIT");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${detail ? ` - ${detail}` : ""}`);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // TEST 1: Navigation Simplification Code Verification
  // --------------------------------------------------------------------------
  console.log("--- TEST 1: Navigation Structure ---");
  const reportMenuContent = fs.readFileSync(
    path.join(process.cwd(), "app/components/ReportMenu.tsx"),
    "utf8"
  );
  assert(
    !reportMenuContent.includes("Sales Reports") &&
      !reportMenuContent.includes("Inventory Reports") &&
      !reportMenuContent.includes("Purchasing Reports") &&
      !reportMenuContent.includes("Warehouse Reports") &&
      !reportMenuContent.includes("Finance Reports") &&
      !reportMenuContent.includes("Cashier Reports") &&
      !reportMenuContent.includes("Audit Reports") &&
      reportMenuContent.includes('href="/reports"'),
    "ReportMenu has single direct Link to /reports without dropdown submenus"
  );

  const navbarContent = fs.readFileSync(
    path.join(process.cwd(), "app/components/Navbar.tsx"),
    "utf8"
  );
  assert(
    !navbarContent.includes("isReportsSubmenuOpen") &&
      !navbarContent.includes('href="/reports?category='),
    "Navbar mobile menu has single direct Link to /reports without submenu items"
  );

  const adminMenuContent = fs.readFileSync(
    path.join(process.cwd(), "app/components/AdminMenu.tsx"),
    "utf8"
  );
  assert(
    !adminMenuContent.includes('href="/reports?category=audit"') &&
      !adminMenuContent.includes("Audit Reports"),
    "AdminMenu does not expose sub-report link to Audit Reports"
  );

  // --------------------------------------------------------------------------
  // Setup Test Users and Sessions
  // --------------------------------------------------------------------------
  console.log("\n--- Setup Users and Sessions ---");
  const superAdmin = await prisma.user.findFirst({
    where: {
      status: "ACTIVE",
      userRoles: {
        some: {
          role: { name: "SUPER_ADMIN" },
        },
      },
    },
  });

  if (!superAdmin) {
    throw new Error("No SUPER_ADMIN user found in database for test");
  }

  const superAdminToken = await createSession(superAdmin.id);
  const cookieHeader = `session_token=${superAdminToken}`;

  // Find or create cashier user without REPORT_EXPORT or REPORT_FINANCE_VIEW
  let cashierUser = await prisma.user.findFirst({
    where: {
      status: "ACTIVE",
      userRoles: {
        some: {
          role: { name: "CASHIER" },
        },
      },
    },
  });

  // --------------------------------------------------------------------------
  // TEST 2: CSV Export With No Filters
  // --------------------------------------------------------------------------
  console.log("\n--- TEST 2: CSV Export With No Filters ---");
  const reqNoFilters = new NextRequest("http://localhost:3000/api/reports/sales-summary/export", {
    headers: { cookie: cookieHeader },
  });

  const resNoFilters = await exportHandler(reqNoFilters, {
    params: Promise.resolve({ type: "sales-summary" }),
  });

  assert(resNoFilters.status === 200, "Export sales-summary returns 200");
  assert(
    resNoFilters.headers.get("Content-Type")?.includes("text/csv") === true,
    "Content-Type is text/csv"
  );

  const csvNoFilters = await resNoFilters.text();
  const linesNoFilters = parseCSVLines(csvNoFilters);

  assert(csvNoFilters.includes('"Report Name","Sales Summary"'), "Metadata contains Report Name");
  assert(
    csvNoFilters.includes(`"Exported By","${superAdmin.firstName} ${superAdmin.lastName} (${superAdmin.email})"`) ||
      csvNoFilters.includes(`"Exported By","${superAdmin.email}"`),
    "Metadata contains Exported By with authenticated user identity"
  );
  assert(csvNoFilters.includes('"Exported At"'), "Metadata contains Exported At timestamp");
  assert(csvNoFilters.includes('"Filter - Date From","All"'), "Unapplied filter Date From defaults to 'All'");
  assert(csvNoFilters.includes('"Filter - Date To","All"'), "Unapplied filter Date To defaults to 'All'");

  // Check blank line
  const blankLineIdx = linesNoFilters.indexOf("");
  assert(blankLineIdx > 0, "Contains blank line separating metadata and table header");
  assert(
    linesNoFilters[blankLineIdx + 1]?.includes("Metric") ||
      linesNoFilters[blankLineIdx + 1]?.includes("Value"),
    "Table headers immediately follow the blank line"
  );

  // --------------------------------------------------------------------------
  // TEST 3: CSV Export With Multiple Filters and Date Range
  // --------------------------------------------------------------------------
  console.log("\n--- TEST 3: CSV Export With Multiple Filters ---");
  const reqMultiFilters = new NextRequest(
    "http://localhost:3000/api/reports/sales-transactions/export?startDate=2026-09-01&endDate=2026-09-27&status=COMPLETED&search=INV",
    { headers: { cookie: cookieHeader } }
  );

  const resMultiFilters = await exportHandler(reqMultiFilters, {
    params: Promise.resolve({ type: "sales-transactions" }),
  });

  assert(resMultiFilters.status === 200, "Export sales-transactions returns 200");
  const csvMultiFilters = await resMultiFilters.text();

  assert(
    csvMultiFilters.includes('"Report Name","Sales Transactions"'),
    "Metadata has Report Name Sales Transactions"
  );
  assert(
    csvMultiFilters.includes('"Filter - Date From","2026-09-01"'),
    "Metadata captures Filter - Date From: 2026-09-01"
  );
  assert(
    csvMultiFilters.includes('"Filter - Date To","2026-09-27"'),
    "Metadata captures Filter - Date To: 2026-09-27"
  );
  assert(
    csvMultiFilters.includes('"Filter - Status","COMPLETED"'),
    "Metadata captures Filter - Status: COMPLETED"
  );
  assert(
    csvMultiFilters.includes('"Filter - Search","INV"'),
    "Metadata captures Filter - Search: INV"
  );
  assert(
    csvMultiFilters.includes('"Filter - Cashier","All"'),
    "Unselected Cashier filter defaults to 'All'"
  );
  assert(
    csvMultiFilters.includes('"Filter - Payment Method","All"'),
    "Unselected Payment Method filter defaults to 'All'"
  );
  assert(
    csvMultiFilters.includes('"Sale Number","Date","Cashier"'),
    "Contains sales-transactions table headers"
  );

  // --------------------------------------------------------------------------
  // TEST 4: CSV Export Dynamic ID Resolution to Readable Names
  // --------------------------------------------------------------------------
  console.log("\n--- TEST 4: Dynamic ID Resolution to Readable Names ---");
  const testCat = await prisma.category.findFirst({ where: { status: "ACTIVE" } });
  if (testCat) {
    const reqCatFilter = new NextRequest(
      `http://localhost:3000/api/reports/stock-summary/export?categoryId=${testCat.id}`,
      { headers: { cookie: cookieHeader } }
    );
    const resCatFilter = await exportHandler(reqCatFilter, {
      params: Promise.resolve({ type: "stock-summary" }),
    });
    const csvCatFilter = await resCatFilter.text();
    assert(
      csvCatFilter.includes(`"Filter - Category","${testCat.name}"`),
      `Category ID dynamically resolved to readable category name "${testCat.name}"`
    );
  }

  // --------------------------------------------------------------------------
  // TEST 5: CSV Escaping Test (Quotes, Commas, Line Breaks)
  // --------------------------------------------------------------------------
  console.log("\n--- TEST 5: CSV Escaping ---");
  const reqEscaping = new NextRequest(
    'http://localhost:3000/api/reports/user-activity/export?search=test%22with%22quotes,and,commas',
    { headers: { cookie: cookieHeader } }
  );
  const resEscaping = await exportHandler(reqEscaping, {
    params: Promise.resolve({ type: "user-activity" }),
  });
  const csvEscaping = await resEscaping.text();
  assert(
    csvEscaping.includes('test""with""quotes,and,commas'),
    "CSV properly escapes inner double-quotes with doubled quotes in filter metadata"
  );

  // --------------------------------------------------------------------------
  // TEST 6: Audit Log Verification
  // --------------------------------------------------------------------------
  console.log("\n--- TEST 6: Audit Trail Integration ---");
  const latestExportAudit = await prisma.auditLog.findFirst({
    where: {
      action: "REPORT_EXPORT",
      userId: superAdmin.id,
      recordId: "sales-transactions",
    },
    orderBy: { createdAt: "desc" },
  });

  assert(latestExportAudit !== null, "AuditLog record created for REPORT_EXPORT");
  if (latestExportAudit) {
    assert(latestExportAudit.module === "Reports", "AuditLog module is 'Reports'");
    assert(latestExportAudit.entity === "Report", "AuditLog entity is 'Report'");
    assert(
      latestExportAudit.recordIdentifier === "Sales Transactions",
      "AuditLog recordIdentifier is 'Sales Transactions'"
    );
    assert(
      latestExportAudit.description === "Exported Sales Transactions to CSV",
      "AuditLog description matches standard"
    );

    const details = JSON.parse(latestExportAudit.details || "{}");
    assert(details.format === "CSV", "AuditLog details contains format: CSV");
    assert(
      details.appliedFilters?.["Date From"] === "2026-09-01",
      "AuditLog details contains applied filter Date From"
    );
    assert(
      details.appliedFilters?.["Status"] === "COMPLETED",
      "AuditLog details contains applied filter Status"
    );
  }

  // --------------------------------------------------------------------------
  // TEST 7: Security & RBAC Enforcement
  // --------------------------------------------------------------------------
  console.log("\n--- TEST 7: Security & RBAC Enforcement ---");
  // 7.1: Unauthenticated request
  const unauthReq = new NextRequest("http://localhost:3000/api/reports/sales-summary/export");
  const unauthRes = await exportHandler(unauthReq, {
    params: Promise.resolve({ type: "sales-summary" }),
  });
  assert(unauthRes.status === 401, "Unauthenticated export request rejected with 401");

  // 7.2: Cannot spoof user identity via query parameters
  const spoofReq = new NextRequest(
    "http://localhost:3000/api/reports/sales-summary/export?userId=spoofed-user-id&username=FakeAdmin",
    { headers: { cookie: cookieHeader } }
  );
  const spoofRes = await exportHandler(spoofReq, {
    params: Promise.resolve({ type: "sales-summary" }),
  });
  const spoofCsv = await spoofRes.text();
  assert(
    !spoofCsv.includes('"Exported By","FakeAdmin"'),
    "Exporter identity cannot be spoofed via query parameter, authoritative backend session used"
  );

  // 7.3: Unknown report type
  const badReq = new NextRequest("http://localhost:3000/api/reports/non-existent-report/export", {
    headers: { cookie: cookieHeader },
  });
  const badRes = await exportHandler(badReq, {
    params: Promise.resolve({ type: "non-existent-report" }),
  });
  assert(badRes.status === 400, "Unknown report type returns 400");

  // 7.4: Role without permission rejected with 403
  if (cashierUser) {
    const cashierToken = await createSession(cashierUser.id);
    const cashierReq = new NextRequest("http://localhost:3000/api/reports/revenue/export", {
      headers: { cookie: `session_token=${cashierToken}` },
    });
    const cashierRes = await exportHandler(cashierReq, {
      params: Promise.resolve({ type: "revenue" }),
    });
    assert(
      cashierRes.status === 403,
      `User lacking REPORT_EXPORT / category permission rejected with 403 (got ${cashierRes.status})`
    );
  }

  console.log("\n=================================================");
  console.log(`TOTAL TESTS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error("Test execution failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
