"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ProductUnit, ProductStatus } from "@prisma/client";
import EditProductDialog from "./EditProductDialog";
import DeleteProductDialog from "./DeleteProductDialog";
import ProductImage from "@/app/components/ProductImage";
import TablePagination from "@/app/components/TablePagination";

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
  createdAt: Date;
  updatedAt: Date;
  category: {
    id: string;
    name: string;
  };
  stock: {
    currentStock: number;
  } | null;
}

interface Props {
  products: ProductItem[];
  categories: CategoryOption[];
  canUpdate: boolean;
  canDelete: boolean;
  currentSearch: string;
  currentCategory: string;
  currentStatus: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function ProductTable({
  products,
  categories,
  canUpdate,
  canDelete,
  currentSearch,
  currentCategory,
  currentStatus,
}: Props) {
  const router = useRouter();
  const [search, setSearch] = useState(currentSearch);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [currentSearch, currentCategory, currentStatus, products.length]);

  const applyFilters = (newSearch: string, newCategory: string, newStatus: string) => {
    setCurrentPage(1);
    const params = new URLSearchParams();
    if (newSearch.trim()) params.set("search", newSearch.trim());
    if (newCategory) params.set("categoryId", newCategory);
    if (newStatus) params.set("status", newStatus);
    router.push(`/admin/products${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    applyFilters(value, currentCategory, currentStatus);
  };

  const handleCategoryFilter = (value: string) => {
    applyFilters(search, value, currentStatus);
  };

  const handleStatusFilter = (value: string) => {
    applyFilters(search, currentCategory, value);
  };

  const paginatedProducts = products.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search by SKU, barcode, or name..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 border border-slate-300 dark:border-slate-800 rounded-lg focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-600/10 dark:focus:ring-blue-500/20 text-sm transition-colors"
          />
        </div>

        <select
          value={currentCategory}
          onChange={(e) => handleCategoryFilter(e.target.value)}
          className="px-3.5 py-2.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-800 rounded-lg focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-600/10 dark:focus:ring-blue-500/20 text-sm transition-colors"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={currentStatus}
          onChange={(e) => handleStatusFilter(e.target.value)}
          className="px-3.5 py-2.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-800 rounded-lg focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-600/10 dark:focus:ring-blue-500/20 text-sm transition-colors"
        >
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      {/* Products Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 font-semibold">
                <th className="px-6 py-3.5 whitespace-nowrap">SKU</th>
                <th className="px-6 py-3.5 whitespace-nowrap">Barcode</th>
                <th className="px-6 py-3.5 whitespace-nowrap">Name</th>
                <th className="px-6 py-3.5 whitespace-nowrap">Category</th>
                <th className="px-6 py-3.5 whitespace-nowrap">Cost Price</th>
                <th className="px-6 py-3.5 whitespace-nowrap">Selling Price</th>
                <th className="px-6 py-3.5 whitespace-nowrap">Unit</th>
                <th className="px-6 py-3.5 whitespace-nowrap">Min. Stock</th>
                <th className="px-6 py-3.5 whitespace-nowrap">Refundable</th>
                <th className="px-6 py-3.5 whitespace-nowrap">Status</th>
                {(canUpdate || canDelete) && (
                  <th className="px-6 py-3.5 text-right whitespace-nowrap">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm text-slate-900 dark:text-white">
              {products.length === 0 ? (
                <tr>
                  <td
                    colSpan={canUpdate || canDelete ? 11 : 10}
                    className="px-6 py-12 text-center text-slate-500 dark:text-slate-400"
                  >
                    No products found
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-xs font-semibold px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                        {product.sku}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-slate-600 dark:text-slate-400">
                      {product.barcode || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
                          <ProductImage
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 dark:text-white">{product.name}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            Current stock: {product.stock?.currentStock ?? 0}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
                      <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
                        {product.category.name}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-700 dark:text-slate-300 font-medium">
                      {formatCurrency(product.costPrice)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-900 dark:text-white font-semibold">
                      {formatCurrency(product.sellingPrice)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-600 dark:text-slate-400 font-medium text-xs">
                      {product.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-600 dark:text-slate-400">
                      {product.minimumStock}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${
                          product.refundable
                            ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        {product.refundable ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold w-fit border ${
                          product.status === "ACTIVE"
                            ? "bg-green-50 dark:bg-green-950/60 text-green-700 dark:text-green-300 border-green-200/60 dark:border-green-800/60"
                            : "bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200/60 dark:border-red-800/60"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            product.status === "ACTIVE" ? "bg-green-600 dark:bg-green-400" : "bg-red-600 dark:bg-red-400"
                          }`}
                        />
                        {product.status}
                      </span>
                    </td>
                    {(canUpdate || canDelete) && (
                      <td className="px-6 py-4 whitespace-nowrap text-right space-x-3">
                        {canUpdate && (
                          <EditProductDialog product={product} categories={categories} />
                        )}
                        {canDelete && <DeleteProductDialog product={product} />}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <TablePagination
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={products.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setCurrentPage(1);
        }}
      />
    </div>
  );
}
