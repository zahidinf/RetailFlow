import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/lib/audit";
import { hasPermission } from "@/lib/rbac";

async function testRbacAndAudit() {
  console.log("=== Testing RBAC & Audit for Promotion Management ===");

  const cashier = await prisma.user.findFirst({
    where: { email: "cashier@retailflow.local" },
  });
  const admin = await prisma.user.findFirst({
    where: { email: "admin@example.com" },
  });

  if (!cashier || !admin) throw new Error("Users missing");

  // Verify RBAC
  const cashierCanView = (await hasPermission(cashier.id, "PROMOTION_VIEW")) || (await hasPermission(cashier.id, "promotion.view"));
  const cashierCanCreate = await hasPermission(cashier.id, "PROMOTION_CREATE");
  const cashierCanApply = await hasPermission(cashier.id, "PROMOTION_APPLY");

  console.log("Cashier permissions:");
  console.log("- Can view promotions:", cashierCanView);
  console.log("- Can create promotions:", cashierCanCreate);
  console.log("- Can apply promotions in POS:", cashierCanApply);

  if (!cashierCanView || cashierCanCreate || !cashierCanApply) {
    throw new Error("Cashier RBAC matrix violated: cashier must only view & apply, not create!");
  }

  const adminCanCreate = await hasPermission(admin.id, "PROMOTION_CREATE");
  const adminCanDelete = await hasPermission(admin.id, "PROMOTION_DELETE");
  console.log("\nAdmin permissions:");
  console.log("- Can create promotions:", adminCanCreate);
  console.log("- Can delete promotions:", adminCanDelete);

  if (!adminCanCreate || !adminCanDelete) {
    throw new Error("Admin RBAC matrix violated: admin must have full promotion rights!");
  }

  // Test Audit log record
  console.log("\nRecording Audit Log entry...");
  await recordAuditLog({
    userId: admin.id,
    action: "CREATE",
    module: "Promotion Management",
    entity: "Promotion",
    recordId: "PROMO_AUDIT_TEST",
    recordIdentifier: "TEST_CODE",
    description: "Created promo in test",
    newValue: { name: "Test Promo", status: "ACTIVE" },
  });

  const logged = await prisma.auditLog.findFirst({
    where: { recordIdentifier: "TEST_CODE" },
  });

  if (!logged) {
    throw new Error("Audit log entry was not persisted!");
  }
  console.log("✓ Audit log successfully verified:", logged.action, logged.description);

  // Clean up test audit log
  await prisma.auditLog.delete({ where: { id: logged.id } });

  console.log("=== RBAC & AUDIT TESTS PASSED ===");
}

testRbacAndAudit()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
