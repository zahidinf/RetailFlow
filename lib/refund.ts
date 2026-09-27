import { prisma } from "./prisma";
import { Prisma } from "@prisma/client";
import { requireAuth } from "./auth-guards";
import { hasPermission } from "./rbac";
import { isUserSuperAdmin } from "./super-admin-validator";
import {
  getRefundValidityPeriodHours,
  getRefundValidityPeriodConfig,
  getRefundValidityPeriodMs,
  RefundValidityConfig,
} from "./parameter-settings";
import bcrypt from "bcrypt";

export interface RefundItemInput {
  saleItemId: string;
  quantity: number;
}

export interface ProcessRefundInput {
  saleId: string;
  items: RefundItemInput[];
  managerId: string;
  managerPassword: string;
  reason?: string;
}

export interface EligibleManager {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roleName: string;
}

export class RefundValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RefundValidationError";
  }
}

export class RefundAuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RefundAuthorizationError";
  }
}

/**
 * Get list of eligible managers who have authority to approve refunds.
 * Never exposes passwords or sensitive credentials.
 */
export async function getEligibleRefundManagers(): Promise<EligibleManager[]> {
  const users = await prisma.user.findMany({
    where: { status: "ACTIVE" },
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
    orderBy: { firstName: "asc" },
  });

  const eligible: EligibleManager[] = [];

  for (const user of users) {
    const isSuper = user.userRoles.some((ur) => ur.role.name === "SUPER_ADMIN");
    const hasApprovePerm =
      isSuper ||
      user.userRoles.some((ur) =>
        ur.role.rolePermissions.some(
          (rp) =>
            rp.permission.name === "SALES_REFUND_APPROVE" ||
            rp.permission.name === "sales.refund_approve"
        )
      );

    if (hasApprovePerm) {
      const primaryRole = user.userRoles[0]?.role.name || "MANAGER";
      eligible.push({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        roleName: primaryRole,
      });
    }
  }

  return eligible;
}

/**
 * Check if a transaction is within configured refund validity duration.
 * Boundary condition: transaction age <= validityPeriodMs is eligible; > validityPeriodMs is expired.
 */
export function isTransactionWithinRefundValidity(
  createdAt: Date | string | number,
  validityPeriodMs: number,
  referenceTime: Date | number = Date.now()
): boolean {
  const createdMs = typeof createdAt === "number" ? createdAt : new Date(createdAt).getTime();
  const refMs = typeof referenceTime === "number" ? referenceTime : new Date(referenceTime).getTime();
  const elapsedMs = refMs - createdMs;
  return elapsedMs <= validityPeriodMs;
}

/**
 * Check if an item is eligible for refund.
 * An item is refundable ONLY when product is flagged refundable === true
 * AND transaction age <= validityPeriodMs
 * AND remaining refundable quantity > 0.
 */
export function isItemRefundEligible(
  item: { product?: { refundable?: boolean | null } | null; quantity: number; refundedQuantity?: number | null },
  transactionCreatedAt: Date | string | number,
  validityPeriodMs: number,
  referenceTime: Date | number = Date.now()
): boolean {
  const isProductRefundable = item.product?.refundable === true;
  const isWithinValidity = isTransactionWithinRefundValidity(
    transactionCreatedAt,
    validityPeriodMs,
    referenceTime
  );
  const remaining = item.quantity - (item.refundedQuantity || 0);
  return isProductRefundable && isWithinValidity && remaining > 0;
}

/**
 * Check if a sale is currently eligible for refund and retrieve remaining quantities.
 */
export async function checkSaleRefundEligibility(saleId: string) {
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              sku: true,
              name: true,
              unit: true,
              refundable: true,
            },
          },
        },
      },
    },
  });

  if (!sale) {
    throw new RefundValidationError("Sale transaction not found");
  }

  if (sale.status === "VOID") {
    return {
      eligible: false,
      reason: "Transaction is voided and cannot be refunded.",
      sale,
    };
  }

  if (sale.status === "REFUNDED") {
    return {
      eligible: false,
      reason: "Transaction has already been fully refunded.",
      sale,
    };
  }

  // Retrieve configurable refund validity period from Parameter Settings
  const validityConfig = await getRefundValidityPeriodConfig();
  const now = new Date();
  const saleDate = new Date(sale.createdAt);
  const elapsedMs = now.getTime() - saleDate.getTime();
  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  const validityPeriodHours = validityConfig.validityPeriodHours;

  // Boundary condition check: elapsedMs <= validityPeriodMs is eligible; > validityPeriodMs is expired
  if (!isTransactionWithinRefundValidity(saleDate, validityConfig.validityPeriodMs, now)) {
    return {
      eligible: false,
      reason: `Refund validity period of ${validityConfig.value} ${validityConfig.unit.toLowerCase()} has expired for this transaction. Elapsed: ${elapsedHours.toFixed(1)} hours.`,
      validityPeriodHours,
      validityPeriodMs: validityConfig.validityPeriodMs,
      elapsedHours,
      elapsedMs,
      sale,
    };
  }

  // Check if any refundable item has remaining quantity AND product is refundable
  const refundableItems = sale.items.filter(
    (item) => isItemRefundEligible(item, sale.createdAt, validityConfig.validityPeriodMs, now)
  );

  if (refundableItems.length === 0) {
    return {
      eligible: false,
      reason: "No refundable items with remaining quantity available in this transaction.",
      validityPeriodHours,
      validityPeriodMs: validityConfig.validityPeriodMs,
      elapsedHours,
      elapsedMs,
      sale,
    };
  }

  return {
    eligible: true,
    validityPeriodHours,
    validityPeriodMs: validityConfig.validityPeriodMs,
    elapsedHours,
    elapsedMs,
    sale,
  };
}

/**
 * Process a transaction refund atomically with manager authentication and stock restoration.
 */
export async function processRefund(input: ProcessRefundInput) {
  const session = await requireAuth();

  // 1. Authorization: Initiator must have refund initiation permission
  const isSuper = await isUserSuperAdmin(session.id);
  const canInitiate =
    isSuper ||
    (await hasPermission(session.id, "SALES_REFUND")) ||
    (await hasPermission(session.id, "sales.refund"));

  if (!canInitiate) {
    throw new RefundAuthorizationError("User does not have permission to initiate refunds");
  }

  // 2. Validate input items
  if (!input.items || input.items.length === 0) {
    throw new RefundValidationError("At least one item must be selected for refund");
  }

  for (const item of input.items) {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new RefundValidationError("Refund quantity must be a positive integer");
    }
  }

  // 3. Manager Authentication
  if (!input.managerId || !input.managerPassword) {
    throw new RefundValidationError("Manager approval and password are required");
  }

  const manager = await prisma.user.findUnique({
    where: { id: input.managerId },
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

  if (!manager || manager.status !== "ACTIVE") {
    throw new RefundAuthorizationError("Selected approving manager is invalid or inactive");
  }

  // Check if manager actually has approval authority
  const managerIsSuper = manager.userRoles.some((ur) => ur.role.name === "SUPER_ADMIN");
  const managerCanApprove =
    managerIsSuper ||
    manager.userRoles.some((ur) =>
      ur.role.rolePermissions.some(
        (rp) =>
          rp.permission.name === "SALES_REFUND_APPROVE" ||
          rp.permission.name === "sales.refund_approve"
      )
    );

  if (!managerCanApprove) {
    throw new RefundAuthorizationError("Selected user does not have refund approval authority");
  }

  // Self-approval restriction for cashier: Cashier cannot approve their own refund
  const initiatorCanApprove =
    isSuper || (await hasPermission(session.id, "SALES_REFUND_APPROVE"));
  if (!initiatorCanApprove && session.id === manager.id) {
    throw new RefundAuthorizationError(
      "Cashiers cannot approve their own refund requests. A manager must authenticate."
    );
  }

  // Authenticate manager password securely
  const passwordValid = await bcrypt.compare(input.managerPassword, manager.password);
  if (!passwordValid) {
    throw new RefundAuthorizationError("Invalid manager password");
  }

  // 4. Atomic transaction processing
  return await prisma.$transaction(async (tx) => {
    // Lock sale transaction
    const sale = await tx.sale.findUnique({
      where: { id: input.saleId },
      include: {
        items: {
          include: {
            product: {
              include: { stock: true },
            },
          },
        },
      },
    });

    if (!sale) {
      throw new RefundValidationError("Sale transaction not found");
    }

    if (sale.status === "VOID") {
      throw new RefundValidationError("Cannot refund a voided transaction");
    }

    if (sale.status === "REFUNDED") {
      throw new RefundValidationError("Transaction is already fully refunded");
    }

    // Configurable time limit check from Parameter Settings
    const validityConfig = await getRefundValidityPeriodConfig();
    const now = new Date();

    if (!isTransactionWithinRefundValidity(sale.createdAt, validityConfig.validityPeriodMs, now)) {
      throw new RefundValidationError(
        `Refund validity period of ${validityConfig.value} ${validityConfig.unit.toLowerCase()} has expired for this transaction`
      );
    }

    // Prepare refund records
    let totalRefundAmount = new Prisma.Decimal(0);
    const refundItemsData: {
      saleItemId: string;
      productId: string;
      quantity: number;
      unitPrice: Prisma.Decimal;
      totalPrice: Prisma.Decimal;
    }[] = [];

    const stockRestorations: {
      productId: string;
      quantity: number;
      previousStock: number;
      newStock: number;
    }[] = [];

    for (const reqItem of input.items) {
      const saleItem = sale.items.find((i) => i.id === reqItem.saleItemId);
      if (!saleItem) {
        throw new RefundValidationError(`Item ${reqItem.saleItemId} does not belong to this sale`);
      }

      if (saleItem.product.refundable !== true) {
        throw new RefundValidationError(
          `Product "${saleItem.product.name}" is marked as non-refundable`
        );
      }

      if (!isTransactionWithinRefundValidity(sale.createdAt, validityConfig.validityPeriodMs, now)) {
        throw new RefundValidationError(
          `Refund validity period of ${validityConfig.value} ${validityConfig.unit.toLowerCase()} has expired for this transaction`
        );
      }

      const remainingQuantity = saleItem.quantity - saleItem.refundedQuantity;
      if (reqItem.quantity > remainingQuantity) {
        throw new RefundValidationError(
          `Refund quantity (${reqItem.quantity}) exceeds remaining quantity (${remainingQuantity}) for "${saleItem.product.name}"`
        );
      }

      const itemRefundTotal = saleItem.unitPrice.mul(reqItem.quantity);
      totalRefundAmount = totalRefundAmount.add(itemRefundTotal);

      refundItemsData.push({
        saleItemId: saleItem.id,
        productId: saleItem.productId,
        quantity: reqItem.quantity,
        unitPrice: saleItem.unitPrice,
        totalPrice: itemRefundTotal,
      });

      const currentStock = saleItem.product.stock?.currentStock ?? 0;
      stockRestorations.push({
        productId: saleItem.productId,
        quantity: reqItem.quantity,
        previousStock: currentStock,
        newStock: currentStock + reqItem.quantity,
      });
    }

    // Generate unique refund number: REF-YYYYMMDD-HHMMSS-RAND
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, "");
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const refundNumber = `REF-${dateStr}-${timeStr}-${randSuffix}`;

    // Create Refund record
    const refund = await tx.refund.create({
      data: {
        refundNumber,
        saleId: sale.id,
        approvedById: manager.id,
        reason: input.reason?.trim() || null,
        totalAmount: totalRefundAmount,
        items: {
          create: refundItemsData,
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
              },
            },
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
      },
    });

    // Update SaleItem refunded quantities
    for (const reqItem of input.items) {
      await tx.saleItem.update({
        where: { id: reqItem.saleItemId },
        data: {
          refundedQuantity: {
            increment: reqItem.quantity,
          },
        },
      });
    }

    // Restore stock and record stock movements
    for (const restoration of stockRestorations) {
      await tx.stock.update({
        where: { productId: restoration.productId },
        data: {
          currentStock: restoration.newStock,
        },
      });

      await tx.stockMovement.create({
        data: {
          productId: restoration.productId,
          type: "RETURN",
          quantity: restoration.quantity,
          previousStock: restoration.previousStock,
          newStock: restoration.newStock,
          reason: `Refund #${refundNumber} for Sale #${sale.saleNumber}`,
          referenceType: "REFUND",
          referenceId: refund.id,
          userId: manager.id,
        },
      });
    }

    // Determine updated sale status
    const updatedSaleItems = await tx.saleItem.findMany({
      where: { saleId: sale.id },
    });

    const allFullyRefunded = updatedSaleItems.every(
      (item) => item.refundedQuantity >= item.quantity
    );
    const newStatus = allFullyRefunded ? "REFUNDED" : "PARTIAL_REFUNDED";

    const updatedSale = await tx.sale.update({
      where: { id: sale.id },
      data: { status: newStatus },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                sku: true,
                name: true,
                unit: true,
                refundable: true,
              },
            },
          },
        },
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

    // Write audit log entry
    await tx.auditLog.create({
      data: {
        userId: session.id,
        action: "TRANSACTION_REFUND",
        entity: "Sale",
        details: JSON.stringify({
          saleNumber: sale.saleNumber,
          refundNumber,
          totalAmount: Number(totalRefundAmount),
          approvedById: manager.id,
          approvedByName: `${manager.firstName} ${manager.lastName}`,
          itemsCount: input.items.length,
          newSaleStatus: newStatus,
        }),
      },
    });

    return {
      refund: {
        ...refund,
        totalAmount: Number(refund.totalAmount),
        items: refund.items.map((i) => ({
          ...i,
          unitPrice: Number(i.unitPrice),
          totalPrice: Number(i.totalPrice),
        })),
      },
      sale: {
        ...updatedSale,
        totalAmount: Number(updatedSale.totalAmount),
        paymentReceived:
          updatedSale.paymentReceived != null
            ? Number(updatedSale.paymentReceived)
            : Number(updatedSale.totalAmount),
        change: updatedSale.change != null ? Number(updatedSale.change) : 0,
        items: updatedSale.items.map((i) => ({
          ...i,
          unitPrice: Number(i.unitPrice),
          totalPrice: Number(i.totalPrice),
        })),
      },
    };
  });
}
