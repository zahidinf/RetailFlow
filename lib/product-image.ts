export const DEFAULT_PRODUCT_IMAGE = "/images/default-product.jpg";

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

export const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

// Max file size: 5 MB
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

export function getProductImageUrl(image?: string | null): string {
  if (image && typeof image === "string" && image.trim().length > 0) {
    return image.trim();
  }
  return DEFAULT_PRODUCT_IMAGE;
}

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: "No file provided" };
  }

  if (file.size <= 0) {
    return { valid: false, error: "Uploaded file is empty" };
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size exceeds the 5MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB)`,
    };
  }

  const name = file.name || "";
  const lastDot = name.lastIndexOf(".");
  const ext = lastDot !== -1 ? name.slice(lastDot).toLowerCase() : "";

  if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: "Invalid file extension. Only JPG, JPEG, PNG, and WebP files are allowed.",
    };
  }

  if (file.type && !ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: "Invalid file type. Only JPG, PNG, and WebP images are allowed.",
    };
  }

  return { valid: true };
}
