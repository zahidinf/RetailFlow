"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { revalidatePath } from "next/cache";
import {
  getParameterSettings,
  validateParameterInput,
  PARAM_REFUND_VALIDITY_PERIOD,
  ensureDefaultParameterSettings,
} from "@/lib/parameter-settings";
import { ParameterStatus } from "@prisma/client";

export async function fetchParameterSettings(search?: string, status?: string) {
  await requirePermission("PARAMETER_SETTINGS_VIEW");
  return await getParameterSettings(search, status);
}

export async function createParameterSettingAction(formData: FormData) {
  await requirePermission("PARAMETER_SETTINGS_CREATE");

  const code = (formData.get("code") as string)?.trim().toUpperCase();
  const name = (formData.get("name") as string)?.trim();
  const value = (formData.get("value") as string)?.trim();
  const unit = (formData.get("unit") as string)?.trim() || null;
  const description = (formData.get("description") as string)?.trim() || null;
  const status =
    (formData.get("status") as string) === "INACTIVE"
      ? ParameterStatus.INACTIVE
      : ParameterStatus.ACTIVE;

  if (!code) return { error: "Parameter Code is required" };
  if (!name) return { error: "Parameter Name is required" };
  if (!value) return { error: "Parameter Value is required" };

  const validationError = validateParameterInput(code, value, unit);
  if (validationError) {
    return { error: validationError };
  }

  const existing = await prisma.parameterSetting.findUnique({
    where: { code },
  });
  if (existing) {
    return { error: `Parameter with code "${code}" already exists` };
  }

  try {
    const created = await prisma.parameterSetting.create({
      data: {
        code,
        name,
        value,
        unit,
        description,
        status,
      },
    });

    revalidatePath("/admin/parameter-settings");
    revalidatePath("/administration/parameter-settings");
    return { success: true, parameter: created };
  } catch (error: any) {
    return { error: error.message || "Failed to create parameter setting" };
  }
}

export async function updateParameterSettingAction(id: string, formData: FormData) {
  await requirePermission("PARAMETER_SETTINGS_UPDATE");

  const name = (formData.get("name") as string)?.trim();
  const value = (formData.get("value") as string)?.trim();
  const unit = (formData.get("unit") as string)?.trim() || null;
  const description = (formData.get("description") as string)?.trim() || null;
  const status =
    (formData.get("status") as string) === "INACTIVE"
      ? ParameterStatus.INACTIVE
      : ParameterStatus.ACTIVE;

  if (!name) return { error: "Parameter Name is required" };
  if (!value) return { error: "Parameter Value is required" };

  const existing = await prisma.parameterSetting.findUnique({
    where: { id },
  });
  if (!existing) {
    return { error: "Parameter setting not found" };
  }

  const validationError = validateParameterInput(existing.code, value, unit, existing.unit);
  if (validationError) {
    return { error: validationError };
  }

  try {
    const updated = await prisma.parameterSetting.update({
      where: { id },
      data: {
        name,
        value,
        unit,
        description,
        status,
      },
    });

    revalidatePath("/admin/parameter-settings");
    revalidatePath("/administration/parameter-settings");
    return { success: true, parameter: updated };
  } catch (error: any) {
    return { error: error.message || "Failed to update parameter setting" };
  }
}

export async function deleteParameterSettingAction(id: string) {
  await requirePermission("PARAMETER_SETTINGS_DELETE");

  const existing = await prisma.parameterSetting.findUnique({
    where: { id },
  });
  if (!existing) {
    return { error: "Parameter setting not found" };
  }

  if (existing.code === PARAM_REFUND_VALIDITY_PERIOD) {
    return { error: "Cannot delete required core system parameter REFUND_VALIDITY_PERIOD" };
  }

  try {
    await prisma.parameterSetting.delete({
      where: { id },
    });

    revalidatePath("/admin/parameter-settings");
    revalidatePath("/administration/parameter-settings");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to delete parameter setting" };
  }
}
