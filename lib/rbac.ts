import { prisma } from "@/lib/prisma";

const PERMISSION_CACHE = new Map<string, string[]>();

const PERMISSION_ALIASES: Record<string, string[]> = {
  // Category
  "CATEGORY_VIEW": ["category.view"],
  "CATEGORY_CREATE": ["category.create"],
  "CATEGORY_UPDATE": ["category.update"],
  "CATEGORY_DELETE": ["category.delete"],

  // Product
  "PRODUCT_VIEW": ["product.view"],
  "PRODUCT_CREATE": ["product.create"],
  "PRODUCT_UPDATE": ["product.update"],
  "PRODUCT_DELETE": ["product.delete"],

  // Inventory / Stock
  "STOCK_VIEW": ["inventory.view", "stock.view"],
  "STOCK_UPDATE": ["inventory.adjust", "stock.update"],
  "INVENTORY_MOVEMENT_VIEW": ["inventory.movement.view", "stock.movement.view"],

  // POS & Sales
  "POS_ACCESS": ["pos.access"],
  "POS_SALE_CREATE": ["pos.sale.create", "sales.create", "sale.create"],
  "SALES_VIEW": ["sales.view", "sale.view"],
  "SALES_VIEW_OWN": ["sales.view_own", "sale.view_own"],
  "SALES_VIEW_ALL": ["sales.view_all", "sale.view_all"],
  "SALES_DETAIL": ["sales.detail", "sale.detail"],
  "SALES_DETAIL_OWN": ["sales.detail_own", "sale.detail_own"],
  "SALES_DETAIL_ALL": ["sales.detail_all", "sale.detail_all"],
  "SALES_VOID": ["sales.void", "sale.void"],
  "SALES_REFUND": [
    "sales.refund",
    "sale.refund",
    "refund.create",
    "transaction_refund_create",
    "transaction.refund.create",
    "TRANSACTION_REFUND_CREATE",
  ],
  "TRANSACTION_REFUND_CREATE": [
    "sales.refund",
    "sale.refund",
    "refund.create",
    "transaction_refund_create",
    "transaction.refund.create",
    "SALES_REFUND",
  ],
  "SALES_REFUND_APPROVE": [
    "sales.refund_approve",
    "sale.refund_approve",
    "refund.approve",
    "transaction_refund_approve",
    "transaction.refund.approve",
    "TRANSACTION_REFUND_APPROVE",
  ],
  "TRANSACTION_REFUND_APPROVE": [
    "sales.refund_approve",
    "sale.refund_approve",
    "refund.approve",
    "transaction_refund_approve",
    "transaction.refund.approve",
    "SALES_REFUND_APPROVE",
  ],

  // Parameter Settings
  "PARAMETER_SETTINGS_VIEW": [
    "parameter.view",
    "parameter_settings.view",
    "parameter-settings.view",
    "parameter.settings.view",
  ],
  "PARAMETER_SETTINGS_CREATE": [
    "parameter.create",
    "parameter_settings.create",
    "parameter-settings.create",
    "parameter.settings.create",
  ],
  "PARAMETER_SETTINGS_UPDATE": [
    "parameter.update",
    "parameter_settings.update",
    "parameter-settings.update",
    "parameter.settings.update",
  ],
  "PARAMETER_SETTINGS_DELETE": [
    "parameter.delete",
    "parameter_settings.delete",
    "parameter-settings.delete",
    "parameter.settings.delete",
  ],

  // Supplier Management
  "SUPPLIER_VIEW": ["supplier.view", "suppliers.view"],
  "SUPPLIER_CREATE": ["supplier.create", "suppliers.create"],
  "SUPPLIER_UPDATE": ["supplier.update", "suppliers.update"],
  "SUPPLIER_DELETE": ["supplier.delete", "suppliers.delete", "supplier.deactivate"],

  // Purchase Order Management
  "PURCHASE_ORDER_VIEW": [
    "purchase_order.view",
    "purchase_order_view",
    "po.view",
    "po_view",
    "purchase.view",
    "purchasing.view",
    "purchase_view",
    "purchasing_view",
    "PURCHASE_VIEW",
    "PURCHASING_VIEW",
  ],
  "purchase_order_view": [
    "PURCHASE_ORDER_VIEW",
    "purchase_order.view",
    "po.view",
    "po_view",
    "purchase.view",
    "purchasing.view",
    "PURCHASE_VIEW",
    "PURCHASING_VIEW",
  ],
  "PURCHASE_ORDER_CREATE": [
    "purchase_order.create",
    "po.create",
    "purchase.create",
    "purchasing.create",
    "purchasing.purchase",
    "purchase_order_create",
    "purchase",
    "PURCHASE",
    "PURCHASE_CREATE",
    "PURCHASING_CREATE",
  ],
  "PURCHASE": [
    "PURCHASE_ORDER_CREATE",
    "purchase_order.create",
    "po.create",
    "purchase.create",
    "purchasing.create",
    "purchasing.purchase",
    "purchase_order_create",
    "purchase",
  ],
  "PURCHASE_ORDER_UPDATE": ["purchase_order.update", "po.update", "purchase.update", "PURCHASE_UPDATE"],
  "PURCHASE_ORDER_SUBMIT": ["purchase_order.submit", "po.submit", "purchase.submit", "PURCHASE_SUBMIT"],
  "PURCHASE_ORDER_APPROVE": ["purchase_order.approve", "po.approve", "purchase.approve", "PURCHASE_APPROVE"],
  "PURCHASE_ORDER_CANCEL": ["purchase_order.cancel", "po.cancel", "purchase.cancel", "PURCHASE_CANCEL"],

  // Goods Receipt Management
  "GOODS_RECEIPT_VIEW": [
    "goods_receipt.view",
    "gr.view",
    "receipt.view",
    "receipt_goods.view",
    "receipt_goods_view",
    "RECEIPT_GOODS_VIEW",
  ],
  "GOODS_RECEIPT_CREATE": [
    "goods_receipt.create",
    "gr.create",
    "receipt.create",
    "receipt_goods",
    "receipt_goods.create",
    "receipt_goods_create",
    "receipt-goods",
    "RECEIPT_GOODS",
    "RECEIPT_GOODS_CREATE",
  ],
  "RECEIPT_GOODS": [
    "GOODS_RECEIPT_CREATE",
    "goods_receipt.create",
    "gr.create",
    "receipt.create",
    "receipt_goods.create",
    "receipt_goods_create",
    "receipt-goods",
    "receipt_goods",
  ],
  "GOODS_RECEIPT_UPDATE": ["goods_receipt.update", "gr.update", "receipt.update", "receipt_goods.update", "RECEIPT_GOODS_UPDATE"],
  "GOODS_RECEIPT_CONFIRM": ["goods_receipt.confirm", "gr.confirm", "receipt.confirm", "receipt_goods.confirm", "RECEIPT_GOODS_CONFIRM"],
  "GOODS_RECEIPT_CANCEL": ["goods_receipt.cancel", "gr.cancel", "receipt.cancel", "receipt_goods.cancel", "RECEIPT_GOODS_CANCEL"],

  // Reports
  "REPORT_VIEW": ["report.view", "reports.view"],
  "REPORT_SALES_VIEW": ["report.sales.view", "report_sales_view", "sales_report.view"],
  "REPORT_INVENTORY_VIEW": ["report.inventory.view", "report_inventory_view", "inventory_report.view"],
  "REPORT_PURCHASING_VIEW": ["report.purchasing.view", "report_purchasing_view", "purchasing_report.view"],
  "REPORT_WAREHOUSE_VIEW": ["report.warehouse.view", "report_warehouse_view", "warehouse_report.view"],
  "REPORT_FINANCE_VIEW": ["report.finance.view", "report_finance_view", "finance_report.view"],
  "REPORT_CASHIER_VIEW": ["report.cashier.view", "report_cashier_view", "cashier_report.view"],
  "REPORT_AUDIT_VIEW": ["report.audit.view", "report_audit_view", "audit_report.view"],
  "REPORT_EXPORT": ["report.export", "report_export"],
};

const REVERSE_ALIASES: Record<string, string> = {};
for (const [canonical, aliases] of Object.entries(PERMISSION_ALIASES)) {
  for (const alias of aliases) {
    REVERSE_ALIASES[alias.toLowerCase()] = canonical;
  }
}

export async function getUserPermissions(userId: string): Promise<string[]> {
  // Check cache first
  if (PERMISSION_CACHE.has(userId)) {
    return PERMISSION_CACHE.get(userId)!;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
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

  const permissions = (() => {
    if (!user) return [];

    const permissionSet = new Set<string>();

    for (const userRole of user.userRoles) {
      for (const rolePermission of userRole.role.rolePermissions) {
        const permName = rolePermission.permission.name;
        permissionSet.add(permName);
        const aliases = PERMISSION_ALIASES[permName];
        if (aliases) {
          for (const alias of aliases) {
            permissionSet.add(alias);
          }
        }
      }
    }

    return Array.from(permissionSet);
  })();

  // Cache for 5 minutes (300 seconds)
  PERMISSION_CACHE.set(userId, permissions);
  const timer = setTimeout(() => PERMISSION_CACHE.delete(userId), 300000);
  if (typeof timer.unref === "function") {
    timer.unref();
  }

  return permissions;
}

export async function hasPermission(
  userId: string,
  permission: string
): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  const normalized = permission.trim();
  const canonical = REVERSE_ALIASES[normalized.toLowerCase()] || normalized;
  return (
    permissions.includes(normalized) ||
    permissions.includes(canonical) ||
    permissions.includes(normalized.toUpperCase()) ||
    permissions.includes(normalized.toLowerCase())
  );
}

export async function requirePermission(
  userId: string,
  permission: string
): Promise<void> {
  const has = await hasPermission(userId, permission);
  if (!has) {
    throw new Error("Unauthorized: Missing required permission");
  }
}

export async function invalidatePermissionCache(userId: string): Promise<void> {
  PERMISSION_CACHE.delete(userId);
}

export function clearAllPermissionCaches(): void {
  PERMISSION_CACHE.clear();
}

