import { PrismaClient } from "@prisma/client";
import { hash } from "bcrypt";

const prisma = new PrismaClient();

const ALL_PERMISSIONS = [
  // User Management
  { name: "USER_VIEW", description: "View user list and details" },
  { name: "USER_CREATE", description: "Create new users" },
  { name: "USER_UPDATE", description: "Update existing users" },
  { name: "USER_DELETE", description: "Delete users" },

  // Role Management
  { name: "ROLE_VIEW", description: "View roles" },
  { name: "ROLE_CREATE", description: "Create new roles" },
  { name: "ROLE_UPDATE", description: "Update existing roles" },
  { name: "ROLE_DELETE", description: "Delete roles" },
  { name: "ROLE_MANAGE", description: "Manage roles (create, update, delete)" },

  // Permission Management
  { name: "PERMISSION_VIEW", description: "View permissions" },
  { name: "PERMISSION_ASSIGN", description: "Assign permissions to roles" },

  // Category Management (Phase 1)
  { name: "CATEGORY_VIEW", description: "View categories" },
  { name: "CATEGORY_CREATE", description: "Create categories" },
  { name: "CATEGORY_UPDATE", description: "Update categories" },
  { name: "CATEGORY_DELETE", description: "Delete categories" },

  // Product Management (Phase 1)
  { name: "PRODUCT_VIEW", description: "View products" },
  { name: "PRODUCT_CREATE", description: "Create products" },
  { name: "PRODUCT_UPDATE", description: "Update products" },
  { name: "PRODUCT_DELETE", description: "Delete products" },

  // Stock / Inventory Management (Phase 1)
  { name: "STOCK_VIEW", description: "View stock levels and status" },
  { name: "STOCK_UPDATE", description: "Update current stock levels (inventory adjust)" },
  { name: "INVENTORY_MOVEMENT_VIEW", description: "View inventory movements and history" },

  // POS & Sales Management (Phase 2)
  { name: "POS_ACCESS", description: "Access Point of Sale system" },
  { name: "POS_SALE_CREATE", description: "Create sales transactions at POS" },
  { name: "SALES_VIEW", description: "View sales transactions" },
  { name: "SALES_VIEW_OWN", description: "View own sales transactions" },
  { name: "SALES_VIEW_ALL", description: "View all sales transactions across store" },
  { name: "SALES_DETAIL", description: "View sales transaction details" },
  { name: "SALES_DETAIL_OWN", description: "View own sales transaction details" },
  { name: "SALES_DETAIL_ALL", description: "View all sales transaction details" },

  // Sales Refund Management
  { name: "SALES_VOID", description: "Void completed sales transactions" },
  { name: "SALES_REFUND", description: "Refund sales transactions" },
  { name: "SALES_REFUND_APPROVE", description: "Approve sales transaction refunds" },
  { name: "TRANSACTION_REFUND_CREATE", description: "Initiate transaction refunds" },
  { name: "TRANSACTION_REFUND_APPROVE", description: "Approve transaction refunds" },

  // Parameter Settings Management
  { name: "PARAMETER_SETTINGS_VIEW", description: "View parameter settings" },
  { name: "PARAMETER_SETTINGS_CREATE", description: "Create parameter settings" },
  { name: "PARAMETER_SETTINGS_UPDATE", description: "Update parameter settings" },
  { name: "PARAMETER_SETTINGS_DELETE", description: "Delete parameter settings" },

  // Supplier Management (Phase 4)
  { name: "SUPPLIER_VIEW", description: "View suppliers list and details" },
  { name: "SUPPLIER_CREATE", description: "Create new suppliers" },
  { name: "SUPPLIER_UPDATE", description: "Update existing suppliers" },
  { name: "SUPPLIER_DELETE", description: "Deactivate or delete suppliers" },

  // Purchase Order Management (Phase 4)
  { name: "PURCHASE_ORDER_VIEW", description: "View purchase orders and details" },
  { name: "PURCHASE_ORDER_CREATE", description: "Create purchase orders" },
  { name: "PURCHASE_ORDER_UPDATE", description: "Update purchase orders" },
  { name: "PURCHASE_ORDER_SUBMIT", description: "Submit purchase orders for approval" },
  { name: "PURCHASE_ORDER_APPROVE", description: "Approve purchase orders" },
  { name: "PURCHASE_ORDER_CANCEL", description: "Cancel purchase orders" },

  // Goods Receipt Management (Phase 4)
  { name: "GOODS_RECEIPT_VIEW", description: "View goods receipts and details" },
  { name: "GOODS_RECEIPT_CREATE", description: "Create goods receipts from purchase orders" },
  { name: "GOODS_RECEIPT_UPDATE", description: "Update draft goods receipts" },
  { name: "GOODS_RECEIPT_CONFIRM", description: "Confirm goods receipt and increment stock" },
  { name: "GOODS_RECEIPT_CANCEL", description: "Cancel goods receipts" },

  // Report Module Permissions
  { name: "REPORT_VIEW", description: "Access the reports module" },
  { name: "REPORT_SALES_VIEW", description: "View sales reports" },
  { name: "REPORT_INVENTORY_VIEW", description: "View inventory reports" },
  { name: "REPORT_PURCHASING_VIEW", description: "View purchasing reports" },
  { name: "REPORT_WAREHOUSE_VIEW", description: "View warehouse reports" },
  { name: "REPORT_FINANCE_VIEW", description: "View finance reports" },
  { name: "REPORT_CASHIER_VIEW", description: "View cashier reports" },
  { name: "REPORT_AUDIT_VIEW", description: "View audit reports" },
  { name: "REPORT_EXPORT", description: "Export report data to CSV/Excel" },

  // Promotion Management
  { name: "PROMOTION_VIEW", description: "View promotion list and details" },
  { name: "PROMOTION_CREATE", description: "Create promotions" },
  { name: "PROMOTION_EDIT", description: "Edit existing promotions" },
  { name: "PROMOTION_DELETE", description: "Delete promotions" },
  { name: "PROMOTION_ACTIVATE", description: "Activate promotions" },
  { name: "PROMOTION_DEACTIVATE", description: "Deactivate promotions" },
  { name: "PROMOTION_APPLY", description: "Apply promotions in POS transactions" },
];

async function main() {
  console.log("=== Starting Idempotent RBAC Seed (Phase 1 & Phase 2) ===\n");

  // 1. Seed or reuse all permissions
  console.log("1. Ensuring all permissions exist...");
  const permissionMap = new Map<string, string>();
  for (const perm of ALL_PERMISSIONS) {
    const p = await prisma.permission.upsert({
      where: { name: perm.name },
      update: { description: perm.description },
      create: perm,
    });
    permissionMap.set(p.name, p.id);
  }
  console.log(`   Ensured ${permissionMap.size} permissions.\n`);

  // Helper to assign permissions to a role idempotently
  async function assignPermissionsToRole(roleId: string, permNames: string[]) {
    for (const name of permNames) {
      const permissionId = permissionMap.get(name);
      if (!permissionId) continue;
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId,
            permissionId,
          },
        },
        update: {},
        create: {
          roleId,
          permissionId,
        },
      });
    }
  }

  // 2. Discover or create roles
  console.log("2. Ensuring roles exist (preserving existing)...");

  // Super Admin: Must reuse existing
  const superAdminRole = await prisma.role.upsert({
    where: { name: "SUPER_ADMIN" },
    update: {},
    create: {
      name: "SUPER_ADMIN",
      description: "Full system access with all permissions",
    },
  });
  console.log(`   SUPER_ADMIN role ID: ${superAdminRole.id} (Preserved)`);

  // Admin: Must reuse existing
  const adminRole = await prisma.role.upsert({
    where: { name: "ADMIN" },
    update: {},
    create: {
      name: "ADMIN",
      description: "Administrative system access with assigned permissions",
    },
  });
  console.log(`   ADMIN role ID: ${adminRole.id} (Preserved)`);

  // Manager: Create if missing
  const managerRole = await prisma.role.upsert({
    where: { name: "MANAGER" },
    update: {
      description: "Store operations and sales monitoring",
    },
    create: {
      name: "MANAGER",
      description: "Store operations and sales monitoring",
    },
  });
  console.log(`   MANAGER role ID: ${managerRole.id}`);

  // Cashier: Create if missing
  const cashierRole = await prisma.role.upsert({
    where: { name: "CASHIER" },
    update: {
      description: "Point of sale and sales transactions",
    },
    create: {
      name: "CASHIER",
      description: "Point of sale and sales transactions",
    },
  });
  console.log(`   CASHIER role ID: ${cashierRole.id}`);

  // Inventory Staff: Create if missing
  const inventoryStaffRole = await prisma.role.upsert({
    where: { name: "INVENTORY_STAFF" },
    update: {
      description: "Inventory and stock management",
    },
    create: {
      name: "INVENTORY_STAFF",
      description: "Inventory and stock management",
    },
  });
  console.log(`   INVENTORY_STAFF role ID: ${inventoryStaffRole.id}`);

  // Purchasing: Create if missing
  const purchasingRole = await prisma.role.upsert({
    where: { name: "PURCHASING" },
    update: {
      description: "Procurement and supplier management",
    },
    create: {
      name: "PURCHASING",
      description: "Procurement and supplier management",
    },
  });
  console.log(`   PURCHASING role ID: ${purchasingRole.id}`);

  // Warehouse: Create if missing
  const warehouseRole = await prisma.role.upsert({
    where: { name: "WAREHOUSE" },
    update: {
      description: "Physical goods receiving and goods receipts",
    },
    create: {
      name: "WAREHOUSE",
      description: "Physical goods receiving and goods receipts",
    },
  });
  console.log(`   WAREHOUSE role ID: ${warehouseRole.id}`);

  // Accountant: Create if missing
  const accountantRole = await prisma.role.upsert({
    where: { name: "ACCOUNTANT" },
    update: {
      description: "Finance and operational reporting read-only",
    },
    create: {
      name: "ACCOUNTANT",
      description: "Finance and operational reporting read-only",
    },
  });
  console.log(`   ACCOUNTANT role ID: ${accountantRole.id}\n`);

  // Auditor: Create if missing
  const auditorRole = await prisma.role.upsert({
    where: { name: "AUDITOR" },
    update: {
      description: "Auditing and compliance read-only access",
    },
    create: {
      name: "AUDITOR",
      description: "Auditing and compliance read-only access",
    },
  });
  console.log(`   AUDITOR role ID: ${auditorRole.id}\n`);

  // 3. Assign permissions per matrix
  console.log("3. Configuring role permissions per matrix...");

  // Super Admin permissions (All active permissions, excluding future void)
  const superAdminPerms = ALL_PERMISSIONS
    .filter((p) => p.name !== "SALES_VOID")
    .map((p) => p.name);
  await assignPermissionsToRole(superAdminRole.id, superAdminPerms);
  console.log(`   Assigned ${superAdminPerms.length} permissions to SUPER_ADMIN`);

  // Admin permissions (Full store, product, category, stock, user, parameter settings, purchasing, GR, sales, and reports)
  const adminPerms = [
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
    "INVENTORY_MOVEMENT_VIEW",
    "POS_ACCESS",
    "POS_SALE_CREATE",
    "SALES_VIEW",
    "SALES_VIEW_OWN",
    "SALES_VIEW_ALL",
    "SALES_DETAIL",
    "SALES_DETAIL_OWN",
    "SALES_DETAIL_ALL",
    "SALES_REFUND",
    "SALES_REFUND_APPROVE",
    "TRANSACTION_REFUND_CREATE",
    "TRANSACTION_REFUND_APPROVE",
    "USER_VIEW",
    "USER_CREATE",
    "USER_UPDATE",
    "USER_DELETE",
    "PARAMETER_SETTINGS_VIEW",
    "PARAMETER_SETTINGS_CREATE",
    "PARAMETER_SETTINGS_UPDATE",
    "PARAMETER_SETTINGS_DELETE",
    "SUPPLIER_VIEW",
    "SUPPLIER_CREATE",
    "SUPPLIER_UPDATE",
    "SUPPLIER_DELETE",
    "PURCHASE_ORDER_VIEW",
    "PURCHASE_ORDER_CREATE",
    "PURCHASE_ORDER_UPDATE",
    "PURCHASE_ORDER_SUBMIT",
    "PURCHASE_ORDER_APPROVE",
    "PURCHASE_ORDER_CANCEL",
    "GOODS_RECEIPT_VIEW",
    "GOODS_RECEIPT_CREATE",
    "GOODS_RECEIPT_UPDATE",
    "GOODS_RECEIPT_CONFIRM",
    "GOODS_RECEIPT_CANCEL",
    "REPORT_VIEW",
    "REPORT_SALES_VIEW",
    "REPORT_INVENTORY_VIEW",
    "REPORT_PURCHASING_VIEW",
    "REPORT_WAREHOUSE_VIEW",
    "REPORT_FINANCE_VIEW",
    "REPORT_CASHIER_VIEW",
    "REPORT_AUDIT_VIEW",
    "REPORT_EXPORT",
    "PROMOTION_VIEW",
    "PROMOTION_CREATE",
    "PROMOTION_EDIT",
    "PROMOTION_DELETE",
    "PROMOTION_ACTIVATE",
    "PROMOTION_DEACTIVATE",
    "PROMOTION_APPLY",
  ];
  await assignPermissionsToRole(adminRole.id, adminPerms);
  console.log(`   Assigned ${adminPerms.length} permissions to ADMIN`);

  // Manager permissions (Store operations & sales monitoring, sales refund approval, PO approval, supplier oversight, operational reports)
  const managerPerms = [
    "CATEGORY_VIEW",
    "PRODUCT_VIEW",
    "STOCK_VIEW",
    "INVENTORY_MOVEMENT_VIEW",
    "SALES_VIEW",
    "SALES_VIEW_OWN",
    "SALES_VIEW_ALL",
    "SALES_DETAIL",
    "SALES_DETAIL_OWN",
    "SALES_DETAIL_ALL",
    "SALES_REFUND",
    "SALES_REFUND_APPROVE",
    "TRANSACTION_REFUND_CREATE",
    "TRANSACTION_REFUND_APPROVE",
    "SUPPLIER_VIEW",
    "PURCHASE_ORDER_VIEW",
    "PURCHASE_ORDER_CREATE",
    "PURCHASE_ORDER_SUBMIT",
    "PURCHASE_ORDER_APPROVE",
    "PURCHASE_ORDER_CANCEL",
    "GOODS_RECEIPT_VIEW",
    "REPORT_VIEW",
    "REPORT_SALES_VIEW",
    "REPORT_INVENTORY_VIEW",
    "REPORT_PURCHASING_VIEW",
    "REPORT_WAREHOUSE_VIEW",
    "REPORT_CASHIER_VIEW",
    "REPORT_EXPORT",
    "PROMOTION_VIEW",
    "PROMOTION_CREATE",
    "PROMOTION_EDIT",
    "PROMOTION_ACTIVATE",
    "PROMOTION_DEACTIVATE",
    "PROMOTION_APPLY",
  ];
  await assignPermissionsToRole(managerRole.id, managerPerms);
  console.log(`   Assigned ${managerPerms.length} permissions to MANAGER`);

  // Cashier permissions (POS, own sales, initiate refund only, cashier report)
  const cashierPerms = [
    "CATEGORY_VIEW",
    "PRODUCT_VIEW",
    "STOCK_VIEW",
    "POS_ACCESS",
    "POS_SALE_CREATE",
    "SALES_VIEW",
    "SALES_VIEW_OWN",
    "SALES_DETAIL",
    "SALES_DETAIL_OWN",
    "SALES_REFUND",
    "TRANSACTION_REFUND_CREATE",
    "REPORT_VIEW",
    "REPORT_CASHIER_VIEW",
    "PROMOTION_VIEW",
    "PROMOTION_APPLY",
  ];
  await assignPermissionsToRole(cashierRole.id, cashierPerms);
  console.log(`   Assigned ${cashierPerms.length} permissions to CASHIER`);

  // Inventory Staff permissions (Product, stock, movement, adjust, PO view, GR view, inventory reports)
  const inventoryStaffPerms = [
    "CATEGORY_VIEW",
    "PRODUCT_VIEW",
    "STOCK_VIEW",
    "STOCK_UPDATE",
    "INVENTORY_MOVEMENT_VIEW",
    "PURCHASE_ORDER_VIEW",
    "GOODS_RECEIPT_VIEW",
    "REPORT_VIEW",
    "REPORT_INVENTORY_VIEW",
  ];
  await assignPermissionsToRole(inventoryStaffRole.id, inventoryStaffPerms);
  console.log(`   Assigned ${inventoryStaffPerms.length} permissions to INVENTORY_STAFF`);

  // Purchasing permissions (Supplier management, PO create/edit/submit/cancel, view stock/products/GR, purchasing reports)
  const purchasingPerms = [
    "CATEGORY_VIEW",
    "PRODUCT_VIEW",
    "STOCK_VIEW",
    "SUPPLIER_VIEW",
    "SUPPLIER_CREATE",
    "SUPPLIER_UPDATE",
    "SUPPLIER_DELETE",
    "PURCHASE_ORDER_VIEW",
    "PURCHASE_ORDER_CREATE",
    "PURCHASE_ORDER_UPDATE",
    "PURCHASE_ORDER_SUBMIT",
    "PURCHASE_ORDER_CANCEL",
    "GOODS_RECEIPT_VIEW",
    "REPORT_VIEW",
    "REPORT_PURCHASING_VIEW",
  ];
  await assignPermissionsToRole(purchasingRole.id, purchasingPerms);
  console.log(`   Assigned ${purchasingPerms.length} permissions to PURCHASING`);

  // Warehouse permissions (View approved POs, create/edit/confirm GR, view stock/movements, warehouse & inventory reports)
  const warehousePerms = [
    "CATEGORY_VIEW",
    "PRODUCT_VIEW",
    "STOCK_VIEW",
    "INVENTORY_MOVEMENT_VIEW",
    "PURCHASE_ORDER_VIEW",
    "GOODS_RECEIPT_VIEW",
    "GOODS_RECEIPT_CREATE",
    "GOODS_RECEIPT_UPDATE",
    "GOODS_RECEIPT_CONFIRM",
    "GOODS_RECEIPT_CANCEL",
    "REPORT_VIEW",
    "REPORT_WAREHOUSE_VIEW",
    "REPORT_INVENTORY_VIEW",
  ];
  await assignPermissionsToRole(warehouseRole.id, warehousePerms);
  console.log(`   Assigned ${warehousePerms.length} permissions to WAREHOUSE`);

  // Accountant permissions (Read-only access to sales, PO, GR, stock movements, suppliers, finance & sales reports)
  const accountantPerms = [
    "CATEGORY_VIEW",
    "PRODUCT_VIEW",
    "STOCK_VIEW",
    "INVENTORY_MOVEMENT_VIEW",
    "SUPPLIER_VIEW",
    "PURCHASE_ORDER_VIEW",
    "GOODS_RECEIPT_VIEW",
    "SALES_VIEW",
    "SALES_VIEW_ALL",
    "SALES_DETAIL",
    "SALES_DETAIL_ALL",
    "REPORT_VIEW",
    "REPORT_FINANCE_VIEW",
    "REPORT_SALES_VIEW",
    "REPORT_EXPORT",
  ];
  await assignPermissionsToRole(accountantRole.id, accountantPerms);
  console.log(`   Assigned ${accountantPerms.length} permissions to ACCOUNTANT\n`);

  // Auditor permissions (Strictly READ-ONLY across all report categories, audit trails, and detail views; NO operational mutations)
  const auditorPerms = [
    "CATEGORY_VIEW",
    "PRODUCT_VIEW",
    "STOCK_VIEW",
    "INVENTORY_MOVEMENT_VIEW",
    "SUPPLIER_VIEW",
    "PURCHASE_ORDER_VIEW",
    "GOODS_RECEIPT_VIEW",
    "SALES_VIEW",
    "SALES_VIEW_ALL",
    "SALES_DETAIL",
    "SALES_DETAIL_ALL",
    "PARAMETER_SETTINGS_VIEW",
    "USER_VIEW",
    "REPORT_VIEW",
    "REPORT_SALES_VIEW",
    "REPORT_INVENTORY_VIEW",
    "REPORT_PURCHASING_VIEW",
    "REPORT_WAREHOUSE_VIEW",
    "REPORT_FINANCE_VIEW",
    "REPORT_CASHIER_VIEW",
    "REPORT_AUDIT_VIEW",
    "REPORT_EXPORT",
  ];
  await assignPermissionsToRole(auditorRole.id, auditorPerms);
  console.log(`   Assigned ${auditorPerms.length} permissions to AUDITOR\n`);

  // 4. Ensure Development Users for New Roles Only (Preserving existing users completely)
  console.log("4. Ensuring development test users exist for new roles...");
  const devPasswordHash = await hash("SecureDevPassword123!", 10);

  const newDevUsers = [
    {
      email: "manager@retailflow.local",
      firstName: "RetailFlow",
      lastName: "Manager",
      roleId: managerRole.id,
      roleName: "MANAGER",
    },
    {
      email: "cashier@retailflow.local",
      firstName: "RetailFlow",
      lastName: "Cashier",
      roleId: cashierRole.id,
      roleName: "CASHIER",
    },
    {
      email: "inventory@retailflow.local",
      firstName: "RetailFlow",
      lastName: "Inventory Staff",
      roleId: inventoryStaffRole.id,
      roleName: "INVENTORY_STAFF",
    },
    {
      email: "purchasing@retailflow.local",
      firstName: "RetailFlow",
      lastName: "Purchasing Staff",
      roleId: purchasingRole.id,
      roleName: "PURCHASING",
    },
    {
      email: "warehouse@retailflow.local",
      firstName: "RetailFlow",
      lastName: "Warehouse Staff",
      roleId: warehouseRole.id,
      roleName: "WAREHOUSE",
    },
    {
      email: "accountant@retailflow.local",
      firstName: "RetailFlow",
      lastName: "Accountant",
      roleId: accountantRole.id,
      roleName: "ACCOUNTANT",
    },
    {
      email: "auditor@retailflow.local",
      firstName: "RetailFlow",
      lastName: "Auditor",
      roleId: auditorRole.id,
      roleName: "AUDITOR",
    },
  ];

  for (const devUser of newDevUsers) {
    const existing = await prisma.user.findUnique({
      where: { email: devUser.email },
      include: { userRoles: true },
    });

    if (!existing) {
      const created = await prisma.user.create({
        data: {
          email: devUser.email,
          firstName: devUser.firstName,
          lastName: devUser.lastName,
          password: devPasswordHash,
          status: "ACTIVE",
          mustChangePassword: false,
          userRoles: {
            create: {
              roleId: devUser.roleId,
            },
          },
        },
      });
      console.log(`   Created new dev user: ${created.email} (${devUser.roleName})`);
    } else {
      console.log(`   Preserved existing dev user: ${existing.email} (Already exists)`);
      // Ensure user role is linked
      const hasRole = existing.userRoles.some((ur) => ur.roleId === devUser.roleId);
      if (!hasRole) {
        await prisma.userRole.create({
          data: {
            userId: existing.id,
            roleId: devUser.roleId,
          },
        });
        console.log(`   Linked role ${devUser.roleName} to ${existing.email}`);
      }
    }
  }

  console.log("\n=== RBAC Seed Completed Successfully ===");
}

main()
  .catch((e) => {
    console.error("RBAC seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
