"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

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
  await requirePermission("CATEGORY_CREATE");

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

  await prisma.category.create({
    data: {
      name,
      description: description || null,
      status: status as "ACTIVE" | "INACTIVE",
    },
  });

  revalidatePath("/admin/categories");
  return { success: true };
}

export async function updateCategory(categoryId: string, formData: FormData) {
  await requirePermission("CATEGORY_UPDATE");

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

  await prisma.category.update({
    where: { id: categoryId },
    data: {
      name,
      description: description === "" ? null : (description || null),
      status: status as "ACTIVE" | "INACTIVE",
    },
  });

  revalidatePath("/admin/categories");
  return { success: true };
}

export async function deleteCategory(categoryId: string) {
  await requirePermission("CATEGORY_DELETE");

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

  await prisma.category.delete({
    where: { id: categoryId },
  });

  revalidatePath("/admin/categories");
  return { success: true };
}
