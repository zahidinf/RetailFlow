"use client";

import { useState, useRef } from "react";
import { updateProduct } from "../actions";
import { ProductUnit, ProductStatus } from "@prisma/client";
import { validateImageFile, DEFAULT_PRODUCT_IMAGE } from "@/lib/product-image";
import ProductImage from "@/app/components/ProductImage";
import { PRODUCT_UNITS } from "@/lib/units";

interface CategoryOption {
  id: string;
  name: string;
}

interface ProductItem {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  categoryId: string;
  costPrice: number;
  sellingPrice: number;
  unit: ProductUnit;
  minimumStock: number;
  image?: string | null;
  refundable: boolean;
  status: ProductStatus;
}

interface Props {
  product: ProductItem;
  categories: CategoryOption[];
}

export default function EditProductDialog({ product, categories }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    sku: product.sku,
    barcode: product.barcode || "",
    name: product.name,
    categoryId: product.categoryId,
    costPrice: product.costPrice.toString(),
    sellingPrice: product.sellingPrice.toString(),
    unit: product.unit,
    minimumStock: product.minimumStock.toString(),
    refundable: product.refundable,
    status: product.status,
  });

  const handleOpen = () => {
    setFormData({
      sku: product.sku,
      barcode: product.barcode || "",
      name: product.name,
      categoryId: product.categoryId,
      costPrice: product.costPrice.toString(),
      sellingPrice: product.sellingPrice.toString(),
      unit: product.unit,
      minimumStock: product.minimumStock.toString(),
      refundable: product.refundable,
      status: product.status,
    });
    setSelectedImage(null);
    setNewImagePreview(null);
    setRemoveImage(false);
    setError(null);
    setIsOpen(true);
  };

  const handleClose = () => {
    if (newImagePreview) {
      URL.revokeObjectURL(newImagePreview);
    }
    setIsOpen(false);
    setSelectedImage(null);
    setNewImagePreview(null);
    setRemoveImage(false);
    setError(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || "Invalid image file");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (newImagePreview) {
      URL.revokeObjectURL(newImagePreview);
    }

    setSelectedImage(file);
    setNewImagePreview(URL.createObjectURL(file));
    setRemoveImage(false);
  };

  const handleRemoveImage = () => {
    if (newImagePreview) {
      URL.revokeObjectURL(newImagePreview);
    }
    setSelectedImage(null);
    setNewImagePreview(null);
    setRemoveImage(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRestoreImage = () => {
    if (newImagePreview) {
      URL.revokeObjectURL(newImagePreview);
    }
    setSelectedImage(null);
    setNewImagePreview(null);
    setRemoveImage(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.sku.trim()) {
      setError("SKU is required");
      return;
    }
    if (!formData.name.trim()) {
      setError("Product name is required");
      return;
    }
    if (!formData.categoryId) {
      setError("Category is required");
      return;
    }

    const cost = parseFloat(formData.costPrice);
    if (isNaN(cost) || cost < 0) {
      setError("Cost price must be a valid non-negative number");
      return;
    }

    const selling = parseFloat(formData.sellingPrice);
    if (isNaN(selling) || selling < 0) {
      setError("Selling price must be a valid non-negative number");
      return;
    }

    const minStock = parseInt(formData.minimumStock, 10);
    if (isNaN(minStock) || minStock < 0) {
      setError("Minimum stock must be a non-negative integer");
      return;
    }

    setLoading(true);

    try {
      const form = new FormData();
      form.append("sku", formData.sku);
      if (formData.barcode.trim()) {
        form.append("barcode", formData.barcode.trim());
      }
      form.append("name", formData.name);
      form.append("categoryId", formData.categoryId);
      form.append("costPrice", formData.costPrice);
      form.append("sellingPrice", formData.sellingPrice);
      form.append("unit", formData.unit);
      form.append("minimumStock", formData.minimumStock);
      form.append("refundable", String(formData.refundable));
      form.append("status", formData.status);
      if (selectedImage) {
        form.append("image", selectedImage);
      }
      if (removeImage) {
        form.append("removeImage", "true");
      }

      const result = await updateProduct(product.id, form);

      if (result.error) {
        setError(result.error);
      } else if (result.success) {
        handleClose();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
      >
        Edit
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs text-left">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full max-h-[90vh] overflow-y-auto transition-colors">
            <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between z-10 transition-colors">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Edit Product</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Update product information</p>
              </div>
              <button
                onClick={handleClose}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    SKU <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => handleChange("sku", e.target.value)}
                    placeholder="e.g. SKU-001"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-600/10 dark:focus:ring-blue-500/20 text-sm transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Barcode <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => handleChange("barcode", e.target.value)}
                    placeholder="e.g. 8991234567890"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-600/10 dark:focus:ring-blue-500/20 text-sm transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="Enter product name"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-600/10 dark:focus:ring-blue-500/20 text-sm transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.categoryId}
                    onChange={(e) => handleChange("categoryId", e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-600/10 dark:focus:ring-blue-500/20 text-sm transition-colors"
                  >
                    <option value="" disabled>Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Unit <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.unit}
                    onChange={(e) => handleChange("unit", e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-600/10 dark:focus:ring-blue-500/20 text-sm transition-colors"
                  >
                    {PRODUCT_UNITS.map((u) => (
                      <option key={u.code} value={u.code}>
                        {u.code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Cost Price <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.costPrice}
                    onChange={(e) => handleChange("costPrice", e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-600/10 dark:focus:ring-blue-500/20 text-sm transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Selling Price <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.sellingPrice}
                    onChange={(e) => handleChange("sellingPrice", e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-600/10 dark:focus:ring-blue-500/20 text-sm transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Minimum Stock <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={formData.minimumStock}
                    onChange={(e) => handleChange("minimumStock", e.target.value)}
                    placeholder="0"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-600/10 dark:focus:ring-blue-500/20 text-sm transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleChange("status", e.target.value as ProductStatus)}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-600/10 dark:focus:ring-blue-500/20 text-sm transition-colors"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                <input
                  type="checkbox"
                  id={`edit-refundable-${product.id}`}
                  checked={formData.refundable}
                  onChange={(e) => setFormData((prev) => ({ ...prev, refundable: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor={`edit-refundable-${product.id}`} className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                  Refundable (Allow this product to be refunded in sales transactions)
                </label>
              </div>

              {/* Product Image Section */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Product Image <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">(Optional, max 5MB - JPG, PNG, WebP)</span>
                </label>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="w-20 h-20 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0 relative">
                    {newImagePreview ? (
                      <img
                        src={newImagePreview}
                        alt="Product preview"
                        className="w-full h-full object-cover"
                      />
                    ) : removeImage ? (
                      <img
                        src={DEFAULT_PRODUCT_IMAGE}
                        alt="Default fallback"
                        className="w-full h-full object-cover opacity-75"
                      />
                    ) : (
                      <ProductImage
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {newImagePreview
                          ? "New Image Selected"
                          : removeImage
                          ? "Reset to Default Image"
                          : product.image
                          ? "Custom Image"
                          : "Using Default Image"}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {newImagePreview
                        ? selectedImage?.name
                        : removeImage
                        ? "Product will use /images/default-product.jpg after saving."
                        : product.image
                        ? "Product has an uploaded custom image."
                        : "No image uploaded. Using /images/default-product.jpg."}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs font-semibold px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        {product.image || newImagePreview ? "Replace Image" : "Upload Image"}
                      </button>

                      {newImagePreview && (
                        <button
                          type="button"
                          onClick={() => {
                            if (newImagePreview) URL.revokeObjectURL(newImagePreview);
                            setSelectedImage(null);
                            setNewImagePreview(null);
                            if (fileInputRef.current) fileInputRef.current.value = "";
                          }}
                          className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
                        >
                          Cancel Selection
                        </button>
                      )}

                      {!removeImage && product.image && !newImagePreview && (
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="text-xs font-semibold text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors cursor-pointer"
                        >
                          Reset to Default Image
                        </button>
                      )}

                      {removeImage && product.image && (
                        <button
                          type="button"
                          onClick={handleRestoreImage}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors cursor-pointer"
                        >
                          Keep Current Image
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                  <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 font-medium text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm transition-colors shadow-xs"
                >
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
