"use server";

import {
  createSaleTransaction,
  getSalesList,
  getSaleDetailById,
  getStockMovementsList,
  CreateSaleInput,
  SalesFilterOptions,
} from "@/lib/sales";
import {
  processRefund,
  getEligibleRefundManagers,
  checkSaleRefundEligibility,
  ProcessRefundInput,
} from "@/lib/refund";
import { revalidatePath } from "next/cache";

export async function createSaleAction(input: CreateSaleInput) {
  try {
    const sale = await createSaleTransaction(input);
    revalidatePath("/admin/stock");
    revalidatePath("/admin/products");
    revalidatePath("/sales");
    return { success: true, sale };
  } catch (error: any) {
    return { error: error.message || "Failed to create sale" };
  }
}

export async function getSalesAction(options?: SalesFilterOptions) {
  try {
    const sales = await getSalesList(options);
    return { success: true, sales };
  } catch (error: any) {
    return { error: error.message || "Failed to fetch sales" };
  }
}

export async function getSaleDetailAction(saleId: string) {
  try {
    const sale = await getSaleDetailById(saleId);
    return { success: true, sale };
  } catch (error: any) {
    return { error: error.message || "Failed to fetch sale detail" };
  }
}

export async function getStockMovementsAction(productId?: string) {
  try {
    const movements = await getStockMovementsList(productId);
    return { success: true, movements };
  } catch (error: any) {
    return { error: error.message || "Failed to fetch stock movements" };
  }
}

export async function getEligibleManagersAction() {
  try {
    const managers = await getEligibleRefundManagers();
    return { success: true, managers };
  } catch (error: any) {
    return { error: error.message || "Failed to fetch eligible managers" };
  }
}

export async function checkSaleRefundEligibilityAction(saleId: string) {
  try {
    const eligibility = await checkSaleRefundEligibility(saleId);
    return { success: true, eligibility };
  } catch (error: any) {
    return { error: error.message || "Failed to check refund eligibility" };
  }
}

export async function processRefundAction(input: ProcessRefundInput) {
  try {
    const result = await processRefund(input);
    revalidatePath("/sales");
    revalidatePath("/admin/stock");
    revalidatePath("/admin/products");
    return { success: true, data: result };
  } catch (error: any) {
    return { error: error.message || "Failed to process refund" };
  }
}
