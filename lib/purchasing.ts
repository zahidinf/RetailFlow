import { prisma } from "@/lib/prisma";
import { requireAuth, ForbiddenError } from "@/lib/auth-guards";
import { hasPermission } from "@/lib/rbac";
import { Prisma, SupplierStatus, PurchaseOrderStatus, GoodsReceiptStatus } from "@prisma/client";

export class PurchasingAuthorizationError extends ForbiddenError {
  constructor(message: string = "Forbidden: Insufficient permissions") {
    super(message);
    this.name = "PurchasingAuthorizationError";
  }
}

export class PurchasingValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PurchasingValidationError";
  }
}

/**
 * Recursively converts any Prisma.Decimal instances into standard JS numbers
 * to prevent Next.js Flight/RSC serialization errors when passing data to Client Components.
 */
export function serializeDecimals<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (
    Prisma.Decimal.isDecimal(obj) ||
    (typeof obj === "object" &&
      obj !== null &&
      "d" in obj &&
      "e" in obj &&
      "s" in obj &&
      typeof (obj as any).toNumber === "function")
  ) {
    return (obj as any).toNumber();
  }
  if (obj instanceof Date) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => serializeDecimals(item)) as unknown as T;
  }
  if (typeof obj === "object") {
    const copy: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      copy[key] = serializeDecimals(value);
    }
    return copy as T;
  }
  return obj;
}

// ============================================================================
// SUPPLIERS SERVICE
// ============================================================================

export interface CreateSupplierInput {
  name: string;
  code?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export interface UpdateSupplierInput extends CreateSupplierInput {
  status?: SupplierStatus;
}

export interface SupplierFilterOptions {
  search?: string;
  status?: string;
}

export async function getSuppliersList(options: SupplierFilterOptions = {}) {
  const session = await requireAuth();
  const canView =
    (await hasPermission(session.id, "SUPPLIER_VIEW")) ||
    (await hasPermission(session.id, "supplier.view")) ||
    (await hasPermission(session.id, "PURCHASE_ORDER_VIEW")) ||
    (await hasPermission(session.id, "purchase_order.view")) ||
    (await hasPermission(session.id, "purchase_order_view"));

  if (!canView) {
    throw new PurchasingAuthorizationError("User does not have permission to view suppliers");
  }

  const where: Prisma.SupplierWhereInput = {};

  if (options.status && options.status !== "ALL") {
    where.status = options.status as SupplierStatus;
  }

  if (options.search && options.search.trim()) {
    const term = options.search.trim();
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { code: { contains: term, mode: "insensitive" } },
      { contactPerson: { contains: term, mode: "insensitive" } },
      { phone: { contains: term, mode: "insensitive" } },
      { email: { contains: term, mode: "insensitive" } },
    ];
  }

  return await prisma.supplier.findMany({
    where,
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          purchaseOrders: true,
          goodsReceipts: true,
        },
      },
    },
  });
}

export async function getSupplierById(supplierId: string) {
  const session = await requireAuth();
  const canView =
    (await hasPermission(session.id, "SUPPLIER_VIEW")) ||
    (await hasPermission(session.id, "supplier.view"));

  if (!canView) {
    throw new PurchasingAuthorizationError("User does not have permission to view suppliers");
  }

  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
    include: {
      purchaseOrders: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      goodsReceipts: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      _count: {
        select: {
          purchaseOrders: true,
          goodsReceipts: true,
        },
      },
    },
  });

  return serializeDecimals(supplier);
}

export async function createSupplier(input: CreateSupplierInput) {
  const session = await requireAuth();
  const canCreate =
    (await hasPermission(session.id, "SUPPLIER_CREATE")) ||
    (await hasPermission(session.id, "supplier.create"));

  if (!canCreate) {
    throw new PurchasingAuthorizationError("User does not have permission to create suppliers");
  }

  if (!input.name || !input.name.trim()) {
    throw new PurchasingValidationError("Supplier name is required");
  }

  let code = input.code?.trim().toUpperCase();
  if (!code) {
    const count = await prisma.supplier.count();
    code = `SUP-${String(count + 1).padStart(4, "0")}`;
  }

  // Check unique code
  const existing = await prisma.supplier.findUnique({ where: { code } });
  if (existing) {
    throw new PurchasingValidationError(`Supplier with code "${code}" already exists`);
  }

  return await prisma.supplier.create({
    data: {
      code,
      name: input.name.trim(),
      contactPerson: input.contactPerson?.trim() || null,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      address: input.address?.trim() || null,
      notes: input.notes?.trim() || null,
      status: "ACTIVE",
    },
  });
}

export async function updateSupplier(supplierId: string, input: UpdateSupplierInput) {
  const session = await requireAuth();
  const canUpdate =
    (await hasPermission(session.id, "SUPPLIER_UPDATE")) ||
    (await hasPermission(session.id, "supplier.update"));

  if (!canUpdate) {
    throw new PurchasingAuthorizationError("User does not have permission to update suppliers");
  }

  if (!input.name || !input.name.trim()) {
    throw new PurchasingValidationError("Supplier name is required");
  }

  const existing = await prisma.supplier.findUnique({ where: { id: supplierId } });
  if (!existing) {
    throw new PurchasingValidationError("Supplier not found");
  }

  if (input.code && input.code.trim().toUpperCase() !== existing.code) {
    const code = input.code.trim().toUpperCase();
    const duplicate = await prisma.supplier.findUnique({ where: { code } });
    if (duplicate) {
      throw new PurchasingValidationError(`Supplier with code "${code}" already exists`);
    }
  }

  return await prisma.supplier.update({
    where: { id: supplierId },
    data: {
      code: input.code ? input.code.trim().toUpperCase() : existing.code,
      name: input.name.trim(),
      contactPerson: input.contactPerson !== undefined ? input.contactPerson.trim() || null : existing.contactPerson,
      phone: input.phone !== undefined ? input.phone.trim() || null : existing.phone,
      email: input.email !== undefined ? input.email.trim() || null : existing.email,
      address: input.address !== undefined ? input.address.trim() || null : existing.address,
      notes: input.notes !== undefined ? input.notes.trim() || null : existing.notes,
      status: input.status || existing.status,
    },
  });
}

export async function toggleSupplierStatus(supplierId: string) {
  const session = await requireAuth();
  const canDelete =
    (await hasPermission(session.id, "SUPPLIER_DELETE")) ||
    (await hasPermission(session.id, "supplier.delete"));

  if (!canDelete) {
    throw new PurchasingAuthorizationError("User does not have permission to change supplier status");
  }

  const existing = await prisma.supplier.findUnique({ where: { id: supplierId } });
  if (!existing) {
    throw new PurchasingValidationError("Supplier not found");
  }

  const newStatus: SupplierStatus = existing.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

  return await prisma.supplier.update({
    where: { id: supplierId },
    data: { status: newStatus },
  });
}

// ============================================================================
// PURCHASE ORDER SERVICE
// ============================================================================

export interface CreatePOItemInput {
  productId: string;
  orderedQuantity: number;
  unitPrice: number;
  discount?: number;
  tax?: number;
}

export interface CreatePOInput {
  supplierId: string;
  notes?: string;
  items: CreatePOItemInput[];
}

export interface POFilterOptions {
  search?: string;
  supplierId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export async function getPurchaseOrdersList(options: POFilterOptions = {}) {
  const session = await requireAuth();
  const canView =
    (await hasPermission(session.id, "PURCHASE_ORDER_VIEW")) ||
    (await hasPermission(session.id, "purchase_order.view")) ||
    (await hasPermission(session.id, "purchase_order_view"));

  if (!canView) {
    throw new PurchasingAuthorizationError("User does not have permission to view purchase orders");
  }

  const where: Prisma.PurchaseOrderWhereInput = {};

  if (options.status && options.status !== "ALL") {
    where.status = options.status as PurchaseOrderStatus;
  }

  if (options.supplierId && options.supplierId !== "ALL") {
    where.supplierId = options.supplierId;
  }

  if (options.startDate || options.endDate) {
    where.poDate = {};
    if (options.startDate) {
      where.poDate.gte = new Date(options.startDate);
    }
    if (options.endDate) {
      const end = new Date(options.endDate);
      end.setHours(23, 59, 59, 999);
      where.poDate.lte = end;
    }
  }

  if (options.search && options.search.trim()) {
    const term = options.search.trim();
    where.OR = [
      { poNumber: { contains: term, mode: "insensitive" } },
      { supplier: { name: { contains: term, mode: "insensitive" } } },
      { notes: { contains: term, mode: "insensitive" } },
    ];
  }

  const pos = await prisma.purchaseOrder.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      supplier: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      approvedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
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
            },
          },
        },
      },
    },
  });

  return serializeDecimals(
    pos.map((po) => ({
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
      })),
    }))
  );
}

export async function getPurchaseOrderDetail(poId: string) {
  const session = await requireAuth();
  const canView =
    (await hasPermission(session.id, "PURCHASE_ORDER_VIEW")) ||
    (await hasPermission(session.id, "purchase_order.view")) ||
    (await hasPermission(session.id, "purchase_order_view"));

  if (!canView) {
    throw new PurchasingAuthorizationError("User does not have permission to view purchase orders");
  }

  const po = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
    include: {
      supplier: true,
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      approvedBy: {
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
        },
      },
      goodsReceipts: {
        orderBy: { createdAt: "desc" },
        include: {
          receivedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
  });

  if (!po) return null;

  return serializeDecimals({
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
  });
}

export async function createPurchaseOrder(input: CreatePOInput) {
  const session = await requireAuth();
  const canCreate =
    (await hasPermission(session.id, "PURCHASE_ORDER_CREATE")) ||
    (await hasPermission(session.id, "purchase_order.create")) ||
    (await hasPermission(session.id, "PURCHASE")) ||
    (await hasPermission(session.id, "purchase"));

  if (!canCreate) {
    throw new PurchasingAuthorizationError("User does not have permission to create purchase orders");
  }

  if (!input.supplierId) {
    throw new PurchasingValidationError("Supplier must be selected");
  }

  const supplier = await prisma.supplier.findUnique({ where: { id: input.supplierId } });
  if (!supplier) {
    throw new PurchasingValidationError("Selected supplier not found");
  }

  if (supplier.status !== "ACTIVE") {
    throw new PurchasingValidationError("Cannot create Purchase Order for an INACTIVE supplier");
  }

  if (!input.items || input.items.length === 0) {
    throw new PurchasingValidationError("Purchase Order must contain at least one item");
  }

  let subtotal = new Prisma.Decimal(0);
  let totalDiscount = new Prisma.Decimal(0);
  let totalTax = new Prisma.Decimal(0);

  const poItemsData: {
    productId: string;
    orderedQuantity: number;
    unitPrice: Prisma.Decimal;
    discount: Prisma.Decimal;
    tax: Prisma.Decimal;
    totalPrice: Prisma.Decimal;
  }[] = [];

  for (const item of input.items) {
    if (!item.productId) {
      throw new PurchasingValidationError("Product must be selected for all items");
    }
    if (!Number.isInteger(item.orderedQuantity) || item.orderedQuantity <= 0) {
      throw new PurchasingValidationError("Ordered quantity must be a positive integer");
    }
    if (typeof item.unitPrice !== "number" || item.unitPrice < 0) {
      throw new PurchasingValidationError("Unit price must be a valid non-negative number");
    }

    const product = await prisma.product.findUnique({ where: { id: item.productId } });
    if (!product) {
      throw new PurchasingValidationError(`Product not found: ${item.productId}`);
    }

    const price = new Prisma.Decimal(item.unitPrice);
    const itemDiscount = new Prisma.Decimal(item.discount || 0);
    const itemTax = new Prisma.Decimal(item.tax || 0);
    const lineSubtotal = price.mul(item.orderedQuantity);
    const lineTotal = lineSubtotal.sub(itemDiscount).add(itemTax);

    subtotal = subtotal.add(lineSubtotal);
    totalDiscount = totalDiscount.add(itemDiscount);
    totalTax = totalTax.add(itemTax);

    poItemsData.push({
      productId: item.productId,
      orderedQuantity: item.orderedQuantity,
      unitPrice: price,
      discount: itemDiscount,
      tax: itemTax,
      totalPrice: lineTotal,
    });
  }

  const grandTotal = subtotal.sub(totalDiscount).add(totalTax);

  // Generate unique PO number: PO-YYYYMMDD-HHMMSS-RAND
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  const poNumber = `PO-${dateStr}-${timeStr}-${rand}`;

  return await prisma.purchaseOrder.create({
    data: {
      poNumber,
      supplierId: input.supplierId,
      status: "DRAFT",
      notes: input.notes?.trim() || null,
      subtotal,
      discount: totalDiscount,
      tax: totalTax,
      totalAmount: grandTotal,
      createdById: session.id,
      items: {
        create: poItemsData,
      },
    },
    include: {
      items: true,
    },
  });
}

export async function submitPurchaseOrder(poId: string) {
  const session = await requireAuth();
  const canSubmit =
    (await hasPermission(session.id, "PURCHASE_ORDER_SUBMIT")) ||
    (await hasPermission(session.id, "purchase_order.submit"));

  if (!canSubmit) {
    throw new PurchasingAuthorizationError("User does not have permission to submit purchase orders");
  }

  const po = await prisma.purchaseOrder.findUnique({ where: { id: poId } });
  if (!po) {
    throw new PurchasingValidationError("Purchase order not found");
  }

  if (po.status !== "DRAFT") {
    throw new PurchasingValidationError(`Cannot submit PO in status "${po.status}". Only DRAFT purchase orders can be submitted.`);
  }

  return await prisma.purchaseOrder.update({
    where: { id: poId },
    data: { status: "SUBMITTED" },
  });
}

export async function approvePurchaseOrder(poId: string) {
  const session = await requireAuth();
  const canApprove =
    (await hasPermission(session.id, "PURCHASE_ORDER_APPROVE")) ||
    (await hasPermission(session.id, "purchase_order.approve"));

  if (!canApprove) {
    throw new PurchasingAuthorizationError("User does not have permission to approve purchase orders. Approval requires Manager or Admin authority.");
  }

  const po = await prisma.purchaseOrder.findUnique({ where: { id: poId } });
  if (!po) {
    throw new PurchasingValidationError("Purchase order not found");
  }

  if (po.status !== "SUBMITTED") {
    throw new PurchasingValidationError(`Cannot approve PO in status "${po.status}". Only SUBMITTED purchase orders can be approved.`);
  }

  return await prisma.purchaseOrder.update({
    where: { id: poId },
    data: {
      status: "APPROVED",
      approvedById: session.id,
      approvedAt: new Date(),
    },
  });
}

export async function cancelPurchaseOrder(poId: string) {
  const session = await requireAuth();
  const canCancel =
    (await hasPermission(session.id, "PURCHASE_ORDER_CANCEL")) ||
    (await hasPermission(session.id, "purchase_order.cancel"));

  if (!canCancel) {
    throw new PurchasingAuthorizationError("User does not have permission to cancel purchase orders");
  }

  const po = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
    include: { goodsReceipts: true },
  });

  if (!po) {
    throw new PurchasingValidationError("Purchase order not found");
  }

  if (po.status === "RECEIVED" || po.status === "PARTIALLY_RECEIVED") {
    throw new PurchasingValidationError("Cannot cancel a purchase order that has already received goods");
  }

  if (po.status === "CANCELLED") {
    throw new PurchasingValidationError("Purchase order is already cancelled");
  }

  return await prisma.purchaseOrder.update({
    where: { id: poId },
    data: { status: "CANCELLED" },
  });
}

// ============================================================================
// GOODS RECEIPT SERVICE
// ============================================================================

export interface CreateGRItemInput {
  purchaseOrderItemId: string;
  receivedQuantity: number;
}

export interface CreateGRInput {
  purchaseOrderId: string;
  notes?: string;
  items: CreateGRItemInput[];
}

export interface GRFilterOptions {
  search?: string;
  status?: string;
  supplierId?: string;
  startDate?: string;
  endDate?: string;
}

export async function getGoodsReceiptsList(options: GRFilterOptions = {}) {
  const session = await requireAuth();
  const canView =
    (await hasPermission(session.id, "GOODS_RECEIPT_VIEW")) ||
    (await hasPermission(session.id, "goods_receipt.view"));

  if (!canView) {
    throw new PurchasingAuthorizationError("User does not have permission to view goods receipts");
  }

  const where: Prisma.GoodsReceiptWhereInput = {};

  if (options.status && options.status !== "ALL") {
    where.status = options.status as GoodsReceiptStatus;
  }

  if (options.supplierId && options.supplierId !== "ALL") {
    where.supplierId = options.supplierId;
  }

  if (options.startDate || options.endDate) {
    where.grDate = {};
    if (options.startDate) {
      where.grDate.gte = new Date(options.startDate);
    }
    if (options.endDate) {
      const end = new Date(options.endDate);
      end.setHours(23, 59, 59, 999);
      where.grDate.lte = end;
    }
  }

  if (options.search && options.search.trim()) {
    const term = options.search.trim();
    where.OR = [
      { grNumber: { contains: term, mode: "insensitive" } },
      { purchaseOrder: { poNumber: { contains: term, mode: "insensitive" } } },
      { supplier: { name: { contains: term, mode: "insensitive" } } },
      { notes: { contains: term, mode: "insensitive" } },
    ];
  }

  const receipts = await prisma.goodsReceipt.findMany({
    where,
    orderBy: { createdAt: "desc" },
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
            },
          },
        },
      },
    },
  });

  return serializeDecimals(
    receipts.map((r) => ({
      ...r,
      items: r.items.map((i) => ({
        ...i,
        unitPrice: Number(i.unitPrice),
        totalPrice: Number(i.totalPrice),
      })),
    }))
  );
}

export async function getGoodsReceiptDetail(grId: string) {
  const session = await requireAuth();
  const canView =
    (await hasPermission(session.id, "GOODS_RECEIPT_VIEW")) ||
    (await hasPermission(session.id, "goods_receipt.view"));

  if (!canView) {
    throw new PurchasingAuthorizationError("User does not have permission to view goods receipts");
  }

  const receipt = await prisma.goodsReceipt.findUnique({
    where: { id: grId },
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

  if (!receipt) return null;

  return serializeDecimals({
    ...receipt,
    items: receipt.items.map((i) => ({
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
}

export async function getEligiblePOsForReceiving() {
  const session = await requireAuth();
  const canView =
    (await hasPermission(session.id, "PURCHASE_ORDER_VIEW")) ||
    (await hasPermission(session.id, "purchase_order.view"));

  if (!canView) {
    throw new PurchasingAuthorizationError("User does not have permission to view purchase orders");
  }

  const pos = await prisma.purchaseOrder.findMany({
    where: {
      status: {
        in: ["APPROVED", "PARTIALLY_RECEIVED"],
      },
    },
    include: {
      supplier: {
        select: {
          id: true,
          code: true,
          name: true,
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
        },
      },
    },
    orderBy: { poDate: "desc" },
  });

  return serializeDecimals(
    pos.map((po) => ({
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
}

export async function createGoodsReceipt(input: CreateGRInput) {
  const session = await requireAuth();
  const canCreate =
    (await hasPermission(session.id, "GOODS_RECEIPT_CREATE")) ||
    (await hasPermission(session.id, "goods_receipt.create")) ||
    (await hasPermission(session.id, "RECEIPT_GOODS")) ||
    (await hasPermission(session.id, "receipt_goods"));

  if (!canCreate) {
    throw new PurchasingAuthorizationError("User does not have permission to create goods receipts");
  }

  if (!input.purchaseOrderId) {
    throw new PurchasingValidationError("Purchase order must be selected");
  }

  const po = await prisma.purchaseOrder.findUnique({
    where: { id: input.purchaseOrderId },
    include: { items: true, supplier: true },
  });

  if (!po) {
    throw new PurchasingValidationError("Purchase order not found");
  }

  if (po.status !== "APPROVED" && po.status !== "PARTIALLY_RECEIVED") {
    throw new PurchasingValidationError(
      `Cannot receive goods for PO in status "${po.status}". Purchase Order must be APPROVED or PARTIALLY_RECEIVED.`
    );
  }

  if (!input.items || input.items.length === 0) {
    throw new PurchasingValidationError("At least one item must be included in Goods Receipt");
  }

  // Validate quantities
  const grItemsData: {
    purchaseOrderItemId: string;
    productId: string;
    receivedQuantity: number;
    unitPrice: Prisma.Decimal;
    totalPrice: Prisma.Decimal;
  }[] = [];

  let totalReceivedItems = 0;

  for (const itemInput of input.items) {
    const poItem = po.items.find((i) => i.id === itemInput.purchaseOrderItemId);
    if (!poItem) {
      throw new PurchasingValidationError(`PO Item not found: ${itemInput.purchaseOrderItemId}`);
    }

    if (!Number.isInteger(itemInput.receivedQuantity) || itemInput.receivedQuantity < 0) {
      throw new PurchasingValidationError("Received quantity must be a non-negative integer");
    }

    const remaining = poItem.orderedQuantity - poItem.receivedQuantity;
    if (itemInput.receivedQuantity > remaining) {
      throw new PurchasingValidationError(
        `Received quantity (${itemInput.receivedQuantity}) cannot exceed remaining quantity (${remaining}) for product ID ${poItem.productId}`
      );
    }

    if (itemInput.receivedQuantity > 0) {
      totalReceivedItems += itemInput.receivedQuantity;
      const itemTotal = poItem.unitPrice.mul(itemInput.receivedQuantity);
      grItemsData.push({
        purchaseOrderItemId: poItem.id,
        productId: poItem.productId,
        receivedQuantity: itemInput.receivedQuantity,
        unitPrice: poItem.unitPrice,
        totalPrice: itemTotal,
      });
    }
  }

  if (totalReceivedItems === 0) {
    throw new PurchasingValidationError("At least one item must have received quantity greater than 0");
  }

  // Generate unique GR number: GR-YYYYMMDD-HHMMSS-RAND
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  const grNumber = `GR-${dateStr}-${timeStr}-${rand}`;

  return await prisma.goodsReceipt.create({
    data: {
      grNumber,
      purchaseOrderId: po.id,
      supplierId: po.supplierId,
      status: "DRAFT",
      receivedById: session.id,
      notes: input.notes?.trim() || null,
      items: {
        create: grItemsData,
      },
    },
    include: {
      items: true,
    },
  });
}

/**
 * Confirm Goods Receipt:
 * - Atomically increments Stock.currentStock for each item.
 * - Creates auditable StockMovement record (type: PURCHASE, referenceType: GOODS_RECEIPT).
 * - Increments PurchaseOrderItem.receivedQuantity.
 * - Updates PurchaseOrder status (PARTIALLY_RECEIVED or RECEIVED).
 * - Updates GoodsReceipt status to CONFIRMED.
 * - Strictly idempotent: Rejects duplicate confirmations.
 */
export async function confirmGoodsReceipt(grId: string) {
  const session = await requireAuth();
  const canConfirm =
    (await hasPermission(session.id, "GOODS_RECEIPT_CONFIRM")) ||
    (await hasPermission(session.id, "goods_receipt.confirm")) ||
    (await hasPermission(session.id, "RECEIPT_GOODS_CONFIRM")) ||
    (await hasPermission(session.id, "receipt_goods.confirm"));

  if (!canConfirm) {
    throw new PurchasingAuthorizationError(
      "User does not have permission to confirm goods receipts. Only authorized Warehouse staff can confirm physical goods receiving."
    );
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Lock and load Goods Receipt
    const gr = await tx.goodsReceipt.findUnique({
      where: { id: grId },
      include: {
        items: true,
        purchaseOrder: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!gr) {
      throw new PurchasingValidationError("Goods receipt not found");
    }

    // Idempotency check: Cannot confirm twice
    if (gr.status === "CONFIRMED") {
      throw new PurchasingValidationError("This goods receipt has already been confirmed. Duplicate confirmation rejected.");
    }

    if (gr.status === "CANCELLED") {
      throw new PurchasingValidationError("Cannot confirm a cancelled goods receipt");
    }

    // 2. Process each item: update stock and create stock movement
    for (const item of gr.items) {
      if (item.receivedQuantity <= 0) continue;

      // Lock current stock record
      let stock = await tx.stock.findUnique({
        where: { productId: item.productId },
      });

      if (!stock) {
        stock = await tx.stock.create({
          data: {
            productId: item.productId,
            currentStock: 0,
          },
        });
      }

      const previousStock = stock.currentStock;
      const newStock = previousStock + item.receivedQuantity;

      // Update Stock
      await tx.stock.update({
        where: { productId: item.productId },
        data: { currentStock: newStock },
      });

      // Create Stock Movement
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          type: "PURCHASE",
          quantity: item.receivedQuantity,
          previousStock,
          newStock,
          reason: `Goods Receipt #${gr.grNumber} for PO #${gr.purchaseOrder.poNumber}`,
          referenceType: "GOODS_RECEIPT",
          referenceId: gr.id,
          userId: session.id,
        },
      });

      // Update PO Item receivedQuantity
      await tx.purchaseOrderItem.update({
        where: { id: item.purchaseOrderItemId },
        data: {
          receivedQuantity: {
            increment: item.receivedQuantity,
          },
        },
      });
    }

    // 3. Mark GR as CONFIRMED
    const updatedGR = await tx.goodsReceipt.update({
      where: { id: gr.id },
      data: { status: "CONFIRMED" },
      include: {
        items: true,
        purchaseOrder: {
          include: { items: true },
        },
      },
    });

    // 4. Recalculate PO Status
    const poItems = await tx.purchaseOrderItem.findMany({
      where: { purchaseOrderId: gr.purchaseOrderId },
    });

    const allFullyReceived = poItems.every((i) => i.receivedQuantity >= i.orderedQuantity);
    const someReceived = poItems.some((i) => i.receivedQuantity > 0);

    const newPOStatus: PurchaseOrderStatus = allFullyReceived
      ? "RECEIVED"
      : someReceived
      ? "PARTIALLY_RECEIVED"
      : gr.purchaseOrder.status;

    await tx.purchaseOrder.update({
      where: { id: gr.purchaseOrderId },
      data: { status: newPOStatus },
    });

    return updatedGR;
  });
}

export async function cancelGoodsReceipt(grId: string) {
  const session = await requireAuth();
  const canCancel =
    (await hasPermission(session.id, "GOODS_RECEIPT_CANCEL")) ||
    (await hasPermission(session.id, "goods_receipt.cancel"));

  if (!canCancel) {
    throw new PurchasingAuthorizationError("User does not have permission to cancel goods receipts");
  }

  const gr = await prisma.goodsReceipt.findUnique({ where: { id: grId } });
  if (!gr) {
    throw new PurchasingValidationError("Goods receipt not found");
  }

  if (gr.status === "CONFIRMED") {
    throw new PurchasingValidationError("Confirmed goods receipts cannot be deleted or cancelled directly to preserve inventory audit trail.");
  }

  if (gr.status === "CANCELLED") {
    throw new PurchasingValidationError("Goods receipt is already cancelled");
  }

  return await prisma.goodsReceipt.update({
    where: { id: grId },
    data: { status: "CANCELLED" },
  });
}
