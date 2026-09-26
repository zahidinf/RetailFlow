"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { safeRevalidatePath } from "@/lib/cache-utils";
import { getStockStatus, formatStockStatus, StockStatusType } from "@/lib/stock-utils";
import { Prisma, ProductUnit } from "@prisma/client";
import { recordAuditLog } from "@/lib/audit";

export interface StockItem {
  id: string;
  productId: string;
  currentStock: number;
  createdAt: Date;
  updatedAt: Date;
  status: StockStatusType;
  statusFormatted: string;
  product: {
    id: string;
    sku: string;
    barcode: string | null;
    name: string;
    unit: ProductUnit;
    minimumStock: number;
    category: {
      id: string;
      name: string;
    };
  };
}

export async function getStocks(
  search?: string,
  categoryId?: string,
  stockStatus?: string
): Promise<StockItem[]> {
  await requirePermission("STOCK_VIEW");

  // Ensure any existing products without stock record get one initialized to 0
  const productsWithoutStock = await prisma.product.findMany({
    where: { stock: null },
    select: { id: true },
  });

  if (productsWithoutStock.length > 0) {
    await prisma.stock.createMany({
      data: productsWithoutStock.map((p) => ({
        productId: p.id,
        currentStock: 0,
      })),
      skipDuplicates: true,
    });
  }

  const productWhere: Prisma.ProductWhereInput = {};

  if (search && search.trim()) {
    const term = search.trim();
    productWhere.OR = [
      { sku: { contains: term, mode: "insensitive" } },
      { barcode: { contains: term, mode: "insensitive" } },
      { name: { contains: term, mode: "insensitive" } },
    ];
  }

  if (categoryId && categoryId.trim()) {
    productWhere.categoryId = categoryId.trim();
  }

  const where: Prisma.StockWhereInput = {};
  if (Object.keys(productWhere).length > 0) {
    where.product = productWhere;
  }

  const stocks = await prisma.stock.findMany({
    where,
    include: {
      product: {
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      product: {
        name: "asc",
      },
    },
  });

  const stockItems: StockItem[] = stocks.map((s) => {
    const status = getStockStatus(s.currentStock, s.product.minimumStock);
    return {
      id: s.id,
      productId: s.productId,
      currentStock: s.currentStock,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      status,
      statusFormatted: formatStockStatus(status),
      product: {
        id: s.product.id,
        sku: s.product.sku,
        barcode: s.product.barcode,
        name: s.product.name,
        unit: s.product.unit,
        minimumStock: s.product.minimumStock,
        category: s.product.category,
      },
    };
  });

  if (stockStatus && stockStatus.trim() && stockStatus !== "ALL") {
    const normalized = stockStatus.trim().toUpperCase().replace(/\s+/g, "_");
    return stockItems.filter((item) => item.status === normalized);
  }

  return stockItems;
}

export async function updateStock(
  stockId: string,
  currentStock: number,
  reason: string = "Stock Count Correction",
  notes?: string
) {
  const session = await requirePermission("STOCK_UPDATE");

  if (typeof currentStock !== "number" || isNaN(currentStock)) {
    return { error: "Stock must be a valid number" };
  }

  if (!Number.isInteger(currentStock)) {
    return { error: "Stock quantity must be an integer" };
  }

  if (currentStock < 0) {
    return { error: "Stock quantity cannot be negative" };
  }

  const trimmedReason = reason?.trim();
  if (!trimmedReason) {
    return { error: "Adjustment reason is required" };
  }

  const existingStock = await prisma.stock.findUnique({
    where: { id: stockId },
    include: {
      product: {
        select: {
          id: true,
          sku: true,
          name: true,
        },
      },
    },
  });

  if (!existingStock) {
    return { error: "Stock record not found" };
  }

  const previousStock = existingStock.currentStock;
  const difference = currentStock - previousStock;

  if (difference === 0) {
    return { error: "New stock is identical to current stock. No adjustment needed." };
  }

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  const adjNumber = `ADJ-${dateStr}-${timeStr}-${rand}`;

  await prisma.$transaction(async (tx) => {
    await tx.stock.update({
      where: { id: stockId },
      data: {
        currentStock,
      },
    });

    await tx.stockMovement.create({
      data: {
        productId: existingStock.productId,
        type: "ADJUSTMENT",
        quantity: difference,
        previousStock,
        newStock: currentStock,
        reason: trimmedReason,
        referenceType: "ADJUSTMENT",
        referenceId: adjNumber,
        notes: notes?.trim() || null,
        userId: session.id,
      },
    });

    await recordAuditLog({
      tx,
      userId: session.id,
      action: "UPDATE",
      module: "Product Management",
      entity: "Stock",
      recordId: stockId,
      recordIdentifier: `${existingStock.product.sku} - ${existingStock.product.name}`,
      description: `Adjusted stock for "${existingStock.product.name}" from ${previousStock} to ${currentStock} (${trimmedReason})`,
      previousValue: {
        productId: existingStock.productId,
        sku: existingStock.product.sku,
        name: existingStock.product.name,
        currentStock: previousStock,
      },
      newValue: {
        productId: existingStock.productId,
        sku: existingStock.product.sku,
        name: existingStock.product.name,
        currentStock,
        reason: trimmedReason,
        adjustmentNumber: adjNumber,
      },
    });
  });

  safeRevalidatePath("/admin/stock");
  safeRevalidatePath("/admin/products");
  safeRevalidatePath("/inventory/movements");

  return { success: true };
}

export async function getCategoriesForSelect() {
  const categories = await prisma.category.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return categories;
}
