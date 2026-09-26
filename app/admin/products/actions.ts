"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { safeRevalidatePath } from "@/lib/cache-utils";
import { ProductStatus, ProductUnit } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { saveProductImageFile, deleteProductImageFile } from "@/lib/product-image-server";
import { isValidProductUnit } from "@/lib/units";
import { recordAuditLog } from "@/lib/audit";

export async function getProducts(search?: string, categoryId?: string, status?: string) {
  await requirePermission("PRODUCT_VIEW");

  const where: Prisma.ProductWhereInput = {};

  if (search && search.trim()) {
    const term = search.trim();
    where.OR = [
      { sku: { contains: term, mode: "insensitive" } },
      { barcode: { contains: term, mode: "insensitive" } },
      { name: { contains: term, mode: "insensitive" } },
    ];
  }

  if (categoryId && categoryId.trim()) {
    where.categoryId = categoryId;
  }

  if (status && (status === "ACTIVE" || status === "INACTIVE")) {
    where.status = status;
  }

  const products = await prisma.product.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      category: {
        select: {
          id: true,
          name: true,
        },
      },
      stock: {
        select: {
          currentStock: true,
        },
      },
    },
  });

  return products.map((p) => ({
    ...p,
    costPrice: Number(p.costPrice),
    sellingPrice: Number(p.sellingPrice),
  }));
}

export async function getCategoriesForSelect() {
  const categories = await prisma.category.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return categories;
}

export async function createProduct(formData: FormData) {
  const session = await requirePermission("PRODUCT_CREATE");

  const sku = (formData.get("sku") as string)?.trim();
  const barcode = (formData.get("barcode") as string)?.trim() || null;
  const name = (formData.get("name") as string)?.trim();
  const categoryId = (formData.get("categoryId") as string)?.trim();
  const costPriceRaw = formData.get("costPrice") as string;
  const sellingPriceRaw = formData.get("sellingPrice") as string;
  const unitRaw = (formData.get("unit") as string)?.trim();
  const minimumStockRaw = formData.get("minimumStock") as string;
  const status = (formData.get("status") as ProductStatus) || "ACTIVE";
  const refundableRaw = formData.get("refundable");
  const refundable = refundableRaw !== null ? refundableRaw === "true" || refundableRaw === "on" : true;

  // Validation
  if (!sku) return { error: "SKU is required" };
  if (!name) return { error: "Product name is required" };
  if (!categoryId) return { error: "Category is required" };
  if (!unitRaw) return { error: "Unit is required" };
  if (!isValidProductUnit(unitRaw)) {
    return { error: "Invalid product unit. Time units (Seconds, Minutes, Hours, Days) are not permitted." };
  }
  const unit = unitRaw as ProductUnit;

  const costPrice = parseFloat(costPriceRaw);
  if (isNaN(costPrice) || costPrice < 0) {
    return { error: "Cost price must be a valid non-negative number" };
  }

  const sellingPrice = parseFloat(sellingPriceRaw);
  if (isNaN(sellingPrice) || sellingPrice < 0) {
    return { error: "Selling price must be a valid non-negative number" };
  }

  const minimumStock = parseInt(minimumStockRaw, 10);
  if (isNaN(minimumStock) || minimumStock < 0) {
    return { error: "Minimum stock must be a non-negative integer" };
  }

  // Check valid category
  const categoryExists = await prisma.category.findUnique({
    where: { id: categoryId },
  });
  if (!categoryExists) {
    return { error: "Selected category does not exist" };
  }

  // Check unique SKU
  const existingSku = await prisma.product.findUnique({
    where: { sku },
  });
  if (existingSku) {
    return { error: "A product with this SKU already exists" };
  }

  // Check unique Barcode if provided
  if (barcode) {
    const existingBarcode = await prisma.product.findUnique({
      where: { barcode },
    });
    if (existingBarcode) {
      return { error: "A product with this barcode already exists" };
    }
  }

  // Handle optional image upload
  let imagePath: string | null = null;
  const imageFile = formData.get("image");
  if (imageFile && imageFile instanceof File && imageFile.size > 0) {
    const uploadResult = await saveProductImageFile(imageFile);
    if (uploadResult.error) {
      return { error: uploadResult.error };
    }
    imagePath = uploadResult.imagePath || null;
  }

  try {
    // Create Product + Stock automatically in transaction
    await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          sku,
          barcode,
          name,
          categoryId,
          costPrice: new Prisma.Decimal(costPrice),
          sellingPrice: new Prisma.Decimal(sellingPrice),
          unit,
          minimumStock,
          image: imagePath,
          refundable,
          status,
        },
        include: {
          category: {
            select: { name: true },
          },
        },
      });

      await tx.stock.create({
        data: {
          productId: product.id,
          currentStock: 0,
        },
      });

      await recordAuditLog({
        tx,
        userId: session.id,
        action: "CREATE",
        module: "Product Management",
        entity: "Product",
        recordId: product.id,
        recordIdentifier: `${product.sku} - ${product.name}`,
        description: `Created product "${product.name}" (${product.sku})`,
        previousValue: null,
        newValue: {
          id: product.id,
          sku: product.sku,
          barcode: product.barcode,
          name: product.name,
          category: product.category.name,
          costPrice: Number(product.costPrice),
          sellingPrice: Number(product.sellingPrice),
          unit: product.unit,
          minimumStock: product.minimumStock,
          refundable: product.refundable,
          status: product.status,
          image: product.image,
        },
      });
    });
  } catch (err) {
    if (imagePath) {
      await deleteProductImageFile(imagePath);
    }
    throw err;
  }

  safeRevalidatePath("/admin/products");
  safeRevalidatePath("/admin/stock");
  return { success: true };
}

export async function updateProduct(productId: string, formData: FormData) {
  const session = await requirePermission("PRODUCT_UPDATE");

  const sku = (formData.get("sku") as string)?.trim();
  const barcode = (formData.get("barcode") as string)?.trim() || null;
  const name = (formData.get("name") as string)?.trim();
  const categoryId = (formData.get("categoryId") as string)?.trim();
  const costPriceRaw = formData.get("costPrice") as string;
  const sellingPriceRaw = formData.get("sellingPrice") as string;
  const unitRaw = (formData.get("unit") as string)?.trim();
  const minimumStockRaw = formData.get("minimumStock") as string;
  const status = (formData.get("status") as ProductStatus) || "ACTIVE";
  const refundableRaw = formData.get("refundable");

  if (!sku) return { error: "SKU is required" };
  if (!name) return { error: "Product name is required" };
  if (!categoryId) return { error: "Category is required" };
  if (!unitRaw) return { error: "Unit is required" };
  if (!isValidProductUnit(unitRaw)) {
    return { error: "Invalid product unit. Time units (Seconds, Minutes, Hours, Days) are not permitted." };
  }
  const unit = unitRaw as ProductUnit;

  const costPrice = parseFloat(costPriceRaw);
  if (isNaN(costPrice) || costPrice < 0) {
    return { error: "Cost price must be a valid non-negative number" };
  }

  const sellingPrice = parseFloat(sellingPriceRaw);
  if (isNaN(sellingPrice) || sellingPrice < 0) {
    return { error: "Selling price must be a valid non-negative number" };
  }

  const minimumStock = parseInt(minimumStockRaw, 10);
  if (isNaN(minimumStock) || minimumStock < 0) {
    return { error: "Minimum stock must be a non-negative integer" };
  }

  const existingProduct = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      category: {
        select: { name: true },
      },
    },
  });
  if (!existingProduct) {
    return { error: "Product not found" };
  }

  // Check category
  const categoryExists = await prisma.category.findUnique({
    where: { id: categoryId },
  });
  if (!categoryExists) {
    return { error: "Selected category does not exist" };
  }

  // Check unique SKU (if changed)
  if (sku !== existingProduct.sku) {
    const duplicateSku = await prisma.product.findUnique({
      where: { sku },
    });
    if (duplicateSku) {
      return { error: "A product with this SKU already exists" };
    }
  }

  // Check unique Barcode (if changed and not null)
  if (barcode && barcode !== existingProduct.barcode) {
    const duplicateBarcode = await prisma.product.findUnique({
      where: { barcode },
    });
    if (duplicateBarcode) {
      return { error: "A product with this barcode already exists" };
    }
  }

  // Handle image upload / removal
  const removeImage = formData.get("removeImage") === "true";
  const imageFile = formData.get("image");
  let imageToSet: string | null | undefined = undefined;
  let newlySavedImagePath: string | null = null;

  if (imageFile && imageFile instanceof File && imageFile.size > 0) {
    const uploadResult = await saveProductImageFile(imageFile);
    if (uploadResult.error) {
      return { error: uploadResult.error };
    }
    newlySavedImagePath = uploadResult.imagePath || null;
    imageToSet = newlySavedImagePath;
  } else if (removeImage) {
    imageToSet = null;
  }

  const refundable =
    refundableRaw !== null
      ? refundableRaw === "true" || refundableRaw === "on"
      : existingProduct.refundable;

  try {
    await prisma.$transaction(async (tx) => {
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: {
          sku,
          barcode,
          name,
          categoryId,
          costPrice: new Prisma.Decimal(costPrice),
          sellingPrice: new Prisma.Decimal(sellingPrice),
          unit,
          minimumStock,
          refundable,
          status,
          ...(imageToSet !== undefined ? { image: imageToSet } : {}),
        },
        include: {
          category: {
            select: { name: true },
          },
        },
      });

      await recordAuditLog({
        tx,
        userId: session.id,
        action: "UPDATE",
        module: "Product Management",
        entity: "Product",
        recordId: productId,
        recordIdentifier: `${updatedProduct.sku} - ${updatedProduct.name}`,
        description: `Updated product "${updatedProduct.name}" (${updatedProduct.sku})`,
        previousValue: {
          id: existingProduct.id,
          sku: existingProduct.sku,
          barcode: existingProduct.barcode,
          name: existingProduct.name,
          category: existingProduct.category.name,
          costPrice: Number(existingProduct.costPrice),
          sellingPrice: Number(existingProduct.sellingPrice),
          unit: existingProduct.unit,
          minimumStock: existingProduct.minimumStock,
          refundable: existingProduct.refundable,
          status: existingProduct.status,
          image: existingProduct.image,
        },
        newValue: {
          id: updatedProduct.id,
          sku: updatedProduct.sku,
          barcode: updatedProduct.barcode,
          name: updatedProduct.name,
          category: updatedProduct.category.name,
          costPrice: Number(updatedProduct.costPrice),
          sellingPrice: Number(updatedProduct.sellingPrice),
          unit: updatedProduct.unit,
          minimumStock: updatedProduct.minimumStock,
          refundable: updatedProduct.refundable,
          status: updatedProduct.status,
          image: updatedProduct.image,
        },
      });
    });

    // If image was replaced or removed, delete the old image file
    if (imageToSet !== undefined && existingProduct.image && existingProduct.image !== imageToSet) {
      await deleteProductImageFile(existingProduct.image);
    }
  } catch (err) {
    // If update failed and we saved a new image, clean it up
    if (newlySavedImagePath) {
      await deleteProductImageFile(newlySavedImagePath);
    }
    throw err;
  }

  safeRevalidatePath("/admin/products");
  safeRevalidatePath("/admin/stock");
  return { success: true };
}

export async function deleteProduct(productId: string) {
  const session = await requirePermission("PRODUCT_DELETE");

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      stock: true,
      category: {
        select: { name: true },
      },
    },
  });

  if (!product) {
    return { error: "Product not found" };
  }

  if (product.stock && product.stock.currentStock > 0) {
    return {
      error: `Cannot delete product with active inventory (${product.stock.currentStock} in stock). Adjust stock to 0 or set product status to INACTIVE.`,
    };
  }

  const movementCount = await prisma.stockMovement.count({
    where: { productId },
  });
  if (movementCount > 0) {
    return {
      error: `Cannot delete product with existing stock movements (${movementCount} recorded). Set product status to INACTIVE instead.`,
    };
  }

  // Safe to delete - audit log then delete stock and product in transaction
  await prisma.$transaction(async (tx) => {
    await recordAuditLog({
      tx,
      userId: session.id,
      action: "DELETE",
      module: "Product Management",
      entity: "Product",
      recordId: productId,
      recordIdentifier: `${product.sku} - ${product.name}`,
      description: `Deleted product "${product.name}" (${product.sku})`,
      previousValue: {
        id: product.id,
        sku: product.sku,
        barcode: product.barcode,
        name: product.name,
        category: product.category.name,
        costPrice: Number(product.costPrice),
        sellingPrice: Number(product.sellingPrice),
        unit: product.unit,
        minimumStock: product.minimumStock,
        refundable: product.refundable,
        status: product.status,
        image: product.image,
      },
      newValue: null,
    });

    if (product.stock) {
      await tx.stock.delete({
        where: { productId },
      });
    }
    await tx.product.delete({
      where: { id: productId },
    });
  });

  // Clean up product image file if any
  if (product.image) {
    await deleteProductImageFile(product.image);
  }

  safeRevalidatePath("/admin/products");
  safeRevalidatePath("/admin/stock");
  return { success: true };
}
