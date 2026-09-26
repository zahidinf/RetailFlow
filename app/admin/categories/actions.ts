"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { safeRevalidatePath } from "@/lib/cache-utils";
import { Prisma } from "@prisma/client";
import { recordAuditLog } from "@/lib/audit";

export async function getCategories(search?: string, status?: string) {
  await requirePermission("CATEGORY_VIEW");

  const where: Prisma.CategoryWhereInput = {};
  
  if (search && search.trim()) {
    where.name = { contains: search.trim(), mode: "insensitive" };
  }
  
  if (status && (status === "ACTIVE" || status === "INACTIVE")) {
    where.status = status;
  }

  const categories = await prisma.category.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { products: true },
      },
    },
  });

  return categories;
}

export async function createCategory(formData: FormData) {
  const session = await requirePermission("CATEGORY_CREATE");

  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim();
  const status = (formData.get("status") as string) || "ACTIVE";

  if (!name) {
    return { error: "Category name is required" };
  }

  if (status !== "ACTIVE" && status !== "INACTIVE") {
    return { error: "Invalid status" };
  }

  // Check duplicate (case-insensitive)
  const existing = await prisma.category.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });

  if (existing) {
    return { error: "A category with this name already exists" };
  }

  await prisma.$transaction(async (tx) => {
    const category = await tx.category.create({
      data: {
        name,
        description: description || null,
        status: status as "ACTIVE" | "INACTIVE",
      },
    });

    await recordAuditLog({
      tx,
      userId: session.id,
      action: "CREATE",
      module: "Product Management",
      entity: "Category",
      recordId: category.id,
      recordIdentifier: category.name,
      description: `Created category "${category.name}"`,
      previousValue: null,
      newValue: {
        id: category.id,
        name: category.name,
        description: category.description,
        status: category.status,
      },
    });
  });

  safeRevalidatePath("/admin/categories");
  return { success: true };
}

export async function updateCategory(categoryId: string, formData: FormData) {
  const session = await requirePermission("CATEGORY_UPDATE");

  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim();
  const status = (formData.get("status") as string) || "ACTIVE";

  if (!name) {
    return { error: "Category name is required" };
  }

  if (status !== "ACTIVE" && status !== "INACTIVE") {
    return { error: "Invalid status" };
  }

  const existingCategory = await prisma.category.findUnique({
    where: { id: categoryId },
  });

  if (!existingCategory) {
    return { error: "Category not found" };
  }

  // Check duplicate name (exclude current)
  if (name.toLowerCase() !== existingCategory.name.toLowerCase()) {
    const duplicate = await prisma.category.findFirst({
      where: {
        name: { equals: name, mode: "insensitive" },
        id: { not: categoryId },
      },
    });

    if (duplicate) {
      return { error: "A category with this name already exists" };
    }
  }

  await prisma.$transaction(async (tx) => {
    const updatedCategory = await tx.category.update({
      where: { id: categoryId },
      data: {
        name,
        description: description === "" ? null : (description || null),
        status: status as "ACTIVE" | "INACTIVE",
      },
    });

    await recordAuditLog({
      tx,
      userId: session.id,
      action: "UPDATE",
      module: "Product Management",
      entity: "Category",
      recordId: categoryId,
      recordIdentifier: updatedCategory.name,
      description: `Updated category "${updatedCategory.name}"`,
      previousValue: {
        id: existingCategory.id,
        name: existingCategory.name,
        description: existingCategory.description,
        status: existingCategory.status,
      },
      newValue: {
        id: updatedCategory.id,
        name: updatedCategory.name,
        description: updatedCategory.description,
        status: updatedCategory.status,
      },
    });
  });

  safeRevalidatePath("/admin/categories");
  return { success: true };
}

export async function deleteCategory(categoryId: string) {
  const session = await requirePermission("CATEGORY_DELETE");

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: {
      _count: { select: { products: true } },
    },
  });

  if (!category) {
    return { error: "Category not found" };
  }

  if (category._count.products > 0) {
    return { error: "Category cannot be deleted because it is currently assigned to one or more products." };
  }

  await prisma.$transaction(async (tx) => {
    await recordAuditLog({
      tx,
      userId: session.id,
      action: "DELETE",
      module: "Product Management",
      entity: "Category",
      recordId: categoryId,
      recordIdentifier: category.name,
      description: `Deleted category "${category.name}"`,
      previousValue: {
        id: category.id,
        name: category.name,
        description: category.description,
        status: category.status,
      },
      newValue: null,
    });

    await tx.category.delete({
      where: { id: categoryId },
    });
  });

  safeRevalidatePath("/admin/categories");
  return { success: true };
}
