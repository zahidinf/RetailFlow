import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guards";
import { hasPermission } from "@/lib/rbac";
import { recordAuditLog, computeFieldDiff } from "@/lib/audit";
import { PromotionType, PromotionStatus, Prisma } from "@prisma/client";

export class PromotionAuthorizationError extends Error {
  constructor(message: string = "Forbidden: Insufficient permissions for promotion operations") {
    super(message);
    this.name = "PromotionAuthorizationError";
  }
}

export interface CreatePromotionInput {
  code: string;
  name: string;
  description?: string | null;
  type: PromotionType;
  status?: PromotionStatus;
  priority?: number;
  isStackable?: boolean;
  startDate: string | Date;
  endDate: string | Date;

  // BUY_X_GET_Y
  buyProductId?: string | null;
  minQuantity?: number | null;
  rewardProductId?: string | null;
  rewardQuantity?: number | null;

  // TEBUS_MURAH
  minCartSubtotal?: number | null;
  specialPrice?: number | null;
  maxQuantity?: number | null;

  // PRODUCT_DISCOUNT
  discountType?: "PERCENTAGE" | "FIXED" | "SPECIAL_PRICE" | null;
  discountValue?: number | null;
}

export interface UpdatePromotionInput extends Partial<CreatePromotionInput> {}

export interface PromotionFilterOptions {
  type?: PromotionType;
  status?: PromotionStatus;
  search?: string;
  activeOnly?: boolean;
}

/**
 * Check permission helper with alias fallback
 */
async function checkPromotionPermission(userId: string, permission: string): Promise<boolean> {
  const permLower = permission.toLowerCase().replace(/_/g, ".");
  const permSnake = permission.toLowerCase();
  return (
    (await hasPermission(userId, permission)) ||
    (await hasPermission(userId, permLower)) ||
    (await hasPermission(userId, permSnake))
  );
}

/**
 * List promotions
 */
export async function getPromotionsList(options: PromotionFilterOptions = {}) {
  const session = await requireAuth();
  const canView =
    (await checkPromotionPermission(session.id, "PROMOTION_VIEW")) ||
    (await checkPromotionPermission(session.id, "PROMOTION_APPLY"));

  if (!canView) {
    throw new PromotionAuthorizationError("Permission denied: cannot view promotions");
  }

  const where: Prisma.PromotionWhereInput = {};

  if (options.status) {
    where.status = options.status;
  }

  if (options.type) {
    where.type = options.type;
  }

  if (options.activeOnly) {
    const now = new Date();
    where.status = PromotionStatus.ACTIVE;
    where.startDate = { lte: now };
    where.endDate = { gte: now };
  }

  if (options.search) {
    const search = options.search.trim();
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { code: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  return await prisma.promotion.findMany({
    where,
    include: {
      buyProduct: {
        select: {
          id: true,
          name: true,
          sku: true,
          sellingPrice: true,
          unit: true,
          stock: { select: { currentStock: true } },
        },
      },
      rewardProduct: {
        select: {
          id: true,
          name: true,
          sku: true,
          sellingPrice: true,
          unit: true,
          stock: { select: { currentStock: true } },
        },
      },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });
}

/**
 * Get active promotions currently applicable for POS
 */
export async function getActivePromotionsForPos() {
  const session = await requireAuth();
  const canApply =
    (await checkPromotionPermission(session.id, "PROMOTION_APPLY")) ||
    (await checkPromotionPermission(session.id, "PROMOTION_VIEW"));

  if (!canApply) {
    throw new PromotionAuthorizationError("Permission denied: cannot view or apply promotions");
  }

  const now = new Date();
  return await prisma.promotion.findMany({
    where: {
      status: PromotionStatus.ACTIVE,
      startDate: { lte: now },
      endDate: { gte: now },
    },
    include: {
      buyProduct: {
        select: {
          id: true,
          name: true,
          sku: true,
          sellingPrice: true,
          unit: true,
          stock: { select: { currentStock: true } },
        },
      },
      rewardProduct: {
        select: {
          id: true,
          name: true,
          sku: true,
          sellingPrice: true,
          unit: true,
          stock: { select: { currentStock: true } },
        },
      },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });
}

/**
 * Get single promotion by ID
 */
export async function getPromotionById(id: string) {
  const session = await requireAuth();
  const canView =
    (await checkPromotionPermission(session.id, "PROMOTION_VIEW")) ||
    (await checkPromotionPermission(session.id, "PROMOTION_APPLY"));

  if (!canView) {
    throw new PromotionAuthorizationError("Permission denied: cannot view promotion details");
  }

  const promotion = await prisma.promotion.findUnique({
    where: { id },
    include: {
      buyProduct: {
        select: {
          id: true,
          name: true,
          sku: true,
          sellingPrice: true,
          unit: true,
          stock: { select: { currentStock: true } },
        },
      },
      rewardProduct: {
        select: {
          id: true,
          name: true,
          sku: true,
          sellingPrice: true,
          unit: true,
          stock: { select: { currentStock: true } },
        },
      },
    },
  });

  if (!promotion) {
    throw new Error("Promotion not found");
  }

  return promotion;
}

/**
 * Create a new promotion
 */
export async function createPromotion(input: CreatePromotionInput) {
  const session = await requireAuth();
  const canCreate = await checkPromotionPermission(session.id, "PROMOTION_CREATE");

  if (!canCreate) {
    throw new PromotionAuthorizationError("Permission denied: cannot create promotion");
  }

  // Validate dates
  const startDate = new Date(input.startDate);
  const endDate = new Date(input.endDate);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new Error("Invalid start or end date");
  }
  if (endDate < startDate) {
    throw new Error("End date must be on or after start date");
  }

  // Validate unique code
  const existing = await prisma.promotion.findUnique({
    where: { code: input.code.trim().toUpperCase() },
  });
  if (existing) {
    throw new Error(`Promotion code "${input.code}" already exists`);
  }

  // Validate type-specific rules
  if (input.type === PromotionType.BUY_X_GET_Y) {
    if (!input.buyProductId) throw new Error("Buy product is required for Buy X Get Y promotion");
    if (!input.minQuantity || input.minQuantity < 1) throw new Error("Minimum buy quantity must be at least 1");
    if (!input.rewardProductId) throw new Error("Reward product is required for Buy X Get Y promotion");
    if (!input.rewardQuantity || input.rewardQuantity < 1) throw new Error("Reward quantity must be at least 1");
  } else if (input.type === PromotionType.TEBUS_MURAH) {
    if (!input.minCartSubtotal || Number(input.minCartSubtotal) <= 0) {
      throw new Error("Minimum cart subtotal is required for Tebus Murah promotion");
    }
    if (!input.rewardProductId) throw new Error("Tebus Murah product is required");
    if (input.specialPrice === undefined || input.specialPrice === null || Number(input.specialPrice) < 0) {
      throw new Error("Special price is required for Tebus Murah promotion");
    }
  } else if (input.type === PromotionType.PRODUCT_DISCOUNT) {
    if (!input.buyProductId) throw new Error("Target product is required for product promotion");
    if (!input.discountType) throw new Error("Discount type is required");
    if (input.discountValue === undefined || input.discountValue === null || Number(input.discountValue) < 0) {
      throw new Error("Discount value is required");
    }
  }

  const created = await prisma.promotion.create({
    data: {
      code: input.code.trim().toUpperCase(),
      name: input.name.trim(),
      description: input.description?.trim() || null,
      type: input.type,
      status: input.status || PromotionStatus.ACTIVE,
      priority: input.priority !== undefined ? Number(input.priority) : 0,
      isStackable: input.isStackable !== undefined ? Boolean(input.isStackable) : true,
      startDate,
      endDate,

      buyProductId: input.buyProductId || null,
      minQuantity: input.minQuantity ? Number(input.minQuantity) : 1,
      rewardProductId: input.rewardProductId || null,
      rewardQuantity: input.rewardQuantity ? Number(input.rewardQuantity) : 1,

      minCartSubtotal: input.minCartSubtotal !== undefined && input.minCartSubtotal !== null ? new Prisma.Decimal(input.minCartSubtotal) : null,
      specialPrice: input.specialPrice !== undefined && input.specialPrice !== null ? new Prisma.Decimal(input.specialPrice) : null,
      maxQuantity: input.maxQuantity ? Number(input.maxQuantity) : 1,

      discountType: input.discountType || null,
      discountValue: input.discountValue !== undefined && input.discountValue !== null ? new Prisma.Decimal(input.discountValue) : null,
    },
    include: {
      buyProduct: true,
      rewardProduct: true,
    },
  });

  // Audit trail
  await recordAuditLog({
    userId: session.id,
    action: "CREATE",
    module: "Promotion Management",
    entity: "Promotion",
    recordId: created.id,
    recordIdentifier: created.code,
    description: `Created promotion ${created.name} (${created.code})`,
    newValue: created,
  });

  return created;
}

/**
 * Update promotion
 */
export async function updatePromotion(id: string, input: UpdatePromotionInput) {
  const session = await requireAuth();
  const canEdit = await checkPromotionPermission(session.id, "PROMOTION_EDIT");

  if (!canEdit) {
    throw new PromotionAuthorizationError("Permission denied: cannot edit promotion");
  }

  const existing = await prisma.promotion.findUnique({
    where: { id },
  });
  if (!existing) {
    throw new Error("Promotion not found");
  }

  const updateData: Prisma.PromotionUpdateInput = {};

  if (input.name !== undefined) updateData.name = input.name.trim();
  if (input.description !== undefined) updateData.description = input.description?.trim() || null;
  if (input.priority !== undefined) updateData.priority = Number(input.priority);
  if (input.isStackable !== undefined) updateData.isStackable = Boolean(input.isStackable);

  if (input.startDate !== undefined) {
    const sDate = new Date(input.startDate);
    if (isNaN(sDate.getTime())) throw new Error("Invalid start date");
    updateData.startDate = sDate;
  }
  if (input.endDate !== undefined) {
    const eDate = new Date(input.endDate);
    if (isNaN(eDate.getTime())) throw new Error("Invalid end date");
    updateData.endDate = eDate;
  }

  const finalStart = updateData.startDate ? (updateData.startDate as Date) : existing.startDate;
  const finalEnd = updateData.endDate ? (updateData.endDate as Date) : existing.endDate;
  if (finalEnd < finalStart) {
    throw new Error("End date must be on or after start date");
  }

  if (input.type !== undefined) updateData.type = input.type;
  if (input.status !== undefined) updateData.status = input.status;

  if (input.buyProductId !== undefined) {
    updateData.buyProduct = input.buyProductId ? { connect: { id: input.buyProductId } } : { disconnect: true };
  }
  if (input.minQuantity !== undefined) updateData.minQuantity = input.minQuantity ? Number(input.minQuantity) : 1;
  if (input.rewardProductId !== undefined) {
    updateData.rewardProduct = input.rewardProductId ? { connect: { id: input.rewardProductId } } : { disconnect: true };
  }
  if (input.rewardQuantity !== undefined) updateData.rewardQuantity = input.rewardQuantity ? Number(input.rewardQuantity) : 1;

  if (input.minCartSubtotal !== undefined) {
    updateData.minCartSubtotal = input.minCartSubtotal !== null ? new Prisma.Decimal(input.minCartSubtotal) : null;
  }
  if (input.specialPrice !== undefined) {
    updateData.specialPrice = input.specialPrice !== null ? new Prisma.Decimal(input.specialPrice) : null;
  }
  if (input.maxQuantity !== undefined) updateData.maxQuantity = input.maxQuantity ? Number(input.maxQuantity) : 1;

  if (input.discountType !== undefined) updateData.discountType = input.discountType;
  if (input.discountValue !== undefined) {
    updateData.discountValue = input.discountValue !== null ? new Prisma.Decimal(input.discountValue) : null;
  }

  const updated = await prisma.promotion.update({
    where: { id },
    data: updateData,
    include: {
      buyProduct: true,
      rewardProduct: true,
    },
  });

  // Audit trail with before/after diff
  const diff = computeFieldDiff(existing, updated);
  await recordAuditLog({
    userId: session.id,
    action: "UPDATE",
    module: "Promotion Management",
    entity: "Promotion",
    recordId: updated.id,
    recordIdentifier: updated.code,
    description: `Updated promotion ${updated.name} (${updated.code})`,
    previousValue: existing,
    newValue: updated,
    details: { diff },
  });

  return updated;
}

/**
 * Activate or deactivate promotion
 */
export async function togglePromotionStatus(id: string, activate: boolean) {
  const session = await requireAuth();
  const permRequired = activate ? "PROMOTION_ACTIVATE" : "PROMOTION_DEACTIVATE";
  const canToggle =
    (await checkPromotionPermission(session.id, permRequired)) ||
    (await checkPromotionPermission(session.id, "PROMOTION_EDIT"));

  if (!canToggle) {
    throw new PromotionAuthorizationError(
      `Permission denied: cannot ${activate ? "activate" : "deactivate"} promotion`
    );
  }

  const existing = await prisma.promotion.findUnique({ where: { id } });
  if (!existing) throw new Error("Promotion not found");

  const newStatus = activate ? PromotionStatus.ACTIVE : PromotionStatus.INACTIVE;
  const updated = await prisma.promotion.update({
    where: { id },
    data: { status: newStatus },
  });

  await recordAuditLog({
    userId: session.id,
    action: activate ? "ACTIVATE" : "DEACTIVATE",
    module: "Promotion Management",
    entity: "Promotion",
    recordId: updated.id,
    recordIdentifier: updated.code,
    description: `${activate ? "Activated" : "Deactivated"} promotion ${updated.name} (${updated.code})`,
    previousValue: { status: existing.status },
    newValue: { status: updated.status },
  });

  return updated;
}

/**
 * Delete promotion
 */
export async function deletePromotion(id: string) {
  const session = await requireAuth();
  const canDelete = await checkPromotionPermission(session.id, "PROMOTION_DELETE");

  if (!canDelete) {
    throw new PromotionAuthorizationError("Permission denied: cannot delete promotion");
  }

  const existing = await prisma.promotion.findUnique({
    where: { id },
    include: {
      salePromotions: { select: { id: true }, take: 1 },
    },
  });

  if (!existing) throw new Error("Promotion not found");

  // Check if promo has been used in sales
  if (existing.salePromotions.length > 0) {
    throw new Error(
      "Cannot delete promotion that has already been applied in sales transactions. Consider deactivating it instead."
    );
  }

  await prisma.promotion.delete({ where: { id } });

  await recordAuditLog({
    userId: session.id,
    action: "DELETE",
    module: "Promotion Management",
    entity: "Promotion",
    recordId: existing.id,
    recordIdentifier: existing.code,
    description: `Deleted promotion ${existing.name} (${existing.code})`,
    previousValue: existing,
  });

  return { success: true };
}
