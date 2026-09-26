"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { usePermissions } from "@/app/components/PermissionProvider";
import TablePagination from "@/app/components/TablePagination";
import { formatRupiah } from "@/lib/tax-utils";

type ReportCategory = "sales" | "inventory" | "purchasing" | "warehouse" | "finance" | "cashier" | "audit";

interface CategoryMeta {
  id: ReportCategory;
  name: string;
  permission: string;
  reports: Array<{ id: string; name: string }>;
}

const CATEGORIES: CategoryMeta[] = [
  {
    id: "sales",
    name: "Sales Reports",
    permission: "REPORT_SALES_VIEW",
    reports: [
      { id: "sales-summary", name: "Sales Summary" },
      { id: "sales-transactions", name: "Sales Transactions" },
      { id: "sales-by-product", name: "Sales by Product" },
      { id: "sales-by-category", name: "Sales by Category" },
      { id: "sales-by-cashier", name: "Sales by Cashier" },
      { id: "sales-by-payment-method", name: "Sales by Payment Method" },
      { id: "sales-refund", name: "Refund Report" },
      { id: "sales-discount", name: "Discount Report" },
    ],
  },
  {
    id: "inventory",
    name: "Inventory Reports",
    permission: "REPORT_INVENTORY_VIEW",
    reports: [
      { id: "stock-summary", name: "Stock Summary" },
      { id: "stock-movement", name: "Stock Movement" },
      { id: "stock-adjustment", name: "Stock Adjustment" },
      { id: "low-stock", name: "Low Stock" },
      { id: "out-of-stock", name: "Out of Stock" },
    ],
  },
  {
    id: "purchasing",
    name: "Purchasing Reports",
    permission: "REPORT_PURCHASING_VIEW",
    reports: [
      { id: "purchase-summary", name: "Purchase Summary" },
      { id: "purchase-orders", name: "Purchase Orders" },
      { id: "purchase-by-supplier", name: "Purchase by Supplier" },
      { id: "purchase-by-product", name: "Purchase by Product" },
      { id: "outstanding-purchase-orders", name: "Outstanding Purchase Orders" },
    ],
  },
  {
    id: "warehouse",
    name: "Warehouse Reports",
    permission: "REPORT_WAREHOUSE_VIEW",
    reports: [
      { id: "goods-receipt", name: "Goods Receipt" },
      { id: "receiving-by-supplier", name: "Receiving by Supplier" },
      { id: "receiving-by-po", name: "Receiving by Purchase Order" },
      { id: "receiving-discrepancy", name: "Receiving Discrepancy" },
      { id: "pending-receiving", name: "Pending Receiving" },
      { id: "partial-receiving", name: "Partial Receiving" },
    ],
  },
  {
    id: "finance",
    name: "Finance Reports",
    permission: "REPORT_FINANCE_VIEW",
    reports: [
      { id: "revenue", name: "Revenue Report" },
      { id: "payment", name: "Payment Report" },
      { id: "tax", name: "Tax Report" },
      { id: "refund", name: "Refund Report" },
      { id: "discount", name: "Discount Report" },
      { id: "purchase-expense", name: "Purchase Expense" },
    ],
  },
  {
    id: "cashier",
    name: "Cashier Reports",
    permission: "REPORT_CASHIER_VIEW",
    reports: [
      { id: "cashier-sales", name: "Cashier Sales" },
      { id: "payment-summary", name: "Payment Summary" },
      { id: "cash-collection", name: "Cash Collection" },
    ],
  },
  {
    id: "audit",
    name: "Audit Reports",
    permission: "REPORT_AUDIT_VIEW",
    reports: [
      { id: "user-activity", name: "User Activity" },
      { id: "login-activity", name: "Login Activity" },
      { id: "transaction-audit", name: "Transaction Audit" },
      { id: "refund-audit", name: "Refund Audit" },
      { id: "stock-adjustment-audit", name: "Stock Adjustment Audit" },
      { id: "purchase-order-audit", name: "Purchase Order Audit" },
      { id: "goods-receipt-audit", name: "Goods Receipt Audit" },
    ],
  },
];

export default function ReportsDashboard() {
  const searchParams = useSearchParams();
  const { hasPermission } = usePermissions();

  const canExport = hasPermission("REPORT_EXPORT");

  const permittedCategories = CATEGORIES.filter((c) => hasPermission(c.permission));

  const initialCatParam = (searchParams.get("category") as ReportCategory) || undefined;
  const validDefaultCat =
    permittedCategories.find((c) => c.id === initialCatParam)?.id ||
    permittedCategories[0]?.id ||
    "sales";

  const [selectedCategory, setSelectedCategory] = useState<ReportCategory>(validDefaultCat);
  const currentCategoryMeta = permittedCategories.find((c) => c.id === selectedCategory);

  const [selectedReport, setSelectedReport] = useState<string>(
    currentCategoryMeta?.reports[0]?.id || "sales-summary"
  );

  // Filters state
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [categoryId, setCategoryId] = useState("ALL");
  const [supplierId, setSupplierId] = useState("ALL");
  const [cashierId, setCashierId] = useState("ALL");
  const [paymentMethod, setPaymentMethod] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Metadata dropdown options from server
  const [filterOptions, setFilterOptions] = useState<{
    categories: Array<{ id: string; name: string }>;
    suppliers: Array<{ id: string; name: string; code: string }>;
    cashiers: Array<{ id: string; name: string }>;
    users: Array<{ id: string; name: string }>;
  }>({
    categories: [],
    suppliers: [],
    cashiers: [],
    users: [],
  });

  // Report data state
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch filter metadata on load
  useEffect(() => {
    async function loadFilters() {
      try {
        const res = await fetch("/api/reports/filters");
        if (res.ok) {
          const json = await res.json();
          setFilterOptions(json.data);
        }
      } catch (err) {
        console.error("Failed to load filter metadata:", err);
      }
    }
    loadFilters();
  }, []);

  // Update selected report when category changes
  const handleCategoryChange = (cat: ReportCategory) => {
    setSelectedCategory(cat);
    const meta = permittedCategories.find((c) => c.id === cat);
    if (meta && meta.reports.length > 0) {
      setSelectedReport(meta.reports[0].id);
      setPage(1);
    }
  };

  // Fetch report data
  useEffect(() => {
    if (!selectedReport) return;

    let isMounted = true;
    async function fetchReport() {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (search.trim()) params.set("search", search.trim());
      if (status !== "ALL") params.set("status", status);
      if (categoryId !== "ALL") params.set("categoryId", categoryId);
      if (supplierId !== "ALL") params.set("supplierId", supplierId);
      if (cashierId !== "ALL") params.set("cashierId", cashierId);
      if (paymentMethod !== "ALL") params.set("paymentMethod", paymentMethod);
      params.set("page", page.toString());
      params.set("pageSize", pageSize.toString());

      try {
        const res = await fetch(`/api/reports/${selectedReport}?${params.toString()}`);
        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error || `Error loading report: ${res.statusText}`);
        }
        const json = await res.json();
        if (isMounted) {
          setReportData(json.data);
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || "Failed to load report data");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchReport();
    return () => {
      isMounted = false;
    };
  }, [
    selectedReport,
    startDate,
    endDate,
    search,
    status,
    categoryId,
    supplierId,
    cashierId,
    paymentMethod,
    page,
    pageSize,
  ]);

  const handleExportCSV = () => {
    if (!selectedReport || !canExport) return;
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (search.trim()) params.set("search", search.trim());
    if (status !== "ALL") params.set("status", status);
    if (categoryId !== "ALL") params.set("categoryId", categoryId);
    if (supplierId !== "ALL") params.set("supplierId", supplierId);
    if (cashierId !== "ALL") params.set("cashierId", cashierId);
    if (paymentMethod !== "ALL") params.set("paymentMethod", paymentMethod);

    window.open(`/api/reports/${selectedReport}/export?${params.toString()}`, "_blank");
  };

  if (permittedCategories.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-2xl max-w-md mx-auto text-center">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No Reports Authorized</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          You do not have permissions assigned for any report categories.
        </p>
      </div>
    );
  }

  // Determine which filters are relevant to the selected report
  const isDateRelevant = !["low-stock", "out-of-stock"].includes(selectedReport);
  const isSearchRelevant = ![
    "sales-summary",
    "sales-by-category",
    "sales-by-cashier",
    "sales-by-payment-method",
    "purchase-summary",
    "purchase-by-supplier",
    "receiving-by-supplier",
    "revenue",
    "payment",
    "tax",
    "refund",
    "discount",
    "purchase-expense",
    "cashier-sales",
    "payment-summary",
    "cash-collection",
  ].includes(selectedReport);
  const isCategoryFilterRelevant = ["sales-by-product", "stock-summary", "low-stock", "out-of-stock"].includes(selectedReport);
  const isSupplierFilterRelevant = [
    "sales-discount",
    "purchase-orders",
    "outstanding-purchase-orders",
    "goods-receipt",
    "receiving-discrepancy",
    "pending-receiving",
    "partial-receiving",
  ].includes(selectedReport);
  const isCashierFilterRelevant = ["sales-transactions"].includes(selectedReport);
  const isPaymentMethodFilterRelevant = ["sales-transactions"].includes(selectedReport);
  const isStatusFilterRelevant = ["sales-transactions", "purchase-orders", "goods-receipt", "stock-summary"].includes(selectedReport);

  return (
    <div className="space-y-6">
      {/* Header & Category Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Reports & Analytics
          </h1>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
            Operational, financial, and compliance reporting
          </p>
        </div>

        {canExport && (
          <button
            onClick={handleExportCSV}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors self-start cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </button>
        )}
      </div>

      {/* Category Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto pb-2">
          {permittedCategories.map((cat) => {
            const isSelected = cat.id === selectedCategory;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className={`px-3.5 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Sub-report buttons in active category */}
      {currentCategoryMeta && (
        <div className="flex flex-wrap gap-2 pt-1">
          {currentCategoryMeta.reports.map((rep) => {
            const isRepSelected = rep.id === selectedReport;
            return (
              <button
                key={rep.id}
                onClick={() => {
                  setSelectedReport(rep.id);
                  setPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  isRepSelected
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              >
                {rep.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Relevant Filters Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {isDateRelevant && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Date From</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(1);
                  }}
                  className="w-full text-xs px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Date To</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPage(1);
                  }}
                  className="w-full text-xs px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            </>
          )}

          {isSearchRelevant && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Search</label>
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full text-xs px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
          )}

          {isCategoryFilterRelevant && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Category</label>
              <select
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setPage(1);
                }}
                className="w-full text-xs px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="ALL">All Categories</option>
                {filterOptions.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {isSupplierFilterRelevant && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Supplier</label>
              <select
                value={supplierId}
                onChange={(e) => {
                  setSupplierId(e.target.value);
                  setPage(1);
                }}
                className="w-full text-xs px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="ALL">All Suppliers</option>
                {filterOptions.suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          {isCashierFilterRelevant && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Cashier</label>
              <select
                value={cashierId}
                onChange={(e) => {
                  setCashierId(e.target.value);
                  setPage(1);
                }}
                className="w-full text-xs px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="ALL">All Cashiers</option>
                {filterOptions.cashiers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {isPaymentMethodFilterRelevant && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => {
                  setPaymentMethod(e.target.value);
                  setPage(1);
                }}
                className="w-full text-xs px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="ALL">All Payment Methods</option>
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="QRIS">QRIS</option>
              </select>
            </div>
          )}

          {isStatusFilterRelevant && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full text-xs px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                {selectedReport === "stock-summary" ? (
                  <>
                    <option value="IN_STOCK">In Stock</option>
                    <option value="LOW_STOCK">Low Stock</option>
                    <option value="OUT_OF_STOCK">Out of Stock</option>
                  </>
                ) : selectedReport === "purchase-orders" ? (
                  <>
                    <option value="DRAFT">Draft</option>
                    <option value="SUBMITTED">Submitted</option>
                    <option value="APPROVED">Approved</option>
                    <option value="PARTIALLY_RECEIVED">Partially Received</option>
                    <option value="RECEIVED">Received</option>
                    <option value="CANCELLED">Cancelled</option>
                  </>
                ) : (
                  <>
                    <option value="COMPLETED">Completed</option>
                    <option value="PARTIAL_REFUNDED">Partial Refunded</option>
                    <option value="REFUNDED">Refunded</option>
                  </>
                )}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Report Data Rendering */}
      {loading ? (
        <div className="py-20 text-center text-slate-500">
          <div className="inline-block animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mb-3"></div>
          <p className="text-sm font-medium">Loading report metrics...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-xl text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      ) : !reportData ? (
        <div className="py-12 text-center text-slate-400">Select a report to view details</div>
      ) : (
        renderReportContent(selectedReport, reportData, page, pageSize, setPage, setPageSize)
      )}
    </div>
  );
}

function renderReportContent(
  reportId: string,
  data: any,
  page: number,
  pageSize: number,
  setPage: (p: number) => void,
  setPageSize: (s: number) => void
) {
  // 1. KPI / Summary Cards (for single-object summary reports)
  if (data && !data.items && typeof data === "object") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(data).map(([key, val]) => (
          <div
            key={key}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs"
          >
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              {formatLabel(key)}
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              {formatMetricValue(key, val)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // 2. Tabular reports with items array
  const items = data.items || [];
  const total = data.total ?? items.length;

  if (items.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center text-slate-500 dark:text-slate-400">
        No records found matching the applied filters.
      </div>
    );
  }

  // Extract columns dynamically from the first record
  const sample = items[0];
  const columns = Object.keys(sample).filter((col) => col !== "id");

  return (
    <div className="space-y-4">
      {/* Metric totals if returned along with items */}
      {(data.totalValue !== undefined || data.totalUnits !== undefined) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
          {data.totalUnits !== undefined && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Total Inventory Units</span>
              <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{data.totalUnits.toLocaleString()}</p>
            </div>
          )}
          {data.totalValue !== undefined && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Total Valuation</span>
              <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{formatRupiah(data.totalValue)}</p>
            </div>
          )}
        </div>
      )}

      <div className="overflow-x-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
        <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
            <tr>
              {columns.map((col) => (
                <th key={col} className="px-4 py-3 whitespace-nowrap">
                  {formatLabel(col)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((row: any, idx: number) => (
              <tr key={row.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                {columns.map((col) => (
                  <td key={col} className="px-4 py-3 whitespace-nowrap">
                    {renderCell(col, row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.total !== undefined && (
        <TablePagination
          currentPage={page}
          pageSize={pageSize}
          totalItems={total}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}
    </div>
  );
}

function formatLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

function formatMetricValue(key: string, val: any): string {
  if (typeof val === "number") {
    if (
      key.toLowerCase().includes("sales") ||
      key.toLowerCase().includes("amount") ||
      key.toLowerCase().includes("revenue") ||
      key.toLowerCase().includes("tax") ||
      key.toLowerCase().includes("spend") ||
      key.toLowerCase().includes("discount") ||
      key.toLowerCase().includes("collected") ||
      key.toLowerCase().includes("value")
    ) {
      return formatRupiah(val);
    }
    return val.toLocaleString();
  }
  return String(val);
}

function renderCell(key: string, val: any) {
  if (val === null || val === undefined) return "-";

  if (key.toLowerCase().includes("date")) {
    try {
      const d = new Date(val);
      if (!isNaN(d.getTime())) return d.toLocaleString();
    } catch {
      return String(val);
    }
  }

  if (
    typeof val === "number" &&
    (key.toLowerCase().includes("price") ||
      key.toLowerCase().includes("amount") ||
      key.toLowerCase().includes("revenue") ||
      key.toLowerCase().includes("spend") ||
      key.toLowerCase().includes("value") ||
      key.toLowerCase().includes("discount") ||
      key.toLowerCase().includes("tax"))
  ) {
    return formatRupiah(val);
  }

  if (key === "status" || key === "stockStatus") {
    const isSuccess = ["COMPLETED", "IN_STOCK", "RECEIVED", "CONFIRMED", "ACTIVE"].includes(val);
    const isWarning = ["LOW_STOCK", "SUBMITTED", "PARTIALLY_RECEIVED", "PARTIAL_REFUNDED", "DRAFT"].includes(val);
    const isDanger = ["OUT_OF_STOCK", "CANCELLED", "REFUNDED", "INACTIVE", "VOID"].includes(val);

    const badgeColor = isSuccess
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
      : isWarning
      ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
      : isDanger
      ? "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-400"
      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";

    return (
      <span className={`inline-block px-2 py-0.5 text-[11px] font-semibold rounded-md ${badgeColor}`}>
        {val}
      </span>
    );
  }

  return String(val);
}
