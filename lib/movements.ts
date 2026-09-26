import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guards";
import { hasPermission } from "@/lib/rbac";
import { MovementType, Prisma } from "@prisma/client";

export class MovementAuthorizationError extends Error {
  constructor(message: string = "Forbidden: Insufficient permissions to view stock movements") {
    super(message);
    this.name = "MovementAuthorizationError";
  }
}

export interface StockMovementsFilter {
  search?: string;
  productId?: string;
  movementType?: string;
  referenceType?: string;
  startDate?: string;
  endDate?: string;
  userId?: string;
}

export async function getStockMovements(filter: StockMovementsFilter = {}) {
  const session = await requireAuth();

  const canView =
    (await hasPermission(session.id, "INVENTORY_MOVEMENT_VIEW")) ||
    (await hasPermission(session.id, "inventory.movement.view"));

  if (!canView) {
    throw new MovementAuthorizationError("Missing required permission: INVENTORY_MOVEMENT_VIEW");
  }

  const where: Prisma.StockMovementWhereInput = {};

  if (filter.productId && filter.productId.trim()) {
    where.productId = filter.productId.trim();
  }

  if (filter.movementType && filter.movementType !== "ALL") {
    where.type = filter.movementType.trim() as MovementType;
  }

  if (filter.referenceType && filter.referenceType !== "ALL") {
    where.referenceType = filter.referenceType.trim();
  }

  if (filter.userId && filter.userId !== "ALL") {
    where.userId = filter.userId.trim();
  }

  if (filter.startDate || filter.endDate) {
    where.createdAt = {};
    if (filter.startDate) {
      where.createdAt.gte = new Date(filter.startDate);
    }
    if (filter.endDate) {
      const end = new Date(filter.endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  if (filter.search && filter.search.trim()) {
    const term = filter.search.trim();
    where.OR = [
      { product: { name: { contains: term, mode: "insensitive" } } },
      { product: { sku: { contains: term, mode: "insensitive" } } },
      { reason: { contains: term, mode: "insensitive" } },
      { referenceId: { contains: term, mode: "insensitive" } },
    ];
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
          category: {
            select: {
              id: true,
              name: true,
            },
          },
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

export async function getMovementUsers() {
  const users = await prisma.user.findMany({
    where: {
      stockMovements: { some: {} },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
    orderBy: { firstName: "asc" },
  });
  return users;
}
