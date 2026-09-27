"use server";

import {
  getPromotionsList,
  getPromotionById,
  createPromotion,
  updatePromotion,
  togglePromotionStatus,
  deletePromotion,
  getActivePromotionsForPos,
  CreatePromotionInput,
  UpdatePromotionInput,
  PromotionFilterOptions,
} from "@/lib/promotions";
import { revalidatePath } from "next/cache";

export async function getPromotionsAction(options?: PromotionFilterOptions) {
  try {
    const promotions = await getPromotionsList(options);
    return { success: true, promotions };
  } catch (error: any) {
    return { error: error.message || "Failed to load promotions" };
  }
}

export async function getActivePromotionsForPosAction() {
  try {
    const promotions = await getActivePromotionsForPos();
    return { success: true, promotions };
  } catch (error: any) {
    return { error: error.message || "Failed to load active promotions" };
  }
}

export async function getPromotionDetailAction(id: string) {
  try {
    const promotion = await getPromotionById(id);
    return { success: true, promotion };
  } catch (error: any) {
    return { error: error.message || "Failed to load promotion detail" };
  }
}

export async function createPromotionAction(input: CreatePromotionInput) {
  try {
    const promotion = await createPromotion(input);
    revalidatePath("/admin/promotions");
    revalidatePath("/pos");
    return { success: true, promotion };
  } catch (error: any) {
    return { error: error.message || "Failed to create promotion" };
  }
}

export async function updatePromotionAction(id: string, input: UpdatePromotionInput) {
  try {
    const promotion = await updatePromotion(id, input);
    revalidatePath("/admin/promotions");
    revalidatePath("/pos");
    return { success: true, promotion };
  } catch (error: any) {
    return { error: error.message || "Failed to update promotion" };
  }
}

export async function togglePromotionStatusAction(id: string, activate: boolean) {
  try {
    const promotion = await togglePromotionStatus(id, activate);
    revalidatePath("/admin/promotions");
    revalidatePath("/pos");
    return { success: true, promotion };
  } catch (error: any) {
    return { error: error.message || "Failed to toggle promotion status" };
  }
}

export async function deletePromotionAction(id: string) {
  try {
    await deletePromotion(id);
    revalidatePath("/admin/promotions");
    revalidatePath("/pos");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to delete promotion" };
  }
}
