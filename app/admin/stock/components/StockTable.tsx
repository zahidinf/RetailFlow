"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { StockItem } from "../actions";
import { getStockStatusBadgeStyles } from "@/lib/stock-utils";
import UpdateStockDialog from "./UpdateStockDialog";
import StockMovementsDialog from "./StockMovementsDialog";
import TablePagination from "@/app/components/TablePagination";

interface CategoryOption {
  id: string;
  name: string;
}

interface StockTableProps {
  stocks: StockItem[];
  categories: CategoryOption[];
  canUpdate: boolean;
  canViewMovements?: boolean;
  currentSearch: string;
  currentCategory: string;
  currentStatus: string;
}

export default function StockTable({
  stocks,
  categories,
  canUpdate,
  canViewMovements = false,
  currentSearch,
  currentCategory,
  currentStatus,
}: StockTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState(currentSearch);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [currentSearch, currentCategory, currentStatus, stocks.length]);

  const applyFilters = (newSearch: string, newCategory: string, newStatus: string) => {
    setCurrentPage(1);
    const params = new URLSearchParams();
    if (newSearch.trim()) params.set("search", newSearch.trim());
    if (newCategory) params.set("categoryId", newCategory);
    if (newStatus && newStatus !== "ALL") params.set("stockStatus", newStatus);
    router.push(`/admin/stock${params.toString() ? `?${params.toString()}` : ""}`);
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

  const handleClearFilters = () => {
    setSearch("");
    setCurrentPage(1);
    router.push("/admin/stock");
  };

  const hasActiveFilters = Boolean(currentSearch || currentCategory || currentStatus);

  const paginatedStocks = stocks.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
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
            placeholder="Search by SKU, Product Name, or Barcode..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 border border-slate-300 dark:border-slate-800 rounded-lg focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-600/10 dark:focus:ring-blue-500/20 text-sm transition-colors"
          />
        </div>

        {/* Category Dropdown */}
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

        {/* Stock Status Dropdown */}
        <select
          value={currentStatus}
          onChange={(e) => handleStatusFilter(e.target.value)}
          className="px-3.5 py-2.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-800 rounded-lg focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-600/10 dark:focus:ring-blue-500/20 text-sm transition-colors"
        >
          <option value="">All Stock Statuses</option>
          <option value="IN_STOCK">IN STOCK</option>
          <option value="LOW_STOCK">LOW STOCK</option>
          <option value="OUT_OF_STOCK">OUT OF STOCK</option>
        </select>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="px-3.5 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Stock Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 font-semibold">
                <th className="px-6 py-3.5 whitespace-nowrap">SKU</th>
                <th className="px-6 py-3.5 whitespace-nowrap">Product</th>
                <th className="px-6 py-3.5 whitespace-nowrap">Category</th>
                <th className="px-6 py-3.5 whitespace-nowrap">Current Stock</th>
                <th className="px-6 py-3.5 whitespace-nowrap">Minimum Stock</th>
                <th className="px-6 py-3.5 whitespace-nowrap">Unit</th>
                <th className="px-6 py-3.5 whitespace-nowrap">Stock Status</th>
                {(canUpdate || canViewMovements) && (
                  <th className="px-6 py-3.5 text-right whitespace-nowrap">Action</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm text-slate-900 dark:text-white">
              {stocks.length === 0 ? (
                <tr>
                  <td
                    colSpan={(canUpdate || canViewMovements) ? 8 : 7}
                    className="px-6 py-12 text-center text-slate-500 dark:text-slate-400"
                  >
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <svg
                        className="w-8 h-8 text-slate-300 dark:text-slate-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                        />
                      </svg>
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-300">No stock records found</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        {hasActiveFilters
                          ? "Try changing your search keywords or filter options"
                          : "Products created in the system will automatically appear here"}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedStocks.map((stock) => {
                  const badgeStyles = getStockStatusBadgeStyles(stock.status);
                  return (
                    <tr key={stock.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                      {/* SKU */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-xs font-semibold px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                          {stock.product.sku}
                        </span>
                      </td>

                      {/* Product */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900 dark:text-white">{stock.product.name}</div>
                        {stock.product.barcode && (
                          <div className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                            Barcode: {stock.product.barcode}
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td className="px-6 py-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
                        <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
                          {stock.product.category.name}
                        </span>
                      </td>

                      {/* Current Stock */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`font-bold ${
                            stock.currentStock <= 0
                              ? "text-red-600 dark:text-red-400"
                              : stock.currentStock <= stock.product.minimumStock
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-slate-900 dark:text-white"
                          }`}
                        >
                          {stock.currentStock}
                        </span>
                      </td>

                      {/* Minimum Stock */}
                      <td className="px-6 py-4 whitespace-nowrap text-slate-600 dark:text-slate-300 font-medium">
                        {stock.product.minimumStock}
                      </td>

                      {/* Unit */}
                      <td className="px-6 py-4 whitespace-nowrap text-slate-600 dark:text-slate-400 font-medium text-xs">
                        {stock.product.unit}
                      </td>

                      {/* Stock Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeStyles.badge}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${badgeStyles.dot}`} />
                          {stock.statusFormatted}
                        </span>
                      </td>

                      {/* Action */}
                      {(canUpdate || canViewMovements) && (
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end">
                            {canViewMovements && (
                              <StockMovementsDialog
                                productId={stock.productId}
                                productName={stock.product.name}
                              />
                            )}
                            {canUpdate && <UpdateStockDialog stock={stock} />}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <TablePagination
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={stocks.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setCurrentPage(1);
        }}
      />
    </div>
  );
}
