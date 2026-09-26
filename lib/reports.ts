import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { calculateReverseTax } from "@/lib/tax-utils";

export interface DateFilter {
  startDate?: string;
  endDate?: string;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export function buildDateRangeFilter(startDate?: string, endDate?: string) {
  const filter: { gte?: Date; lte?: Date } = {};
  if (startDate) {
    const s = new Date(startDate);
    s.setHours(0, 0, 0, 0);
    filter.gte = s;
  }
  if (endDate) {
    const e = new Date(endDate);
    e.setHours(23, 59, 59, 999);
    filter.lte = e;
  }
  return Object.keys(filter).length > 0 ? filter : undefined;
}

// -------------------------------------------------------------
// A. SALES REPORTS
// -------------------------------------------------------------

export async function getSalesSummaryReport(filter: DateFilter = {}) {
  const dateRange = buildDateRangeFilter(filter.startDate, filter.endDate);
  const where: Prisma.SaleWhereInput = {
    status: { in: ["COMPLETED", "PARTIAL_REFUNDED"] },
    ...(dateRange ? { createdAt: dateRange } : {}),
  };

  const sales = await prisma.sale.findMany({
    where,
    include: {
      items: true,
      refunds: true,
    },
  });

  let grossSales = 0;
  let netSales = 0;
  let refundTotal = 0;
  let totalItemsSold = 0;

  for (const s of sales) {
    const totalAmount = Number(s.totalAmount);
    grossSales += totalAmount;

    let saleRefunds = 0;
    for (const r of s.refunds) {
      saleRefunds += Number(r.totalAmount);
    }
    refundTotal += saleRefunds;
    netSales += totalAmount - saleRefunds;

    for (const item of s.items) {
      totalItemsSold += item.quantity - item.refundedQuantity;
    }
  }

  const taxBreakdown = calculateReverseTax(netSales);

  return {
    totalTransactions: sales.length,
    grossSales,
    refundTotal,
    netSales,
    taxAmount: taxBreakdown.taxAmount,
    preTaxAmount: taxBreakdown.preTaxAmount,
    totalItemsSold,
  };
}

export async function getSalesTransactionsReport(
  filter: DateFilter & {
    cashierId?: string;
    status?: string;
    paymentMethod?: string;
    search?: string;
  } & PaginationParams = {}
) {
  const page = Math.max(1, filter.page || 1);
  const pageSize = Math.max(1, Math.min(100, filter.pageSize || 10));
  const skip = (page - 1) * pageSize;

  const dateRange = buildDateRangeFilter(filter.startDate, filter.endDate);
  const where: Prisma.SaleWhereInput = {};

  if (dateRange) where.createdAt = dateRange;
  if (filter.cashierId && filter.cashierId !== "ALL") where.cashierId = filter.cashierId;
  if (filter.status && filter.status !== "ALL") where.status = filter.status as any;
  if (filter.paymentMethod && filter.paymentMethod !== "ALL") where.paymentMethod = filter.paymentMethod;
  if (filter.search?.trim()) {
    where.OR = [
      { saleNumber: { contains: filter.search.trim(), mode: "insensitive" } },
      { cashier: { firstName: { contains: filter.search.trim(), mode: "insensitive" } } },
      { cashier: { lastName: { contains: filter.search.trim(), mode: "insensitive" } } },
    ];
  }

  const [total, sales] = await Promise.all([
    prisma.sale.count({ where }),
    prisma.sale.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        cashier: { select: { id: true, firstName: true, lastName: true, email: true } },
        items: { include: { product: true } },
        refunds: true,
      },
    }),
  ]);

  const items = sales.map((s) => {
    const totalAmount = Number(s.totalAmount);
    const refundTotal = s.refunds.reduce((sum, r) => sum + Number(r.totalAmount), 0);
    const netAmount = totalAmount - refundTotal;
    const itemsCount = s.items.reduce((sum, i) => sum + i.quantity, 0);

    return {
      id: s.id,
      saleNumber: s.saleNumber,
      cashier: `${s.cashier.firstName} ${s.cashier.lastName}`,
      cashierId: s.cashierId,
      date: s.createdAt.toISOString(),
      paymentMethod: s.paymentMethod,
      itemsCount,
      grossAmount: totalAmount,
      refundAmount: refundTotal,
      netAmount,
      status: s.status,
    };
  });

  return { total, page, pageSize, items };
}

export async function getSalesByProductReport(
  filter: DateFilter & { categoryId?: string; search?: string } & PaginationParams = {}
) {
  const page = Math.max(1, filter.page || 1);
  const pageSize = Math.max(1, Math.min(100, filter.pageSize || 10));
  const skip = (page - 1) * pageSize;

  const dateRange = buildDateRangeFilter(filter.startDate, filter.endDate);

  const saleItemWhere: Prisma.SaleItemWhereInput = {
    sale: {
      status: { in: ["COMPLETED", "PARTIAL_REFUNDED"] },
      ...(dateRange ? { createdAt: dateRange } : {}),
    },
    ...(filter.categoryId && filter.categoryId !== "ALL" ? { product: { categoryId: filter.categoryId } } : {}),
    ...(filter.search?.trim()
      ? {
          product: {
            OR: [
              { name: { contains: filter.search.trim(), mode: "insensitive" } },
              { sku: { contains: filter.search.trim(), mode: "insensitive" } },
            ],
          },
        }
      : {}),
  };

  const saleItems = await prisma.saleItem.findMany({
    where: saleItemWhere,
    include: {
      product: { include: { category: true } },
    },
  });

  const productMap = new Map<
    string,
    {
      productId: string;
      sku: string;
      productName: string;
      categoryName: string;
      quantitySold: number;
      refundedQuantity: number;
      netQuantity: number;
      totalRevenue: number;
    }
  >();

  for (const item of saleItems) {
    const existing = productMap.get(item.productId) || {
      productId: item.productId,
      sku: item.product.sku,
      productName: item.product.name,
      categoryName: item.product.category.name,
      quantitySold: 0,
      refundedQuantity: 0,
      netQuantity: 0,
      totalRevenue: 0,
    };

    existing.quantitySold += item.quantity;
    existing.refundedQuantity += item.refundedQuantity;
    existing.netQuantity += item.quantity - item.refundedQuantity;
    existing.totalRevenue += (item.quantity - item.refundedQuantity) * Number(item.unitPrice);

    productMap.set(item.productId, existing);
  }

  const allRecords = Array.from(productMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
  const total = allRecords.length;
  const items = allRecords.slice(skip, skip + pageSize);

  return { total, page, pageSize, items };
}

export async function getSalesByCategoryReport(filter: DateFilter = {}) {
  const dateRange = buildDateRangeFilter(filter.startDate, filter.endDate);

  const saleItems = await prisma.saleItem.findMany({
    where: {
      sale: {
        status: { in: ["COMPLETED", "PARTIAL_REFUNDED"] },
        ...(dateRange ? { createdAt: dateRange } : {}),
      },
    },
    include: {
      product: { include: { category: true } },
    },
  });

  const categoryMap = new Map<
    string,
    {
      categoryId: string;
      categoryName: string;
      quantitySold: number;
      totalRevenue: number;
      transactionCount: Set<string>;
    }
  >();

  for (const item of saleItems) {
    const catId = item.product.categoryId;
    const catName = item.product.category.name;
    const netQty = item.quantity - item.refundedQuantity;
    const netRev = netQty * Number(item.unitPrice);

    const existing = categoryMap.get(catId) || {
      categoryId: catId,
      categoryName: catName,
      quantitySold: 0,
      totalRevenue: 0,
      transactionCount: new Set<string>(),
    };

    existing.quantitySold += netQty;
    existing.totalRevenue += netRev;
    existing.transactionCount.add(item.saleId);

    categoryMap.set(catId, existing);
  }

  const items = Array.from(categoryMap.values())
    .map((c) => ({
      categoryId: c.categoryId,
      categoryName: c.categoryName,
      quantitySold: c.quantitySold,
      totalRevenue: c.totalRevenue,
      transactionCount: c.transactionCount.size,
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue);

  return { items };
}

export async function getSalesByCashierReport(filter: DateFilter = {}) {
  const dateRange = buildDateRangeFilter(filter.startDate, filter.endDate);

  const sales = await prisma.sale.findMany({
    where: {
      status: { in: ["COMPLETED", "PARTIAL_REFUNDED"] },
      ...(dateRange ? { createdAt: dateRange } : {}),
    },
    include: {
      cashier: true,
      refunds: true,
      items: true,
    },
  });

  const cashierMap = new Map<
    string,
    {
      cashierId: string;
      cashierName: string;
      email: string;
      transactionCount: number;
      grossSales: number;
      refundAmount: number;
      netSales: number;
    }
  >();

  for (const s of sales) {
    const existing = cashierMap.get(s.cashierId) || {
      cashierId: s.cashierId,
      cashierName: `${s.cashier.firstName} ${s.cashier.lastName}`,
      email: s.cashier.email,
      transactionCount: 0,
      grossSales: 0,
      refundAmount: 0,
      netSales: 0,
    };

    const gross = Number(s.totalAmount);
    const refund = s.refunds.reduce((sum, r) => sum + Number(r.totalAmount), 0);

    existing.transactionCount += 1;
    existing.grossSales += gross;
    existing.refundAmount += refund;
    existing.netSales += gross - refund;

    cashierMap.set(s.cashierId, existing);
  }

  const items = Array.from(cashierMap.values()).sort((a, b) => b.netSales - a.netSales);
  return { items };
}

export async function getSalesByPaymentMethodReport(filter: DateFilter = {}) {
  const dateRange = buildDateRangeFilter(filter.startDate, filter.endDate);

  const sales = await prisma.sale.findMany({
    where: {
      status: { in: ["COMPLETED", "PARTIAL_REFUNDED"] },
      ...(dateRange ? { createdAt: dateRange } : {}),
    },
    include: {
      refunds: true,
    },
  });

  const methodMap = new Map<
    string,
    {
      paymentMethod: string;
      transactionCount: number;
      grossAmount: number;
      refundAmount: number;
      netAmount: number;
    }
  >();

  for (const s of sales) {
    const method = s.paymentMethod || "CASH";
    const existing = methodMap.get(method) || {
      paymentMethod: method,
      transactionCount: 0,
      grossAmount: 0,
      refundAmount: 0,
      netAmount: 0,
    };

    const gross = Number(s.totalAmount);
    const refund = s.refunds.reduce((sum, r) => sum + Number(r.totalAmount), 0);

    existing.transactionCount += 1;
    existing.grossAmount += gross;
    existing.refundAmount += refund;
    existing.netAmount += gross - refund;

    methodMap.set(method, existing);
  }

  const items = Array.from(methodMap.values()).sort((a, b) => b.netAmount - a.netAmount);
  return { items };
}

export async function getRefundReport(
  filter: DateFilter & { search?: string } & PaginationParams = {}
) {
  const page = Math.max(1, filter.page || 1);
  const pageSize = Math.max(1, Math.min(100, filter.pageSize || 10));
  const skip = (page - 1) * pageSize;

  const dateRange = buildDateRangeFilter(filter.startDate, filter.endDate);
  const where: Prisma.RefundWhereInput = {
    ...(dateRange ? { createdAt: dateRange } : {}),
    ...(filter.search?.trim()
      ? {
          OR: [
            { refundNumber: { contains: filter.search.trim(), mode: "insensitive" } },
            { sale: { saleNumber: { contains: filter.search.trim(), mode: "insensitive" } } },
            { approvedBy: { firstName: { contains: filter.search.trim(), mode: "insensitive" } } },
            { approvedBy: { lastName: { contains: filter.search.trim(), mode: "insensitive" } } },
          ] as Prisma.RefundWhereInput["OR"],
        }
      : {}),
  };

  const [total, refunds] = await Promise.all([
    prisma.refund.count({ where }),
    prisma.refund.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        sale: { select: { id: true, saleNumber: true, totalAmount: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true } },
        items: { include: { product: true } },
      },
    }),
  ]);

  const items = refunds.map((r) => ({
    id: r.id,
    refundNumber: r.refundNumber,
    saleNumber: r.sale.saleNumber,
    saleId: r.sale.id,
    approvedBy: `${r.approvedBy.firstName} ${r.approvedBy.lastName}`,
    reason: r.reason || "-",
    totalAmount: Number(r.totalAmount),
    itemCount: r.items.reduce((sum, item) => sum + item.quantity, 0),
    date: r.createdAt.toISOString(),
  }));

  return { total, page, pageSize, items };
}

export async function getDiscountReport(
  filter: DateFilter & { supplierId?: string; search?: string } & PaginationParams = {}
) {
  const page = Math.max(1, filter.page || 1);
  const pageSize = Math.max(1, Math.min(100, filter.pageSize || 10));
  const skip = (page - 1) * pageSize;

  const dateRange = buildDateRangeFilter(filter.startDate, filter.endDate);
  const where: Prisma.PurchaseOrderWhereInput = {
    discount: { gt: 0 },
    ...(dateRange ? { poDate: dateRange } : {}),
    ...(filter.supplierId && filter.supplierId !== "ALL" ? { supplierId: filter.supplierId } : {}),
    ...(filter.search?.trim()
      ? {
          OR: [
            { poNumber: { contains: filter.search.trim(), mode: "insensitive" } },
            { supplier: { name: { contains: filter.search.trim(), mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [total, orders] = await Promise.all([
    prisma.purchaseOrder.count({ where }),
    prisma.purchaseOrder.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { poDate: "desc" },
      include: {
        supplier: true,
      },
    }),
  ]);

  const items = orders.map((po) => ({
    id: po.id,
    poNumber: po.poNumber,
    supplierName: po.supplier.name,
    poDate: po.poDate.toISOString(),
    subtotal: Number(po.subtotal),
    discount: Number(po.discount),
    totalAmount: Number(po.totalAmount),
    status: po.status,
  }));

  return { total, page, pageSize, items };
}

// -------------------------------------------------------------
// B. INVENTORY REPORTS
// -------------------------------------------------------------

export async function getStockSummaryReport(
  filter: { categoryId?: string; status?: string; search?: string } & PaginationParams = {}
) {
  const page = Math.max(1, filter.page || 1);
  const pageSize = Math.max(1, Math.min(100, filter.pageSize || 10));
  const skip = (page - 1) * pageSize;

  const where: Prisma.ProductWhereInput = {
    ...(filter.categoryId && filter.categoryId !== "ALL" ? { categoryId: filter.categoryId } : {}),
    ...(filter.search?.trim()
      ? {
          OR: [
            { name: { contains: filter.search.trim(), mode: "insensitive" } },
            { sku: { contains: filter.search.trim(), mode: "insensitive" } },
            { barcode: { contains: filter.search.trim(), mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const products = await prisma.product.findMany({
    where,
    include: {
      category: true,
      stock: true,
    },
    orderBy: { name: "asc" },
  });

  const allItems = products
    .map((p) => {
      const currentStock = p.stock?.currentStock ?? 0;
      let stockStatus = "IN_STOCK";
      if (currentStock <= 0) stockStatus = "OUT_OF_STOCK";
      else if (currentStock <= p.minimumStock) stockStatus = "LOW_STOCK";

      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        categoryName: p.category.name,
        unit: p.unit,
        currentStock,
        minimumStock: p.minimumStock,
        costPrice: Number(p.costPrice),
        sellingPrice: Number(p.sellingPrice),
        stockValue: currentStock * Number(p.costPrice),
        stockStatus,
      };
    })
    .filter((item) => {
      if (filter.status && filter.status !== "ALL") {
        return item.stockStatus === filter.status;
      }
      return true;
    });

  const total = allItems.length;
  const items = allItems.slice(skip, skip + pageSize);

  const totalValue = allItems.reduce((acc, i) => acc + i.stockValue, 0);
  const totalUnits = allItems.reduce((acc, i) => acc + i.currentStock, 0);

  return { total, page, pageSize, items, totalValue, totalUnits };
}

export async function getStockMovementReport(
  filter: DateFilter & {
    productId?: string;
    type?: string;
    search?: string;
  } & PaginationParams = {}
) {
  const page = Math.max(1, filter.page || 1);
  const pageSize = Math.max(1, Math.min(100, filter.pageSize || 10));
  const skip = (page - 1) * pageSize;

  const dateRange = buildDateRangeFilter(filter.startDate, filter.endDate);
  const where: Prisma.StockMovementWhereInput = {
    ...(dateRange ? { createdAt: dateRange } : {}),
    ...(filter.productId && filter.productId !== "ALL" ? { productId: filter.productId } : {}),
    ...(filter.type && filter.type !== "ALL" ? { type: filter.type as any } : {}),
    ...(filter.search?.trim()
      ? {
          OR: [
            { product: { name: { contains: filter.search.trim(), mode: "insensitive" } } },
            { product: { sku: { contains: filter.search.trim(), mode: "insensitive" } } },
            { reason: { contains: filter.search.trim(), mode: "insensitive" } },
            { referenceId: { contains: filter.search.trim(), mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, movements] = await Promise.all([
    prisma.stockMovement.count({ where }),
    prisma.stockMovement.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        product: true,
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
  ]);

  const items = movements.map((m) => ({
    id: m.id,
    sku: m.product.sku,
    productName: m.product.name,
    type: m.type,
    quantity: m.quantity,
    previousStock: m.previousStock,
    newStock: m.newStock,
    reason: m.reason || "-",
    referenceType: m.referenceType || "-",
    referenceId: m.referenceId || "-",
    performedBy: m.user ? `${m.user.firstName} ${m.user.lastName}` : "System",
    date: m.createdAt.toISOString(),
  }));

  return { total, page, pageSize, items };
}

export async function getStockAdjustmentReport(
  filter: DateFilter & { search?: string } & PaginationParams = {}
) {
  return getStockMovementReport({
    ...filter,
    type: "ADJUSTMENT",
  });
}

export async function getLowStockReport(
  filter: { categoryId?: string; search?: string } & PaginationParams = {}
) {
  const page = Math.max(1, filter.page || 1);
  const pageSize = Math.max(1, Math.min(100, filter.pageSize || 10));
  const skip = (page - 1) * pageSize;

  const where: Prisma.ProductWhereInput = {
    status: "ACTIVE",
    ...(filter.categoryId && filter.categoryId !== "ALL" ? { categoryId: filter.categoryId } : {}),
    ...(filter.search?.trim()
      ? {
          OR: [
            { name: { contains: filter.search.trim(), mode: "insensitive" } },
            { sku: { contains: filter.search.trim(), mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const products = await prisma.product.findMany({
    where,
    include: {
      category: true,
      stock: true,
    },
    orderBy: { name: "asc" },
  });

  const lowStockItems = products
    .filter((p) => {
      const stock = p.stock?.currentStock ?? 0;
      return stock > 0 && stock <= p.minimumStock;
    })
    .map((p) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      categoryName: p.category.name,
      unit: p.unit,
      currentStock: p.stock?.currentStock ?? 0,
      minimumStock: p.minimumStock,
      reorderQuantity: Math.max(p.minimumStock * 2 - (p.stock?.currentStock ?? 0), 1),
    }));

  const total = lowStockItems.length;
  const items = lowStockItems.slice(skip, skip + pageSize);

  return { total, page, pageSize, items };
}

export async function getOutOfStockReport(
  filter: { categoryId?: string; search?: string } & PaginationParams = {}
) {
  const page = Math.max(1, filter.page || 1);
  const pageSize = Math.max(1, Math.min(100, filter.pageSize || 10));
  const skip = (page - 1) * pageSize;

  const where: Prisma.ProductWhereInput = {
    status: "ACTIVE",
    ...(filter.categoryId && filter.categoryId !== "ALL" ? { categoryId: filter.categoryId } : {}),
    ...(filter.search?.trim()
      ? {
          OR: [
            { name: { contains: filter.search.trim(), mode: "insensitive" } },
            { sku: { contains: filter.search.trim(), mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const products = await prisma.product.findMany({
    where,
    include: {
      category: true,
      stock: true,
    },
    orderBy: { name: "asc" },
  });

  const outOfStockItems = products
    .filter((p) => (p.stock?.currentStock ?? 0) <= 0)
    .map((p) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      categoryName: p.category.name,
      unit: p.unit,
      currentStock: p.stock?.currentStock ?? 0,
      minimumStock: p.minimumStock,
    }));

  const total = outOfStockItems.length;
  const items = outOfStockItems.slice(skip, skip + pageSize);

  return { total, page, pageSize, items };
}

// -------------------------------------------------------------
// C. PURCHASING REPORTS
// -------------------------------------------------------------

export async function getPurchaseSummaryReport(filter: DateFilter = {}) {
  const dateRange = buildDateRangeFilter(filter.startDate, filter.endDate);
  const orders = await prisma.purchaseOrder.findMany({
    where: {
      ...(dateRange ? { poDate: dateRange } : {}),
    },
  });

  let totalOrders = orders.length;
  let totalSpend = 0;
  let totalDiscount = 0;
  let totalTax = 0;
  let pendingOrders = 0;
  let completedOrders = 0;

  for (const po of orders) {
    totalSpend += Number(po.totalAmount);
    totalDiscount += Number(po.discount);
    totalTax += Number(po.tax);
    if (po.status === "RECEIVED") completedOrders++;
    else if (["SUBMITTED", "APPROVED", "PARTIALLY_RECEIVED"].includes(po.status)) pendingOrders++;
  }

  return {
    totalOrders,
    totalSpend,
    totalDiscount,
    totalTax,
    pendingOrders,
    completedOrders,
  };
}

export async function getPurchaseOrdersReport(
  filter: DateFilter & {
    supplierId?: string;
    status?: string;
    search?: string;
  } & PaginationParams = {}
) {
  const page = Math.max(1, filter.page || 1);
  const pageSize = Math.max(1, Math.min(100, filter.pageSize || 10));
  const skip = (page - 1) * pageSize;

  const dateRange = buildDateRangeFilter(filter.startDate, filter.endDate);
  const where: Prisma.PurchaseOrderWhereInput = {
    ...(dateRange ? { poDate: dateRange } : {}),
    ...(filter.supplierId && filter.supplierId !== "ALL" ? { supplierId: filter.supplierId } : {}),
    ...(filter.status && filter.status !== "ALL" ? { status: filter.status as any } : {}),
    ...(filter.search?.trim()
      ? {
          OR: [
            { poNumber: { contains: filter.search.trim(), mode: "insensitive" } },
            { supplier: { name: { contains: filter.search.trim(), mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [total, orders] = await Promise.all([
    prisma.purchaseOrder.count({ where }),
    prisma.purchaseOrder.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { poDate: "desc" },
      include: {
        supplier: true,
        createdBy: { select: { firstName: true, lastName: true } },
        items: true,
      },
    }),
  ]);

  const items = orders.map((po) => ({
    id: po.id,
    poNumber: po.poNumber,
    supplierName: po.supplier.name,
    poDate: po.poDate.toISOString(),
    status: po.status,
    itemCount: po.items.reduce((acc, i) => acc + i.orderedQuantity, 0),
    receivedCount: po.items.reduce((acc, i) => acc + i.receivedQuantity, 0),
    totalAmount: Number(po.totalAmount),
    createdBy: `${po.createdBy.firstName} ${po.createdBy.lastName}`,
  }));

  return { total, page, pageSize, items };
}

export async function getPurchaseBySupplierReport(filter: DateFilter = {}) {
  const dateRange = buildDateRangeFilter(filter.startDate, filter.endDate);
  const orders = await prisma.purchaseOrder.findMany({
    where: {
      status: { not: "CANCELLED" },
      ...(dateRange ? { poDate: dateRange } : {}),
    },
    include: {
      supplier: true,
      items: true,
    },
  });

  const supplierMap = new Map<
    string,
    {
      supplierId: string;
      supplierCode: string;
      supplierName: string;
      poCount: number;
      totalSpend: number;
      totalItemsOrdered: number;
    }
  >();

  for (const po of orders) {
    const existing = supplierMap.get(po.supplierId) || {
      supplierId: po.supplierId,
      supplierCode: po.supplier.code,
      supplierName: po.supplier.name,
      poCount: 0,
      totalSpend: 0,
      totalItemsOrdered: 0,
    };

    existing.poCount += 1;
    existing.totalSpend += Number(po.totalAmount);
    existing.totalItemsOrdered += po.items.reduce((sum, i) => sum + i.orderedQuantity, 0);

    supplierMap.set(po.supplierId, existing);
  }

  const items = Array.from(supplierMap.values()).sort((a, b) => b.totalSpend - a.totalSpend);
  return { items };
}

export async function getPurchaseByProductReport(
  filter: DateFilter & { search?: string } & PaginationParams = {}
) {
  const page = Math.max(1, filter.page || 1);
  const pageSize = Math.max(1, Math.min(100, filter.pageSize || 10));
  const skip = (page - 1) * pageSize;

  const dateRange = buildDateRangeFilter(filter.startDate, filter.endDate);

  const poItems = await prisma.purchaseOrderItem.findMany({
    where: {
      purchaseOrder: {
        status: { not: "CANCELLED" },
        ...(dateRange ? { poDate: dateRange } : {}),
      },
      ...(filter.search?.trim()
        ? {
            product: {
              OR: [
                { name: { contains: filter.search.trim(), mode: "insensitive" } },
                { sku: { contains: filter.search.trim(), mode: "insensitive" } },
              ],
            },
          }
        : {}),
    },
    include: {
      product: { include: { category: true } },
    },
  });

  const productMap = new Map<
    string,
    {
      productId: string;
      sku: string;
      productName: string;
      categoryName: string;
      orderedQuantity: number;
      receivedQuantity: number;
      totalSpend: number;
    }
  >();

  for (const item of poItems) {
    const existing = productMap.get(item.productId) || {
      productId: item.productId,
      sku: item.product.sku,
      productName: item.product.name,
      categoryName: item.product.category.name,
      orderedQuantity: 0,
      receivedQuantity: 0,
      totalSpend: 0,
    };

    existing.orderedQuantity += item.orderedQuantity;
    existing.receivedQuantity += item.receivedQuantity;
    existing.totalSpend += Number(item.totalPrice);

    productMap.set(item.productId, existing);
  }

  const allRecords = Array.from(productMap.values()).sort((a, b) => b.totalSpend - a.totalSpend);
  const total = allRecords.length;
  const items = allRecords.slice(skip, skip + pageSize);

  return { total, page, pageSize, items };
}

export async function getOutstandingPurchaseOrdersReport(
  filter: { supplierId?: string; search?: string } & PaginationParams = {}
) {
  return getPurchaseOrdersReport({
    ...filter,
    status: "PARTIALLY_RECEIVED",
  });
}

// -------------------------------------------------------------
// D. WAREHOUSE REPORTS
// -------------------------------------------------------------

export async function getGoodsReceiptReport(
  filter: DateFilter & {
    supplierId?: string;
    status?: string;
    search?: string;
  } & PaginationParams = {}
) {
  const page = Math.max(1, filter.page || 1);
  const pageSize = Math.max(1, Math.min(100, filter.pageSize || 10));
  const skip = (page - 1) * pageSize;

  const dateRange = buildDateRangeFilter(filter.startDate, filter.endDate);
  const where: Prisma.GoodsReceiptWhereInput = {
    ...(dateRange ? { grDate: dateRange } : {}),
    ...(filter.supplierId && filter.supplierId !== "ALL" ? { supplierId: filter.supplierId } : {}),
    ...(filter.status && filter.status !== "ALL" ? { status: filter.status as any } : {}),
    ...(filter.search?.trim()
      ? {
          OR: [
            { grNumber: { contains: filter.search.trim(), mode: "insensitive" } },
            { purchaseOrder: { poNumber: { contains: filter.search.trim(), mode: "insensitive" } } },
            { supplier: { name: { contains: filter.search.trim(), mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [total, receipts] = await Promise.all([
    prisma.goodsReceipt.count({ where }),
    prisma.goodsReceipt.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { grDate: "desc" },
      include: {
        supplier: true,
        purchaseOrder: true,
        receivedBy: { select: { firstName: true, lastName: true } },
        items: true,
      },
    }),
  ]);

  const items = receipts.map((gr) => ({
    id: gr.id,
    grNumber: gr.grNumber,
    poNumber: gr.purchaseOrder.poNumber,
    poId: gr.purchaseOrderId,
    supplierName: gr.supplier.name,
    grDate: gr.grDate.toISOString(),
    status: gr.status,
    totalItemsReceived: gr.items.reduce((acc, i) => acc + i.receivedQuantity, 0),
    receivedBy: `${gr.receivedBy.firstName} ${gr.receivedBy.lastName}`,
  }));

  return { total, page, pageSize, items };
}

export async function getReceivingBySupplierReport(filter: DateFilter = {}) {
  const dateRange = buildDateRangeFilter(filter.startDate, filter.endDate);
  const receipts = await prisma.goodsReceipt.findMany({
    where: {
      status: "CONFIRMED",
      ...(dateRange ? { grDate: dateRange } : {}),
    },
    include: {
      supplier: true,
      items: true,
    },
  });

  const supplierMap = new Map<
    string,
    {
      supplierId: string;
      supplierCode: string;
      supplierName: string;
      receiptCount: number;
      totalItemsReceived: number;
    }
  >();

  for (const gr of receipts) {
    const existing = supplierMap.get(gr.supplierId) || {
      supplierId: gr.supplierId,
      supplierCode: gr.supplier.code,
      supplierName: gr.supplier.name,
      receiptCount: 0,
      totalItemsReceived: 0,
    };

    existing.receiptCount += 1;
    existing.totalItemsReceived += gr.items.reduce((sum, i) => sum + i.receivedQuantity, 0);

    supplierMap.set(gr.supplierId, existing);
  }

  const items = Array.from(supplierMap.values()).sort((a, b) => b.totalItemsReceived - a.totalItemsReceived);
  return { items };
}

export async function getReceivingByPOReport(
  filter: DateFilter & { search?: string } & PaginationParams = {}
) {
  return getGoodsReceiptReport(filter);
}

export async function getReceivingDiscrepancyReport(
  filter: { supplierId?: string; search?: string } & PaginationParams = {}
) {
  const page = Math.max(1, filter.page || 1);
  const pageSize = Math.max(1, Math.min(100, filter.pageSize || 10));
  const skip = (page - 1) * pageSize;

  const orders = await prisma.purchaseOrder.findMany({
    where: {
      status: { in: ["APPROVED", "PARTIALLY_RECEIVED", "RECEIVED"] },
      ...(filter.supplierId && filter.supplierId !== "ALL" ? { supplierId: filter.supplierId } : {}),
      ...(filter.search?.trim()
        ? {
            OR: [
              { poNumber: { contains: filter.search.trim(), mode: "insensitive" } },
              { supplier: { name: { contains: filter.search.trim(), mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: {
      supplier: true,
      items: {
        include: { product: true },
      },
    },
    orderBy: { poDate: "desc" },
  });

  const discrepancies: Array<{
    poId: string;
    poNumber: string;
    supplierName: string;
    sku: string;
    productName: string;
    orderedQuantity: number;
    receivedQuantity: number;
    difference: number;
    status: string;
  }> = [];

  for (const po of orders) {
    for (const item of po.items) {
      if (item.orderedQuantity !== item.receivedQuantity) {
        discrepancies.push({
          poId: po.id,
          poNumber: po.poNumber,
          supplierName: po.supplier.name,
          sku: item.product.sku,
          productName: item.product.name,
          orderedQuantity: item.orderedQuantity,
          receivedQuantity: item.receivedQuantity,
          difference: item.orderedQuantity - item.receivedQuantity,
          status: po.status,
        });
      }
    }
  }

  const total = discrepancies.length;
  const items = discrepancies.slice(skip, skip + pageSize);

  return { total, page, pageSize, items };
}

export async function getPendingReceivingReport(
  filter: { supplierId?: string; search?: string } & PaginationParams = {}
) {
  return getPurchaseOrdersReport({
    ...filter,
    status: "APPROVED",
  });
}

export async function getPartialReceivingReport(
  filter: { supplierId?: string; search?: string } & PaginationParams = {}
) {
  return getPurchaseOrdersReport({
    ...filter,
    status: "PARTIALLY_RECEIVED",
  });
}

// -------------------------------------------------------------
// E. FINANCE REPORTS
// -------------------------------------------------------------

export async function getRevenueReport(filter: DateFilter = {}) {
  const summary = await getSalesSummaryReport(filter);
  return {
    grossRevenue: summary.grossSales,
    refunds: summary.refundTotal,
    netRevenue: summary.netSales,
    preTaxRevenue: summary.preTaxAmount,
    taxCollected: summary.taxAmount,
    transactions: summary.totalTransactions,
  };
}

export async function getPaymentReport(filter: DateFilter = {}) {
  return getSalesByPaymentMethodReport(filter);
}

export async function getTaxReport(filter: DateFilter = {}) {
  const dateRange = buildDateRangeFilter(filter.startDate, filter.endDate);

  const [sales, purchaseOrders] = await Promise.all([
    prisma.sale.findMany({
      where: {
        status: { in: ["COMPLETED", "PARTIAL_REFUNDED"] },
        ...(dateRange ? { createdAt: dateRange } : {}),
      },
      include: { refunds: true },
    }),
    prisma.purchaseOrder.findMany({
      where: {
        status: { not: "CANCELLED" },
        ...(dateRange ? { poDate: dateRange } : {}),
      },
    }),
  ]);

  let totalSalesNet = 0;
  for (const s of sales) {
    const gross = Number(s.totalAmount);
    const refund = s.refunds.reduce((sum, r) => sum + Number(r.totalAmount), 0);
    totalSalesNet += gross - refund;
  }

  const salesTaxBreakdown = calculateReverseTax(totalSalesNet);
  const purchaseTaxTotal = purchaseOrders.reduce((sum, po) => sum + Number(po.tax), 0);

  return {
    salesRevenueInclusive: salesTaxBreakdown.totalAmount,
    salesPreTaxRevenue: salesTaxBreakdown.preTaxAmount,
    outputTax: salesTaxBreakdown.taxAmount,
    inputTax: purchaseTaxTotal,
    netTaxPayable: salesTaxBreakdown.taxAmount - purchaseTaxTotal,
  };
}

export async function getRefundFinanceReport(filter: DateFilter = {}) {
  const dateRange = buildDateRangeFilter(filter.startDate, filter.endDate);
  const refunds = await prisma.refund.findMany({
    where: {
      ...(dateRange ? { createdAt: dateRange } : {}),
    },
  });

  const totalRefundAmount = refunds.reduce((sum, r) => sum + Number(r.totalAmount), 0);
  const taxBreakdown = calculateReverseTax(totalRefundAmount);

  return {
    totalRefunds: refunds.length,
    totalRefundAmount,
    taxRefunded: taxBreakdown.taxAmount,
    preTaxRefunded: taxBreakdown.preTaxAmount,
  };
}

export async function getDiscountFinanceReport(filter: DateFilter = {}) {
  const dateRange = buildDateRangeFilter(filter.startDate, filter.endDate);
  const orders = await prisma.purchaseOrder.findMany({
    where: {
      discount: { gt: 0 },
      status: { not: "CANCELLED" },
      ...(dateRange ? { poDate: dateRange } : {}),
    },
  });

  const totalPurchaseDiscount = orders.reduce((sum, o) => sum + Number(o.discount), 0);
  return {
    orderCountWithDiscount: orders.length,
    totalPurchaseDiscount,
  };
}

export async function getPurchaseExpenseReport(filter: DateFilter = {}) {
  const summary = await getPurchaseSummaryReport(filter);
  return {
    totalSpend: summary.totalSpend,
    totalDiscount: summary.totalDiscount,
    totalTax: summary.totalTax,
    totalOrders: summary.totalOrders,
    completedOrders: summary.completedOrders,
  };
}

// -------------------------------------------------------------
// F. CASHIER REPORTS
// -------------------------------------------------------------

export async function getCashierSalesReport(filter: DateFilter = {}) {
  return getSalesByCashierReport(filter);
}

export async function getPaymentSummaryReport(filter: DateFilter = {}) {
  return getSalesByPaymentMethodReport(filter);
}

export async function getCashCollectionReport(filter: DateFilter = {}) {
  const dateRange = buildDateRangeFilter(filter.startDate, filter.endDate);
  const cashSales = await prisma.sale.findMany({
    where: {
      paymentMethod: "CASH",
      status: { in: ["COMPLETED", "PARTIAL_REFUNDED"] },
      ...(dateRange ? { createdAt: dateRange } : {}),
    },
    include: {
      cashier: true,
      refunds: true,
    },
  });

  let totalCashReceived = 0;
  let totalChangeGiven = 0;
  let totalCashSales = 0;
  let totalCashRefunded = 0;

  for (const s of cashSales) {
    totalCashSales += Number(s.totalAmount);
    totalCashReceived += Number(s.paymentReceived ?? s.totalAmount);
    totalChangeGiven += Number(s.change ?? 0);
    for (const r of s.refunds) {
      totalCashRefunded += Number(r.totalAmount);
    }
  }

  const netCashCollected = totalCashSales - totalCashRefunded;

  return {
    transactionCount: cashSales.length,
    totalCashSales,
    totalCashReceived,
    totalChangeGiven,
    totalCashRefunded,
    netCashCollected,
  };
}

// -------------------------------------------------------------
// G. AUDIT REPORTS
// -------------------------------------------------------------

export async function getUserActivityReport(
  filter: DateFilter & {
    userId?: string;
    action?: string;
    module?: string;
    entity?: string;
    search?: string;
  } & PaginationParams = {}
) {
  const page = Math.max(1, filter.page || 1);
  const pageSize = Math.max(1, Math.min(100, filter.pageSize || 10));
  const skip = (page - 1) * pageSize;

  const dateRange = buildDateRangeFilter(filter.startDate, filter.endDate);
  const where: Prisma.AuditLogWhereInput = {
    ...(dateRange ? { createdAt: dateRange } : {}),
    ...(filter.userId && filter.userId !== "ALL" ? { userId: filter.userId } : {}),
    ...(filter.action && filter.action !== "ALL" ? { action: filter.action } : {}),
    ...(filter.module && filter.module !== "ALL" ? { module: filter.module } : {}),
    ...(filter.entity && filter.entity !== "ALL" ? { entity: filter.entity } : {}),
    ...(filter.search?.trim()
      ? {
          OR: [
            { entity: { contains: filter.search.trim(), mode: "insensitive" } },
            { module: { contains: filter.search.trim(), mode: "insensitive" } },
            { description: { contains: filter.search.trim(), mode: "insensitive" } },
            { recordIdentifier: { contains: filter.search.trim(), mode: "insensitive" } },
            { recordId: { contains: filter.search.trim(), mode: "insensitive" } },
            { username: { contains: filter.search.trim(), mode: "insensitive" } },
            { details: { contains: filter.search.trim(), mode: "insensitive" } },
            { action: { contains: filter.search.trim(), mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const userIds = Array.from(new Set(logs.map((l) => l.userId).filter(Boolean))) as string[];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, firstName: true, lastName: true, email: true },
  });
  const userMap = new Map(users.map((u) => [u.id, `${u.firstName} ${u.lastName} (${u.email})`]));

  const items = logs.map((l) => {
    const fallbackModule =
      l.module ||
      (["Category", "Product", "Stock"].includes(l.entity)
        ? "Product Management"
        : ["Supplier", "PurchaseOrder", "GoodsReceipt"].includes(l.entity)
        ? "Purchasing"
        : "Administration");

    const resolvedUser = l.userId
      ? userMap.get(l.userId) || l.username || l.userId
      : l.username || "System";

    return {
      id: l.id,
      timestamp: l.createdAt.toISOString(),
      user: resolvedUser,
      module: fallbackModule,
      entity: l.entity,
      action: l.action,
      record: l.recordIdentifier || l.recordId || "-",
      description: l.description || l.details || "-",
      // Extended audit fields for detail modal
      recordId: l.recordId || null,
      recordIdentifier: l.recordIdentifier || null,
      previousValue: l.previousValue ?? null,
      newValue: l.newValue ?? null,
      status: l.status || "SUCCESS",
      ipAddress: l.ipAddress || null,
      userAgent: l.userAgent || null,
      details: l.details || null,
      // Backward compatibility fields
      userId: l.userId,
      date: l.createdAt.toISOString(),
    };
  });

  return { total, page, pageSize, items };
}

export async function getLoginActivityReport(
  filter: DateFilter & { search?: string } & PaginationParams = {}
) {
  const page = Math.max(1, filter.page || 1);
  const pageSize = Math.max(1, Math.min(100, filter.pageSize || 10));
  const skip = (page - 1) * pageSize;

  const dateRange = buildDateRangeFilter(filter.startDate, filter.endDate);
  const where: Prisma.UserWhereInput = {
    lastLoginAt: { not: null, ...(dateRange || {}) },
    ...(filter.search?.trim()
      ? {
          OR: [
            { firstName: { contains: filter.search.trim(), mode: "insensitive" } },
            { lastName: { contains: filter.search.trim(), mode: "insensitive" } },
            { email: { contains: filter.search.trim(), mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { lastLoginAt: "desc" },
      include: {
        userRoles: { include: { role: true } },
      },
    }),
  ]);

  const items = users.map((u) => ({
    id: u.id,
    name: `${u.firstName} ${u.lastName}`,
    email: u.email,
    roles: u.userRoles.map((ur) => ur.role.name).join(", "),
    status: u.status,
    lastLoginAt: u.lastLoginAt?.toISOString() || "-",
  }));

  return { total, page, pageSize, items };
}

export async function getTransactionAuditReport(
  filter: DateFilter & { search?: string } & PaginationParams = {}
) {
  return getSalesTransactionsReport(filter);
}

export async function getRefundAuditReport(
  filter: DateFilter & { search?: string } & PaginationParams = {}
) {
  return getRefundReport(filter);
}

export async function getStockAdjustmentAuditReport(
  filter: DateFilter & { search?: string } & PaginationParams = {}
) {
  return getStockAdjustmentReport(filter);
}

export async function getPurchaseOrderAuditReport(
  filter: DateFilter & { search?: string } & PaginationParams = {}
) {
  return getPurchaseOrdersReport(filter);
}

export async function getGoodsReceiptAuditReport(
  filter: DateFilter & { search?: string } & PaginationParams = {}
) {
  return getGoodsReceiptReport(filter);
}

// -------------------------------------------------------------
// FILTER METADATA HELPERS
// -------------------------------------------------------------

export async function getReportFilterOptions() {
  const [categories, suppliers, cashiers, users] = await Promise.all([
    prisma.category.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.supplier.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: {
        userRoles: {
          some: {
            role: { name: "CASHIER" },
          },
        },
      },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
    prisma.user.findMany({
      select: { id: true, firstName: true, lastName: true, email: true },
      orderBy: { firstName: "asc" },
    }),
  ]);

  return {
    categories,
    suppliers,
    cashiers: cashiers.map((c) => ({ id: c.id, name: `${c.firstName} ${c.lastName}` })),
    users: users.map((u) => ({ id: u.id, name: `${u.firstName} ${u.lastName} (${u.email})` })),
    auditModules: ["Administration", "Product Management", "Purchasing"],
    auditEntities: ["User", "Role", "Category", "Product", "Stock", "ParameterSetting", "SessionSetting", "Supplier", "Sale"],
    auditActions: ["CREATE", "UPDATE", "DELETE", "TRANSACTION_REFUND"],
  };
}
