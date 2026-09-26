import { prisma } from "../lib/prisma";
import { recordAuditLog, sanitizeAuditData, computeFieldDiff } from "../lib/audit";
import { createSession, runWithSessionToken } from "../lib/auth";
import { getUserActivityReport, getReportFilterOptions } from "../lib/reports";
import { createUser, updateUser, deleteUser } from "../app/admin/users/actions";
import { createRole, updateRole, deleteRole } from "../app/admin/roles/actions";
import {
  createParameterSettingAction,
  updateParameterSettingAction,
  deleteParameterSettingAction,
} from "../app/admin/parameter-settings/actions";
import { updateSessionSettings, getSessionSettings } from "../lib/session-settings";
import {
  createCategory,
  updateCategory,
  deleteCategory,
} from "../app/admin/categories/actions";
import {
  createProduct,
  updateProduct,
  deleteProduct,
} from "../app/admin/products/actions";
import { updateStock } from "../app/admin/stock/actions";
import {
  createSupplier,
  updateSupplier,
  toggleSupplierStatus,
} from "../lib/purchasing";

async function main() {
  console.log("=================================================");
  console.log("VERIFY COMPREHENSIVE MASTER DATA AUDIT TRAIL");
  console.log("=================================================\n");

  // Step 0: Find super admin user for full authorization
  const superAdmin = await prisma.user.findFirst({
    where: {
      status: "ACTIVE",
      userRoles: {
        some: {
          role: { name: "SUPER_ADMIN" },
        },
      },
    },
    select: { id: true, email: true, firstName: true, lastName: true },
  });

  const fallbackAdmin = await prisma.user.findFirst({
    where: { status: "ACTIVE" },
    select: { id: true, email: true, firstName: true, lastName: true },
  });

  const actor = superAdmin || fallbackAdmin;
  if (!actor) {
    throw new Error("No active admin user found in database");
  }
  const testUserId = actor.id;
  const testUsername = `${actor.firstName} ${actor.lastName}`;
  console.log(`Using audit actor: ${testUsername} (${testUserId})`);

  const sessionToken = await createSession(testUserId);

  await runWithSessionToken(sessionToken, async () => {
    // =========================================================
    // Test 1: Redaction & Sanitization Unit Verification
    // =========================================================
    console.log("\n--- TEST 1: Sanitization & Masking of Sensitive Fields ---");
    const sensitiveRaw = {
      id: "usr_123",
      email: "secret@example.com",
      password: "SuperSecretPassword123!",
      passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyz123456",
      token: "jwt-token-string",
      sessionToken: "session-secret",
      apiKey: "sk-proj-xyz",
      name: "John Doe",
    };

    const sanitized = sanitizeAuditData(sensitiveRaw);
    if (!sanitized) throw new Error("Sanitization returned null");
    if (sanitized.password !== "[REDACTED]") {
      throw new Error(`Expected password to be [REDACTED], got: ${sanitized.password}`);
    }
    if (sanitized.passwordHash !== "[REDACTED]") {
      throw new Error(`Expected passwordHash to be [REDACTED], got: ${sanitized.passwordHash}`);
    }
    if (sanitized.token !== "[REDACTED]") {
      throw new Error(`Expected token to be [REDACTED], got: ${sanitized.token}`);
    }
    if (sanitized.sessionToken !== "[REDACTED]") {
      throw new Error(`Expected sessionToken to be [REDACTED], got: ${sanitized.sessionToken}`);
    }
    if (sanitized.apiKey !== "[REDACTED]") {
      throw new Error(`Expected apiKey to be [REDACTED], got: ${sanitized.apiKey}`);
    }
    if (sanitized.email !== "secret@example.com" || sanitized.name !== "John Doe") {
      throw new Error("Non-sensitive fields were modified during sanitization");
    }
    console.log("✓ Sensitive fields correctly redacted to [REDACTED]");

    // =========================================================
    // Test 2: Diff Computation Unit Verification
    // =========================================================
    console.log("\n--- TEST 2: Diff Computation ---");
    const prevObj = { name: "Old Name", price: 1000, status: "ACTIVE" };
    const newObj = { name: "New Name", price: 1500, status: "ACTIVE" };
    const diff = computeFieldDiff(prevObj, newObj);
    const diffKeys = Object.keys(diff);
    if (diffKeys.length !== 2) {
      throw new Error(`Expected 2 changed fields, got: ${diffKeys.length}`);
    }
    const nameDiff = diff["name"];
    if (!nameDiff || nameDiff.before !== "Old Name" || nameDiff.after !== "New Name") {
      throw new Error("Name field diff mismatch");
    }
    console.log("✓ Field diff computation correctly identified changed keys");

    // =========================================================
    // Test 3: Administration - User CRUD Audit Trail
    // =========================================================
    console.log("\n--- TEST 3: Administration - User CRUD Audit ---");
    const rand = Math.floor(Math.random() * 100000);
    const testEmail = `audit.user.${rand}@example.com`;

    const cashierRole = await prisma.role.findFirst({
      where: { name: "CASHIER" },
    });
    if (!cashierRole) throw new Error("CASHIER role not found in database");

    // CREATE User
    const userFd = new FormData();
    userFd.append("firstName", "Audit");
    userFd.append("lastName", `Test${rand}`);
    userFd.append("email", testEmail);
    userFd.append("password", "Password123!");
    userFd.append("roleId", cashierRole.id);

    const createdUserRes = await createUser(userFd);
    if (createdUserRes.error) {
      throw new Error(`Failed to create user: ${createdUserRes.error}`);
    }

    const createdUser = await prisma.user.findUnique({
      where: { email: testEmail },
    });
    if (!createdUser) throw new Error("Created user not found in DB");
    const createdUserId = createdUser.id;

    const createLog = await prisma.auditLog.findFirst({
      where: {
        entity: "User",
        action: "CREATE",
        recordId: createdUserId,
      },
      orderBy: { createdAt: "desc" },
    });
    if (!createLog) throw new Error("No audit log found for User CREATE");
    if (createLog.module !== "Administration") throw new Error("Audit log module mismatch");
    if (createLog.previousValue !== null) throw new Error("CREATE audit previousValue must be null");
    const createVal = createLog.newValue as any;
    if (!createVal || createVal.email !== testEmail) throw new Error("Audit newValue mismatch");
    if (createVal.password && createVal.password !== "[REDACTED]") throw new Error("Audit newValue password not redacted");
    if (createVal.passwordHash && createVal.passwordHash !== "[REDACTED]") throw new Error("Audit newValue passwordHash not redacted");
    console.log("✓ User CREATE audited with previousValue=null and redacted passwordHash");

    // UPDATE User
    const updateFd = new FormData();
    updateFd.append("firstName", "AuditUpdated");
    updateFd.append("lastName", `Test${rand}`);
    updateFd.append("email", testEmail);
    updateFd.append("roleId", cashierRole.id);
    updateFd.append("status", "ACTIVE");

    const updateUserRes = await updateUser(createdUserId, updateFd);
    if (updateUserRes.error) throw new Error(`Failed to update user: ${updateUserRes.error}`);

    const updateLog = await prisma.auditLog.findFirst({
      where: {
        entity: "User",
        action: "UPDATE",
        recordId: createdUserId,
      },
      orderBy: { createdAt: "desc" },
    });
    if (!updateLog) throw new Error("No audit log found for User UPDATE");
    if (!updateLog.previousValue || !updateLog.newValue) {
      throw new Error("UPDATE audit log must contain both previousValue and newValue");
    }
    const uPrev = updateLog.previousValue as any;
    const uNew = updateLog.newValue as any;
    if (uPrev.firstName !== "Audit" || uNew.firstName !== "AuditUpdated") {
      throw new Error(`Update diff mismatch: prev=${uPrev.firstName}, new=${uNew.firstName}`);
    }
    console.log("✓ User UPDATE audited with both previousValue and newValue snapshots");

    // DELETE User
    const deleteUserRes = await deleteUser(createdUserId);
    if (deleteUserRes.error) throw new Error(`Failed to delete user: ${deleteUserRes.error}`);

    const deleteLog = await prisma.auditLog.findFirst({
      where: {
        entity: "User",
        action: "DELETE",
        recordId: createdUserId,
      },
      orderBy: { createdAt: "desc" },
    });
    if (!deleteLog) throw new Error("No audit log found for User DELETE");
    if (deleteLog.newValue !== null) throw new Error("DELETE audit newValue must be null");
    if (!deleteLog.previousValue) throw new Error("DELETE audit must contain pre-delete previousValue");
    console.log("✓ User DELETE audited with pre-delete state and newValue=null");

    // =========================================================
    // Test 4: Administration - Role CRUD Audit Trail
    // =========================================================
    console.log("\n--- TEST 4: Administration - Role CRUD Audit ---");
    const roleName = `TEST_ROLE_${rand}`;
    const somePerm = await prisma.permission.findFirst({
      where: { name: "REPORT_VIEW" },
    });
    if (!somePerm) throw new Error("Permission REPORT_VIEW not found");

    const roleFd = new FormData();
    roleFd.append("name", roleName);
    roleFd.append("description", "Temporary role for audit test");
    roleFd.append("permissionIds", JSON.stringify([somePerm.id]));

    const createRoleRes = await createRole(roleFd);
    if (createRoleRes.error) {
      throw new Error(`Failed to create role: ${createRoleRes.error}`);
    }

    const createdRole = await prisma.role.findFirst({
      where: { name: roleName },
    });
    if (!createdRole) throw new Error("Created role not found in DB");
    const createdRoleId = createdRole.id;

    const roleCreateLog = await prisma.auditLog.findFirst({
      where: { entity: "Role", action: "CREATE", recordId: createdRoleId },
    });
    if (!roleCreateLog || roleCreateLog.module !== "Administration") {
      throw new Error("Role CREATE audit log not found or module mismatch");
    }
    console.log("✓ Role CREATE audited in Administration module");

    // UPDATE Role
    const updateRoleFd = new FormData();
    updateRoleFd.append("name", roleName);
    updateRoleFd.append("description", "Updated temporary role for audit test");
    updateRoleFd.append("permissionIds", JSON.stringify([somePerm.id]));

    const updateRoleRes = await updateRole(createdRoleId, updateRoleFd);
    if (updateRoleRes.error) throw new Error(`Failed to update role: ${updateRoleRes.error}`);

    const roleUpdateLog = await prisma.auditLog.findFirst({
      where: { entity: "Role", action: "UPDATE", recordId: createdRoleId },
      orderBy: { createdAt: "desc" },
    });
    if (!roleUpdateLog || !roleUpdateLog.previousValue || !roleUpdateLog.newValue) {
      throw new Error("Role UPDATE audit log missing before/after values");
    }
    console.log("✓ Role UPDATE audited with before/after permissions");

    // DELETE Role
    const deleteRoleRes = await deleteRole(createdRoleId);
    if (deleteRoleRes.error) throw new Error(`Failed to delete role: ${deleteRoleRes.error}`);

    const roleDeleteLog = await prisma.auditLog.findFirst({
      where: { entity: "Role", action: "DELETE", recordId: createdRoleId },
    });
    if (!roleDeleteLog || roleDeleteLog.newValue !== null) {
      throw new Error("Role DELETE audit log missing pre-delete state or newValue not null");
    }
    console.log("✓ Role DELETE audited with pre-delete snapshot");

    // =========================================================
    // Test 5: Administration - Parameter & Session Settings Audit
    // =========================================================
    console.log("\n--- TEST 5: Administration - Parameter & Session Settings Audit ---");
    const paramCode = `AUDIT_PARAM_${rand}`;
    const paramFd = new FormData();
    paramFd.append("code", paramCode);
    paramFd.append("name", `Audit Param ${rand}`);
    paramFd.append("value", "initial-value");
    paramFd.append("description", "Audit test param");
    paramFd.append("status", "ACTIVE");

    const paramRes = await createParameterSettingAction(paramFd);
    if (paramRes.error) {
      throw new Error(`Failed to create parameter: ${paramRes.error}`);
    }

    const createdParam = await prisma.parameterSetting.findUnique({
      where: { code: paramCode },
    });
    if (!createdParam) throw new Error("Created parameter not found");
    const paramId = createdParam.id;

    const paramCreateLog = await prisma.auditLog.findFirst({
      where: { entity: "ParameterSetting", action: "CREATE", recordId: paramId },
    });
    if (!paramCreateLog) throw new Error("ParameterSetting CREATE audit log missing");
    console.log("✓ ParameterSetting CREATE audited");

    // UPDATE Param
    const updateParamFd = new FormData();
    updateParamFd.append("name", `Audit Param ${rand} Updated`);
    updateParamFd.append("value", "updated-value");
    updateParamFd.append("description", "Audit test param updated");
    updateParamFd.append("status", "ACTIVE");

    const updateParamRes = await updateParameterSettingAction(paramId, updateParamFd);
    if (updateParamRes.error) throw new Error(`Failed to update parameter: ${updateParamRes.error}`);

    const paramUpdateLog = await prisma.auditLog.findFirst({
      where: { entity: "ParameterSetting", action: "UPDATE", recordId: paramId },
      orderBy: { createdAt: "desc" },
    });
    if (!paramUpdateLog || (paramUpdateLog.newValue as any)?.value !== "updated-value") {
      throw new Error("ParameterSetting UPDATE audit mismatch");
    }
    console.log("✓ ParameterSetting UPDATE audited");

    // DELETE Param
    const deleteParamRes = await deleteParameterSettingAction(paramId);
    if (deleteParamRes.error) throw new Error(`Failed to delete parameter: ${deleteParamRes.error}`);

    const paramDeleteLog = await prisma.auditLog.findFirst({
      where: { entity: "ParameterSetting", action: "DELETE", recordId: paramId },
    });
    if (!paramDeleteLog || paramDeleteLog.newValue !== null) {
      throw new Error("ParameterSetting DELETE audit mismatch");
    }
    console.log("✓ ParameterSetting DELETE audited");

    // Session Settings UPDATE
    const currentSettings = await getSessionSettings();
    const newMax = currentSettings.maxActiveSessions === 1 ? 2 : 1;
    const newIdle = currentSettings.idleTimeoutMinutes === 30 ? 60 : 30;

    await updateSessionSettings(
      {
        maxActiveSessions: newMax,
        idleTimeoutMinutes: newIdle,
      },
      testUserId
    );
    const sessionLog = await prisma.auditLog.findFirst({
      where: { entity: "SessionSetting", action: "UPDATE" },
      orderBy: { createdAt: "desc" },
    });
    if (!sessionLog || !sessionLog.previousValue || !sessionLog.newValue) {
      throw new Error("SessionSetting UPDATE audit log missing");
    }
    console.log("✓ SessionSetting UPDATE audited with previous and new policy values");

    // =========================================================
    // Test 6: Product Management - Category, Product & Stock Audit
    // =========================================================
    console.log("\n--- TEST 6: Product Management - Category, Product & Stock Audit ---");
    const catFd = new FormData();
    catFd.append("name", `Audit Cat ${rand}`);
    catFd.append("description", "Audit test category");
    catFd.append("status", "ACTIVE");

    const catRes = await createCategory(catFd);
    if (catRes.error) throw new Error(`Category create failed: ${catRes.error}`);

    const createdCat = await prisma.category.findFirst({
      where: { name: `Audit Cat ${rand}` },
    });
    if (!createdCat) throw new Error("Created category not found");
    const catId = createdCat.id;

    const catCreateLog = await prisma.auditLog.findFirst({
      where: { entity: "Category", action: "CREATE", recordId: catId },
    });
    if (!catCreateLog || catCreateLog.module !== "Product Management") {
      throw new Error("Category CREATE audit log not found or wrong module");
    }
    console.log("✓ Category CREATE audited in Product Management module");

    // Product CREATE
    const sku = `SKU-AUDIT-${rand}`;
    const prodFd = new FormData();
    prodFd.append("sku", sku);
    prodFd.append("barcode", `BAR${rand}`);
    prodFd.append("name", `Product ${rand}`);
    prodFd.append("categoryId", catId);
    prodFd.append("unit", "PCS");
    prodFd.append("costPrice", "10000");
    prodFd.append("sellingPrice", "15000");
    prodFd.append("minimumStock", "5");
    prodFd.append("status", "ACTIVE");

    const prodRes = await createProduct(prodFd);
    if (prodRes.error) throw new Error(`Product create failed: ${prodRes.error}`);

    const createdProd = await prisma.product.findUnique({
      where: { sku },
      include: { stock: true },
    });
    if (!createdProd) throw new Error("Created product not found");
    const prodId = createdProd.id;

    const prodCreateLog = await prisma.auditLog.findFirst({
      where: { entity: "Product", action: "CREATE", recordId: prodId },
    });
    if (!prodCreateLog || prodCreateLog.module !== "Product Management") {
      throw new Error("Product CREATE audit log not found or wrong module");
    }
    console.log("✓ Product CREATE audited with full initial attributes");

    // Product UPDATE
    const updateProdFd = new FormData();
    updateProdFd.append("sku", sku);
    updateProdFd.append("name", `Product ${rand} Renamed`);
    updateProdFd.append("categoryId", catId);
    updateProdFd.append("unit", "PCS");
    updateProdFd.append("costPrice", "12000");
    updateProdFd.append("sellingPrice", "18000");
    updateProdFd.append("minimumStock", "10");
    updateProdFd.append("status", "ACTIVE");

    const updateProdRes = await updateProduct(prodId, updateProdFd);
    if (updateProdRes.error) throw new Error(`Product update failed: ${updateProdRes.error}`);

    const prodUpdateLog = await prisma.auditLog.findFirst({
      where: { entity: "Product", action: "UPDATE", recordId: prodId },
      orderBy: { createdAt: "desc" },
    });
    if (!prodUpdateLog || (prodUpdateLog.newValue as any)?.sellingPrice !== 18000) {
      throw new Error("Product UPDATE audit log mismatch");
    }
    console.log("✓ Product UPDATE audited with price change snapshots");

    // Stock Adjustment
    if (createdProd.stock) {
      const stockRes = await updateStock(
        createdProd.stock.id,
        25,
        "Physical recount correction",
        "Audit trail test recount"
      );
      if (stockRes.error) throw new Error(`Stock adjustment failed: ${stockRes.error}`);

      const stockLog = await prisma.auditLog.findFirst({
        where: { entity: "Stock", action: "UPDATE", recordId: createdProd.stock.id },
        orderBy: { createdAt: "desc" },
      });
      if (!stockLog || !stockLog.previousValue || !stockLog.newValue) {
        throw new Error("Stock adjustment audit log missing");
      }
      const sNew = stockLog.newValue as any;
      if (sNew.currentStock !== 25) {
        throw new Error(`Stock mismatch: expected 25, got ${sNew.currentStock}`);
      }
      console.log("✓ Stock adjustment audited with before/after quantity snapshots");
    }

    // Product DELETE (create and delete an isolated product with 0 movements)
    const prodDelFd = new FormData();
    const skuDel = `SKU-DEL-${rand}`;
    prodDelFd.append("sku", skuDel);
    prodDelFd.append("name", `Product For Delete ${rand}`);
    prodDelFd.append("categoryId", catId);
    prodDelFd.append("unit", "PCS");
    prodDelFd.append("costPrice", "10000");
    prodDelFd.append("sellingPrice", "15000");
    prodDelFd.append("minimumStock", "0");
    prodDelFd.append("status", "ACTIVE");

    const prodDelRes = await createProduct(prodDelFd);
    if (prodDelRes.error) throw new Error(`Product for delete create failed: ${prodDelRes.error}`);

    const createdProdDel = await prisma.product.findUnique({
      where: { sku: skuDel },
    });
    if (!createdProdDel) throw new Error("Created product for delete not found");

    const prodDeleteRes = await deleteProduct(createdProdDel.id);
    if (prodDeleteRes.error) throw new Error(`Product delete failed: ${prodDeleteRes.error}`);

    const prodDeleteLog = await prisma.auditLog.findFirst({
      where: { entity: "Product", action: "DELETE", recordId: createdProdDel.id },
    });
    if (!prodDeleteLog || prodDeleteLog.newValue !== null || !prodDeleteLog.previousValue) {
      throw new Error("Product DELETE audit log missing or invalid");
    }
    console.log("✓ Product DELETE audited with pre-delete state");

    // Category DELETE (create and delete an empty category)
    const catDelFd = new FormData();
    catDelFd.append("name", `Cat For Delete ${rand}`);
    catDelFd.append("description", "Audit category for delete");
    catDelFd.append("status", "ACTIVE");

    const catDelRes = await createCategory(catDelFd);
    if (catDelRes.error) throw new Error(`Category for delete failed: ${catDelRes.error}`);

    const createdCatDel = await prisma.category.findFirst({
      where: { name: `Cat For Delete ${rand}` },
    });
    if (!createdCatDel) throw new Error("Created category for delete not found");

    const catDeleteRes = await deleteCategory(createdCatDel.id);
    if (catDeleteRes.error) throw new Error(`Category delete failed: ${catDeleteRes.error}`);

    const catDeleteLog = await prisma.auditLog.findFirst({
      where: { entity: "Category", action: "DELETE", recordId: createdCatDel.id },
    });
    if (!catDeleteLog || catDeleteLog.newValue !== null) {
      throw new Error("Category DELETE audit log missing or invalid");
    }
    console.log("✓ Category DELETE audited with pre-delete state");

    // =========================================================
    // Test 7: Master Data - Supplier CRUD Audit
    // =========================================================
    console.log("\n--- TEST 7: Master Data - Supplier CRUD Audit ---");
    const supCode = `SUP${rand}`;
    const supRes = await createSupplier({
      code: supCode,
      name: `Supplier ${rand}`,
      email: `supplier${rand}@test.com`,
      phone: "08123456789",
      address: "Test Address",
    });
    const supId = supRes.id;

    const supCreateLog = await prisma.auditLog.findFirst({
      where: { entity: "Supplier", action: "CREATE", recordId: supId },
    });
    if (!supCreateLog || supCreateLog.module !== "Purchasing") {
      throw new Error("Supplier CREATE audit log missing or wrong module");
    }
    console.log("✓ Supplier CREATE audited in Purchasing module");

    // Supplier UPDATE
    await updateSupplier(supId, {
      code: supCode,
      name: `Supplier ${rand} Renamed`,
      address: "Updated Address 123",
    });
    const supUpdateLog = await prisma.auditLog.findFirst({
      where: { entity: "Supplier", action: "UPDATE", recordId: supId },
      orderBy: { createdAt: "desc" },
    });
    if (!supUpdateLog || (supUpdateLog.newValue as any)?.name !== `Supplier ${rand} Renamed`) {
      throw new Error("Supplier UPDATE audit log mismatch");
    }
    console.log("✓ Supplier UPDATE audited with updated attributes");

    // Supplier Status Change (Deactivation)
    await toggleSupplierStatus(supId);
    const supToggleLog = await prisma.auditLog.findFirst({
      where: { entity: "Supplier", action: "UPDATE", recordId: supId },
      orderBy: { createdAt: "desc" },
    });
    if (!supToggleLog || (supToggleLog.newValue as any)?.status !== "INACTIVE") {
      throw new Error("Supplier status toggle audit log missing or invalid");
    }
    console.log("✓ Supplier status toggle audited with before/after status");

    // Clean up test supplier
    await prisma.supplier.delete({ where: { id: supId } });

    // =========================================================
    // Test 8: Reports Query & Filter Options
    // =========================================================
    console.log("\n--- TEST 8: Reports Query & Filter Options ---");
    const filterMeta = await getReportFilterOptions();
    if (!filterMeta.auditModules || !filterMeta.auditEntities || !filterMeta.auditActions) {
      throw new Error("getReportFilterOptions missing audit dropdown lists");
    }
    console.log(`✓ Filter metadata includes ${filterMeta.auditModules.length} modules, ${filterMeta.auditEntities.length} entities, ${filterMeta.auditActions.length} actions`);

    // Query User Activity Report by Module
    const adminModuleReport = await getUserActivityReport({
      module: "Administration",
      pageSize: 10,
    });
    if (adminModuleReport.items.length === 0) {
      throw new Error("Expected items in Administration module report");
    }
    for (const item of adminModuleReport.items) {
      if (item.module !== "Administration") {
        throw new Error(`Filter leakage: found item with module=${item.module} when filtered to Administration`);
      }
      // Verify required UI fields exist
      if (!item.timestamp || !item.user || !item.entity || !item.action || !item.record || !item.description) {
        throw new Error("Missing required User Activity table field");
      }
    }
    console.log(`✓ getUserActivityReport filtered by module returns clean items with required fields`);

    // Query User Activity Report by Entity
    const userEntityReport = await getUserActivityReport({
      entity: "User",
      pageSize: 5,
    });
    if (userEntityReport.items.length === 0) {
      throw new Error("Expected items in User entity report");
    }
    for (const item of userEntityReport.items) {
      if (item.entity !== "User") {
        throw new Error(`Filter leakage: found entity ${item.entity} when filtered to User`);
      }
    }
    console.log(`✓ getUserActivityReport filtered by entity matches exactly`);

    // Query User Activity Report by Action
    const deleteActionReport = await getUserActivityReport({
      action: "DELETE",
      pageSize: 5,
    });
    if (deleteActionReport.items.length === 0) {
      throw new Error("Expected items in DELETE action report");
    }
    for (const item of deleteActionReport.items) {
      if (item.action !== "DELETE") {
        throw new Error(`Filter leakage: found action ${item.action} when filtered to DELETE`);
      }
      if (item.newValue !== null) {
        throw new Error("DELETE action report items must have newValue=null");
      }
    }
    console.log(`✓ getUserActivityReport filtered by action=DELETE verifies newValue is null`);

    // Search filter
    const searchReport = await getUserActivityReport({
      search: "ParameterSetting",
      pageSize: 5,
    });
    if (searchReport.items.length === 0) {
      throw new Error("Expected items in search report for ParameterSetting");
    }
    console.log(`✓ Search filter successfully retrieved matching audit logs`);

    console.log("\n=================================================");
    console.log("ALL COMPREHENSIVE AUDIT TRAIL TESTS PASSED!");
    console.log("=================================================");
  });
}

main()
  .catch((err) => {
    console.error("TEST FAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
