import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guards";
import { hasPermission } from "@/lib/rbac";
import { Prisma } from "@prisma/client";

export class SalesAuthorizationError extends Error {
  constructor(message: string = "Forbidden: Insufficient permissions for sales operations") {
    super(message);
    this.name = "SalesAuthorizationError";
  }
}

export interface CreateSaleItemInput {
  productId: string;
  quantity: number;
  discount?: number;
  unitPrice?: number;
  isFreeReward?: boolean;
  promotionId?: string;
}

export interface AppliedPromotionInput {
  promotionId: string;
  promotionCode: string;
  promotionName: string;
  promotionType: string;
  discountAmount: number;
  details?: Record<string, any>;
}

export interface CreateSaleInput {
  items: CreateSaleItemInput[];
  appliedPromotions?: AppliedPromotionInput[];
  paymentMethod?: string;
  paymentReceived?: number;
  change?: number;
}

export interface SalesFilterOptions {
  startDate?: string | Date;
  endDate?: string | Date;
  cashierId?: string;
  paymentMethod?: string;
}

/**
 * Create a new sale from POS.
 * Enforces POS permissions (pos.access, pos.sale.create).
 * Scopes cashierId strictly to the authenticated user.
 * Automatically deducts stock and records stock movements.
 * Does NOT require inventory.adjust permission.
 */
export async function createSaleTransaction(input: CreateSaleInput) {
  const session = await requireAuth();

  // 1. Verify permissions
  const canAccessPos =
    (await hasPermission(session.id, "POS_ACCESS")) ||
    (await hasPermission(session.id, "pos.access"));
  const canCreateSale =
    (await hasPermission(session.id, "POS_SALE_CREATE")) ||
    (await hasPermission(session.id, "pos.sale.create"));

  if (!canAccessPos || !canCreateSale) {
    throw new SalesAuthorizationError("User does not have permission to create sales at POS");
  }

  // 2. Validate input
  if (!input.items || input.items.length === 0) {
    throw new Error("Sale must contain at least one item");
  }

  for (const item of input.items) {
    if (!item.productId || typeof item.quantity !== "number" || item.quantity <= 0) {
      throw new Error("Invalid product or quantity in sale items");
    }
    if (!Number.isInteger(item.quantity)) {
      throw new Error("Item quantity must be an integer");
    }
  }

  // 3. Process sale and stock deduction in transaction
  return await prisma.$transaction(async (tx) => {
    let totalAmount = new Prisma.Decimal(0);
    const saleItemsData: {
      productId: string;
      quantity: number;
      unitPrice: Prisma.Decimal;
      totalPrice: Prisma.Decimal;
      discount: Prisma.Decimal;
      isFreeReward: boolean;
      promotionId?: string | null;
    }[] = [];

    const stockDeductions: {
      productId: string;
      quantity: number;
      previousStock: number;
      newStock: number;
    }[] = [];

    for (const item of input.items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
        include: { stock: true },
      });

      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }

      if (product.status !== "ACTIVE") {
        throw new Error(`Product is not active: ${product.name}`);
      }

      const currentStock = product.stock?.currentStock ?? 0;
      if (currentStock < item.quantity) {
        throw new Error(
          `Insufficient stock for "${product.name}". Available: ${currentStock}, Requested: ${item.quantity}`
        );
      }

      // Unit price: either special promotional price or master selling price
      const effectiveUnitPrice = item.unitPrice !== undefined ? new Prisma.Decimal(item.unitPrice) : product.sellingPrice;
      const discount = item.discount !== undefined ? new Prisma.Decimal(item.discount) : new Prisma.Decimal(0);
      const isFreeReward = Boolean(item.isFreeReward);

      // If item is completely free reward, line total is 0
      const itemTotal = isFreeReward
        ? new Prisma.Decimal(0)
        : effectiveUnitPrice.mul(item.quantity).sub(discount);

      const finalLineTotal = itemTotal.greaterThan(0) ? itemTotal : new Prisma.Decimal(0);
      totalAmount = totalAmount.add(finalLineTotal);

      saleItemsData.push({
        productId: product.id,
        quantity: item.quantity,
        unitPrice: effectiveUnitPrice,
        totalPrice: finalLineTotal,
        discount,
        isFreeReward,
        promotionId: item.promotionId || null,
      });

      // Crucial: Physical inventory deduction applies to ALL items including free rewards!
      stockDeductions.push({
        productId: product.id,
        quantity: item.quantity,
        previousStock: currentStock,
        newStock: currentStock - item.quantity,
      });
    }

    // Generate unique sale number: SALE-YYYYMMDD-HHMMSS-RAND
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, "");
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const saleNumber = `SALE-${dateStr}-${timeStr}-${randSuffix}`;

    // Validate payment if provided
    let paymentReceivedDecimal = totalAmount;
    let changeDecimal = new Prisma.Decimal(0);
    if (input.paymentReceived !== undefined) {
      if (typeof input.paymentReceived !== "number" || isNaN(input.paymentReceived)) {
        throw new Error("Invalid payment amount");
      }
      if (input.paymentReceived < Number(totalAmount)) {
        throw new Error("Insufficient payment amount");
      }
      paymentReceivedDecimal = new Prisma.Decimal(input.paymentReceived);
      const calculatedChange = input.change !== undefined ? input.change : input.paymentReceived - Number(totalAmount);
      changeDecimal = new Prisma.Decimal(calculatedChange);
    }

    // Prepare promotions records if any
    const promotionsCreateData = (input.appliedPromotions || []).map((p) => ({
      promotionId: p.promotionId,
      promotionCode: p.promotionCode,
      promotionName: p.promotionName,
      promotionType: p.promotionType,
      discountAmount: new Prisma.Decimal(p.discountAmount || 0),
      details: p.details ? JSON.parse(JSON.stringify(p.details)) : undefined,
    }));

    // Create Sale record strictly with session.id as cashierId
    const sale = await tx.sale.create({
      data: {
        saleNumber,
        cashierId: session.id, // Strictly server-derived
        totalAmount,
        paymentMethod: input.paymentMethod || "CASH",
        paymentReceived: paymentReceivedDecimal,
        change: changeDecimal,
        status: "COMPLETED",
        items: {
          create: saleItemsData,
        },
        promotions: {
          create: promotionsCreateData,
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                sku: true,
                name: true,
                unit: true,
                sellingPrice: true,
              },
            },
          },
        },
        promotions: true,
        cashier: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Automatically deduct stock & create StockMovement records
    for (const deduction of stockDeductions) {
      await tx.stock.update({
        where: { productId: deduction.productId },
        data: {
          currentStock: deduction.newStock,
        },
      });

      await tx.stockMovement.create({
        data: {
          productId: deduction.productId,
          type: "SALE",
          quantity: -deduction.quantity,
          previousStock: deduction.previousStock,
          newStock: deduction.newStock,
          reason: `POS Sale #${sale.saleNumber}`,
          referenceType: "SALE",
          referenceId: sale.id,
          userId: session.id,
        },
      });
    }

    return {
      ...sale,
      totalAmount: Number(sale.totalAmount),
      paymentReceived: sale.paymentReceived != null ? Number(sale.paymentReceived) : Number(sale.totalAmount),
      change: sale.change != null ? Number(sale.change) : 0,
      items: sale.items.map((i) => ({
        ...i,
        unitPrice: Number(i.unitPrice),
        totalPrice: Number(i.totalPrice),
        discount: Number(i.discount),
        product: {
          ...i.product,
          sellingPrice: Number(i.product.sellingPrice),
        },
      })),
      promotions: (sale.promotions || []).map((p) => ({
        ...p,
        discountAmount: Number(p.discountAmount),
      })),
    };
  });
}

/**
 * Get list of sales with data scoping:
 * - Cashier can only see their own sales (cashierId = session.id).
 * - Manager / Admin / Super Admin can see all sales or filter by cashier.
 */
export async function getSalesList(options: SalesFilterOptions = {}) {
  const session = await requireAuth();

  const canViewAll =
    (await hasPermission(session.id, "SALES_VIEW_ALL")) ||
    (await hasPermission(session.id, "sales.view_all"));

  const canViewOwn =
    canViewAll ||
    (await hasPermission(session.id, "SALES_VIEW_OWN")) ||
    (await hasPermission(session.id, "sales.view_own")) ||
    (await hasPermission(session.id, "SALES_VIEW")) ||
    (await hasPermission(session.id, "sales.view"));

  if (!canViewOwn) {
    throw new SalesAuthorizationError("User does not have permission to view sales");
  }

  const where: Prisma.SaleWhereInput = {};

  // Scope Cashier strictly to own sales
  if (!canViewAll) {
    where.cashierId = session.id;
  } else if (options.cashierId && options.cashierId.trim()) {
    where.cashierId = options.cashierId.trim();
  }

  if (options.paymentMethod && options.paymentMethod.trim()) {
    where.paymentMethod = options.paymentMethod.trim();
  }

  if (options.startDate || options.endDate) {
    where.createdAt = {};
    if (options.startDate) {
      where.createdAt.gte = new Date(options.startDate);
    }
    if (options.endDate) {
      const end = new Date(options.endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  const sales = await prisma.sale.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      cashier: {
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
            },
          },
        },
      },
    },
  });

  return sales.map((s) => ({
    ...s,
    totalAmount: Number(s.totalAmount),
    paymentReceived: s.paymentReceived != null ? Number(s.paymentReceived) : Number(s.totalAmount),
    change: s.change != null ? Number(s.change) : 0,
    items: s.items.map((i) => ({
      ...i,
      unitPrice: Number(i.unitPrice),
      totalPrice: Number(i.totalPrice),
    })),
  }));
}

/**
 * Get single sale detail with scoping:
 * - Cashier can only see their own sale details.
 * - Manager / Admin / Super Admin can see any sale detail.
 */
export async function getSaleDetailById(saleId: string) {
  const session = await requireAuth();

  const canDetailAll =
    (await hasPermission(session.id, "SALES_DETAIL_ALL")) ||
    (await hasPermission(session.id, "sales.detail_all"));

  const canDetailOwn =
    canDetailAll ||
    (await hasPermission(session.id, "SALES_DETAIL_OWN")) ||
    (await hasPermission(session.id, "sales.detail_own")) ||
    (await hasPermission(session.id, "SALES_DETAIL")) ||
    (await hasPermission(session.id, "sales.detail"));

  if (!canDetailOwn) {
    throw new SalesAuthorizationError("User does not have permission to view sale details");
  }

  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: {
      cashier: {
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
              barcode: true,
              name: true,
              unit: true,
              sellingPrice: true,
              refundable: true,
            },
          },
        },
      },
      promotions: true,
      refunds: {
        orderBy: { createdAt: "desc" },
        include: {
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
                },
              },
            },
          },
        },
      },
    },
  });

  if (!sale) {
    return null;
  }

  // Scoping check for Cashier
  if (!canDetailAll && sale.cashierId !== session.id) {
    throw new SalesAuthorizationError("Access denied: You can only view details of your own sales transactions");
  }

  return {
    ...sale,
    totalAmount: Number(sale.totalAmount),
    paymentReceived: sale.paymentReceived != null ? Number(sale.paymentReceived) : Number(sale.totalAmount),
    change: sale.change != null ? Number(sale.change) : 0,
    items: sale.items.map((i) => ({
      ...i,
      unitPrice: Number(i.unitPrice),
      totalPrice: Number(i.totalPrice),
      discount: Number(i.discount),
      product: {
        ...i.product,
        sellingPrice: Number(i.product.sellingPrice),
      },
    })),
    promotions: (sale.promotions || []).map((p) => ({
      ...p,
      discountAmount: Number(p.discountAmount),
    })),
    refunds: sale.refunds.map((r) => ({
      ...r,
      totalAmount: Number(r.totalAmount),
      items: r.items.map((ri) => ({
        ...ri,
        unitPrice: Number(ri.unitPrice),
        totalPrice: Number(ri.totalPrice),
      })),
    })),
  };
}

/**
 * Get stock movements history (for Inventory Staff, Manager, Admin, Super Admin).
 */
export async function getStockMovementsList(productId?: string) {
  const session = await requireAuth();

  const canViewMovements =
    (await hasPermission(session.id, "INVENTORY_MOVEMENT_VIEW")) ||
    (await hasPermission(session.id, "inventory.movement.view"));

  if (!canViewMovements) {
    throw new SalesAuthorizationError("Missing required permission: INVENTORY_MOVEMENT_VIEW");
  }

  const where: Prisma.StockMovementWhereInput = {};
  if (productId && productId.trim()) {
    where.productId = productId.trim();
  }

  const movements = await prisma.stockMovement.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      product: {
        select: {
          id: true,
          sku: true,
          name: true,
          unit: true,
        },
      },
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  return movements;
}
