"use client";

import { useState, useEffect } from "react";
import EditRoleDialog from "./EditRoleDialog";
import DeleteRoleDialog from "./DeleteRoleDialog";
import TablePagination from "@/app/components/TablePagination";

interface Permission {
  id: string;
  name: string;
  description: string | null;
}

interface Role {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  _count: {
    userRoles: number;
  };
  rolePermissions: {
    permission: Permission;
  }[];
}

interface RoleTableProps {
  roles: Role[];
  permissions: Permission[];
}

export default function RoleTable({ roles, permissions }: RoleTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [roles.length]);

  const paginatedRoles = roles.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  if (roles.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 text-center py-12 transition-colors">
        <p className="text-slate-500 dark:text-slate-400 text-sm">No roles found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 font-semibold">
                <th className="px-6 py-3.5">Role Name</th>
                <th className="px-6 py-3.5">Description</th>
                <th className="px-6 py-3.5">Assigned Users</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm text-slate-900 dark:text-white">
              {paginatedRoles.map((role) => (
                <tr key={role.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-semibold text-slate-900 dark:text-white">{role.name}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300 max-w-sm truncate">
                    {role.description || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
                      {role._count.userRoles} {role._count.userRoles === 1 ? "user" : "users"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-3">
                      <EditRoleDialog role={role} permissions={permissions} />
                      <DeleteRoleDialog role={role} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <TablePagination
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={roles.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setCurrentPage(1);
        }}
      />
    </div>
  );
}
