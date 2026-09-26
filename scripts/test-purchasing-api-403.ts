import { NextRequest } from "next/server";
import { GET as getOrders, POST as postOrders } from "../app/api/purchasing/orders/route";
import { GET as getReceipts, POST as postReceipts } from "../app/api/purchasing/receipts/route";
import { POST as confirmReceipt } from "../app/api/purchasing/receipts/[id]/confirm/route";
import { prisma } from "../lib/prisma";

let passedCount = 0;
let totalCount = 0;

function assert(condition: boolean, message: string) {
  totalCount++;
  if (!condition) {
    console.error(`  FAIL [${totalCount}]: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passedCount++;
  console.log(`  PASS [${totalCount}]: ${message}`);
}

async function run() {
  console.log("================================================================================");
  console.log("TESTING PURCHASING API ROUTE HANDLERS AUTHORIZATION (HTTP 403/401)");
  console.log("================================================================================\n");

  // 1. Unauthenticated requests -> 401 Unauthorized
  console.log("--- 1. Unauthenticated API Requests ---");
  const unauthReq = new NextRequest("http://localhost:3000/api/purchasing/orders");
  const unauthGetRes = await getOrders(unauthReq);
  assert(unauthGetRes.status === 401, "GET /api/purchasing/orders unauthenticated returns 401");

  const unauthPostRes = await postOrders(unauthReq);
  assert(unauthPostRes.status === 401, "POST /api/purchasing/orders unauthenticated returns 401");

  const unauthReceiptsReq = new NextRequest("http://localhost:3000/api/purchasing/receipts");
  const unauthReceiptsGetRes = await getReceipts(unauthReceiptsReq);
  assert(unauthReceiptsGetRes.status === 401, "GET /api/purchasing/receipts unauthenticated returns 401");

  const unauthReceiptsPostRes = await postReceipts(unauthReceiptsReq);
  assert(unauthReceiptsPostRes.status === 401, "POST /api/purchasing/receipts unauthenticated returns 401");

  const unauthConfirmRes = await confirmReceipt(unauthReceiptsReq, {
    params: Promise.resolve({ id: "dummy-id" }),
  });
  assert(unauthConfirmRes.status === 401, "POST /api/purchasing/receipts/:id/confirm unauthenticated returns 401");

  // 2. Check authenticated sessions with View only
  console.log("\n--- 2. Authenticated Session with View Only (Cashier or configured Admin) ---");
  const cashier = await prisma.user.findFirst({ where: { email: "cashier@retailflow.local" } });
  if (cashier) {
    // Create mock active session for cashier in DB
    const sessionToken = "test-cashier-session-token";
    await prisma.session.deleteMany({ where: { token: sessionToken } });
    await prisma.session.create({
      data: {
        token: sessionToken,
        userId: cashier.id,
        lastActivity: new Date(),
      },
    });

    const cashierReq = new NextRequest("http://localhost:3000/api/purchasing/orders", {
      headers: {
        cookie: `session_token=${sessionToken}`,
      },
      method: "POST",
      body: JSON.stringify({ supplierId: "test", items: [] }),
    });

    const cashierPostRes = await postOrders(cashierReq);
    assert(cashierPostRes.status === 403, "POST /api/purchasing/orders for unauthorized user returns HTTP 403 Forbidden");
    const jsonBody = await cashierPostRes.json();
    assert(jsonBody.error.includes("Forbidden"), "Response body contains Forbidden message");

    const cashierGRReq = new NextRequest("http://localhost:3000/api/purchasing/receipts", {
      headers: {
        cookie: `session_token=${sessionToken}`,
      },
      method: "POST",
      body: JSON.stringify({ purchaseOrderId: "test", items: [] }),
    });
    const cashierGRPostRes = await postReceipts(cashierGRReq);
    assert(cashierGRPostRes.status === 403, "POST /api/purchasing/receipts for unauthorized user returns HTTP 403 Forbidden");

    // Clean up test session
    await prisma.session.deleteMany({ where: { token: sessionToken } });
  }

  console.log(`\nAll ${passedCount}/${totalCount} API Route Handler assertions passed!`);
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("API authorization test failed:", err);
    process.exit(1);
  });
