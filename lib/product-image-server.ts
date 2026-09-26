import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import {
  ALLOWED_IMAGE_EXTENSIONS,
  validateImageFile,
} from "./product-image";

export function validateImageMagicBytes(buffer: Buffer): { valid: boolean; error?: string } {
  if (buffer.length < 12) {
    return { valid: false, error: "File content is too small to be a valid image." };
  }

  // JPEG: FF D8 FF
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const isPng =
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;

  // WebP: RIFF (bytes 0-3) + WEBP (bytes 8-11)
  const isWebp =
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50;

  if (!isJpeg && !isPng && !isWebp) {
    return {
      valid: false,
      error: "File content does not match a valid JPG, PNG, or WebP image format.",
    };
  }

  return { valid: true };
}

export async function saveProductImageFile(
  file: File
): Promise<{ imagePath?: string; error?: string }> {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    return { error: validation.error };
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const byteValidation = validateImageMagicBytes(buffer);
  if (!byteValidation.valid) {
    return { error: byteValidation.error };
  }

  let ext = path.extname(file.name).toLowerCase();
  if (ext === ".jpeg") ext = ".jpg";
  if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
    ext = ".jpg";
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", "products");
  await fs.mkdir(uploadDir, { recursive: true });

  const randomHash = crypto.randomBytes(8).toString("hex");
  const fileName = `product-${Date.now()}-${randomHash}${ext}`;
  const filePath = path.join(uploadDir, fileName);

  await fs.writeFile(filePath, buffer);

  return { imagePath: `/uploads/products/${fileName}` };
}

export async function deleteProductImageFile(imagePath?: string | null): Promise<void> {
  if (!imagePath || typeof imagePath !== "string") return;

  // Only remove files within our product uploads directory, never default-product.jpg or outside files
  if (!imagePath.startsWith("/uploads/products/")) return;

  const fileName = path.basename(imagePath);
  const uploadDir = path.join(process.cwd(), "public", "uploads", "products");
  const fullPath = path.join(uploadDir, fileName);

  // Guard against path traversal
  const normalizedPath = path.normalize(fullPath);
  if (!normalizedPath.startsWith(uploadDir)) return;

  try {
    await fs.unlink(normalizedPath);
  } catch (err: any) {
    // Ignore error if file doesn't exist
    if (err.code !== "ENOENT") {
      console.error(`Failed to delete product image ${normalizedPath}:`, err);
    }
  }
}
