"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ParameterSettingData, PARAM_REFUND_VALIDITY_PERIOD } from "@/lib/parameter-settings";
import EditParameterDialog from "./EditParameterDialog";
import DeleteParameterDialog from "./DeleteParameterDialog";
import TablePagination from "@/app/components/TablePagination";
import { usePermissions } from "@/app/components/PermissionProvider";

interface Props {
  parameters: ParameterSettingData[];
  canUpdate: boolean;
  canDelete: boolean;
  currentSearch?: string;
  currentStatus?: string;
}

export default function ParameterTable({
  parameters,
  canUpdate,
  canDelete,
  currentSearch = "",
  currentStatus = "",
}: Props) {
  const router = useRouter();
  const [search, setSearch] = useState(currentSearch);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [currentSearch, currentStatus, parameters.length]);

  const applyFilters = (newSearch: string, newStatus: string) => {
    setCurrentPage(1);
    const params = new URLSearchParams();
    if (newSearch.trim()) params.set("search", newSearch.trim());
    if (newStatus) params.set("status", newStatus);
    router.push(`/admin/parameter-settings${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    applyFilters(value, currentStatus);
  };

  const handleStatusFilter = (value: string) => {
    applyFilters(search, value);
  };

  const paginatedParameters = parameters.slice(
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
            placeholder="Search by code, name, or description..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
          />
        </div>

        <select
          value={currentStatus}
          onChange={(e) => handleStatusFilter(e.target.value)}
          className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors cursor-pointer"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      {/* Table Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Parameter Code
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Parameter Name
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Parameter Value
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Unit
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                {(canUpdate || canDelete) && (
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {paginatedParameters.length === 0 ? (
                <tr>
                  <td
                    colSpan={canUpdate || canDelete ? 7 : 6}
                    className="px-6 py-12 text-center text-slate-500 dark:text-slate-400 text-sm"
                  >
                    No parameter settings found
                  </td>
                </tr>
              ) : (
                paginatedParameters.map((param) => (
                  <tr key={param.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-xs font-semibold px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                        {param.code}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900 dark:text-white">
                      {param.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono font-semibold text-slate-900 dark:text-white">
                      {param.value}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-600 dark:text-slate-400 text-xs">
                      {param.unit || "-"}
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-xs max-w-xs truncate">
                      {param.description || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold w-fit border ${
                          param.status === "ACTIVE"
                            ? "bg-green-50 dark:bg-green-950/60 text-green-700 dark:text-green-300 border-green-200/60 dark:border-green-800/60"
                            : "bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200/60 dark:border-red-800/60"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            param.status === "ACTIVE" ? "bg-green-600 dark:bg-green-400" : "bg-red-600 dark:bg-red-400"
                          }`}
                        />
                        {param.status}
                      </span>
                    </td>
                    {(canUpdate || canDelete) && (
                      <td className="px-6 py-4 whitespace-nowrap text-right space-x-3">
                        {canUpdate && <EditParameterDialog parameter={param} onSuccess={() => router.refresh()} />}
                        {canDelete && param.code !== PARAM_REFUND_VALIDITY_PERIOD && (
                          <DeleteParameterDialog parameter={param} onSuccess={() => router.refresh()} />
                        )}
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
        totalItems={parameters.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setCurrentPage(1);
        }}
      />
    </div>
  );
}
