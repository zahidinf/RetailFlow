"use server";

import {
  getSuppliersList,
  getSupplierById,
  createSupplier,
  updateSupplier,
  toggleSupplierStatus,
  CreateSupplierInput,
  UpdateSupplierInput,
  SupplierFilterOptions,
  getPurchaseOrdersList,
  getPurchaseOrderDetail,
  createPurchaseOrder,
  submitPurchaseOrder,
  approvePurchaseOrder,
  cancelPurchaseOrder,
  CreatePOInput,
  POFilterOptions,
  getGoodsReceiptsList,
  getGoodsReceiptDetail,
  getEligiblePOsForReceiving,
  createGoodsReceipt,
  confirmGoodsReceipt,
  cancelGoodsReceipt,
  CreateGRInput,
  GRFilterOptions,
} from "@/lib/purchasing";
import { requirePermission, ForbiddenError } from "@/lib/auth-guards";
import { revalidatePath } from "next/cache";

// Supplier actions
export async function getSuppliersAction(options?: SupplierFilterOptions) {
  try {
    await requirePermission("SUPPLIER_VIEW");
    const suppliers = await getSuppliersList(options);
    return { success: true, suppliers };
  } catch (error: any) {
    if (error instanceof ForbiddenError) throw error;
    return { error: error.message || "Failed to load suppliers" };
  }
}

export async function createSupplierAction(input: CreateSupplierInput) {
  await requirePermission("SUPPLIER_CREATE");
  try {
    const supplier = await createSupplier(input);
    revalidatePath("/purchasing/suppliers");
    return { success: true, supplier };
  } catch (error: any) {
    if (error instanceof ForbiddenError) throw error;
    return { error: error.message || "Failed to create supplier" };
  }
}

export async function updateSupplierAction(id: string, input: UpdateSupplierInput) {
  await requirePermission("SUPPLIER_UPDATE");
  try {
    const supplier = await updateSupplier(id, input);
    revalidatePath("/purchasing/suppliers");
    return { success: true, supplier };
  } catch (error: any) {
    if (error instanceof ForbiddenError) throw error;
    return { error: error.message || "Failed to update supplier" };
  }
}

export async function toggleSupplierStatusAction(id: string) {
  await requirePermission("SUPPLIER_DELETE");
  try {
    const supplier = await toggleSupplierStatus(id);
    revalidatePath("/purchasing/suppliers");
    return { success: true, supplier };
  } catch (error: any) {
    if (error instanceof ForbiddenError) throw error;
    return { error: error.message || "Failed to change supplier status" };
  }
}

// Purchase Order actions
export async function getPurchaseOrdersAction(options?: POFilterOptions) {
  try {
    await requirePermission("PURCHASE_ORDER_VIEW");
    const orders = await getPurchaseOrdersList(options);
    return { success: true, orders };
  } catch (error: any) {
    if (error instanceof ForbiddenError) throw error;
    return { error: error.message || "Failed to load purchase orders" };
  }
}

export async function getPurchaseOrderDetailAction(poId: string) {
  try {
    await requirePermission("PURCHASE_ORDER_VIEW");
    const order = await getPurchaseOrderDetail(poId);
    return { success: true, order };
  } catch (error: any) {
    if (error instanceof ForbiddenError) throw error;
    return { error: error.message || "Failed to load purchase order details" };
  }
}

export async function createPurchaseOrderAction(input: CreatePOInput) {
  await requirePermission("PURCHASE_ORDER_CREATE");
  try {
    const order = await createPurchaseOrder(input);
    revalidatePath("/purchasing/orders");
    return { success: true, order };
  } catch (error: any) {
    if (error instanceof ForbiddenError) throw error;
    return { error: error.message || "Failed to create purchase order" };
  }
}

export async function submitPurchaseOrderAction(poId: string) {
  await requirePermission("PURCHASE_ORDER_SUBMIT");
  try {
    const order = await submitPurchaseOrder(poId);
    revalidatePath("/purchasing/orders");
    revalidatePath(`/purchasing/orders/${poId}`);
    return { success: true, order };
  } catch (error: any) {
    if (error instanceof ForbiddenError) throw error;
    return { error: error.message || "Failed to submit purchase order" };
  }
}

export async function approvePurchaseOrderAction(poId: string) {
  await requirePermission("PURCHASE_ORDER_APPROVE");
  try {
    const order = await approvePurchaseOrder(poId);
    revalidatePath("/purchasing/orders");
    revalidatePath(`/purchasing/orders/${poId}`);
    revalidatePath("/purchasing/receipts/create");
    return { success: true, order };
  } catch (error: any) {
    if (error instanceof ForbiddenError) throw error;
    return { error: error.message || "Failed to approve purchase order" };
  }
}

export async function cancelPurchaseOrderAction(poId: string) {
  await requirePermission("PURCHASE_ORDER_CANCEL");
  try {
    const order = await cancelPurchaseOrder(poId);
    revalidatePath("/purchasing/orders");
    revalidatePath(`/purchasing/orders/${poId}`);
    return { success: true, order };
  } catch (error: any) {
    if (error instanceof ForbiddenError) throw error;
    return { error: error.message || "Failed to cancel purchase order" };
  }
}

// Goods Receipt actions
export async function getGoodsReceiptsAction(options?: GRFilterOptions) {
  try {
    await requirePermission("GOODS_RECEIPT_VIEW");
    const receipts = await getGoodsReceiptsList(options);
    return { success: true, receipts };
  } catch (error: any) {
    if (error instanceof ForbiddenError) throw error;
    return { error: error.message || "Failed to load goods receipts" };
  }
}

export async function getGoodsReceiptDetailAction(grId: string) {
  try {
    await requirePermission("GOODS_RECEIPT_VIEW");
    const receipt = await getGoodsReceiptDetail(grId);
    return { success: true, receipt };
  } catch (error: any) {
    if (error instanceof ForbiddenError) throw error;
    return { error: error.message || "Failed to load goods receipt details" };
  }
}

export async function getEligiblePOsAction() {
  try {
    await requirePermission("GOODS_RECEIPT_CREATE");
    const orders = await getEligiblePOsForReceiving();
    return { success: true, orders };
  } catch (error: any) {
    if (error instanceof ForbiddenError) throw error;
    return { error: error.message || "Failed to load eligible purchase orders" };
  }
}

export async function createGoodsReceiptAction(input: CreateGRInput) {
  await requirePermission("GOODS_RECEIPT_CREATE");
  try {
    const receipt = await createGoodsReceipt(input);
    revalidatePath("/purchasing/receipts");
    revalidatePath("/purchasing/orders");
    return { success: true, receipt };
  } catch (error: any) {
    if (error instanceof ForbiddenError) throw error;
    return { error: error.message || "Failed to create goods receipt" };
  }
}

export async function confirmGoodsReceiptAction(grId: string) {
  await requirePermission("GOODS_RECEIPT_CONFIRM");
  try {
    const receipt = await confirmGoodsReceipt(grId);
    revalidatePath("/purchasing/receipts");
    revalidatePath(`/purchasing/receipts/${grId}`);
    revalidatePath("/purchasing/orders");
    revalidatePath("/admin/stock");
    revalidatePath("/admin/products");
    revalidatePath("/inventory/movements");
    return { success: true, receipt };
  } catch (error: any) {
    if (error instanceof ForbiddenError) throw error;
    return { error: error.message || "Failed to confirm goods receipt" };
  }
}

export async function cancelGoodsReceiptAction(grId: string) {
  await requirePermission("GOODS_RECEIPT_CANCEL");
  try {
    const receipt = await cancelGoodsReceipt(grId);
    revalidatePath("/purchasing/receipts");
    revalidatePath(`/purchasing/receipts/${grId}`);
    return { success: true, receipt };
  } catch (error: any) {
    if (error instanceof ForbiddenError) throw error;
    return { error: error.message || "Failed to cancel goods receipt" };
  }
}
