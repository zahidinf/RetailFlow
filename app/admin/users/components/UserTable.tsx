"use client";

import { useState, useEffect } from "react";
import { UserStatus } from "@prisma/client";
import EditUserDialog from "./EditUserDialog";
import DeleteUserDialog from "./DeleteUserDialog";
import TablePagination from "@/app/components/TablePagination";

interface Role {
  id: string;
  name: string;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: UserStatus;
  inactiveFrom: Date | null;
  inactiveUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
  effectiveStatus: UserStatus;
  inactiveInfo: string | null;
  userRoles: Array<{
    id: string;
    role: Role;
  }>;
}

interface Props {
  users: User[];
  currentUserId: string;
  roles: Role[];
  canUpdate: boolean;
  canDelete: boolean;
  callerIsSuperAdmin: boolean;
}

export default function UserTable({
  users,
  currentUserId,
  roles,
  canUpdate,
  canDelete,
  callerIsSuperAdmin,
}: Props) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [users.length]);

  const paginatedUsers = users.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 font-semibold">
              <th className="px-6 py-3.5">Name</th>
              <th className="px-6 py-3.5">Email</th>
              <th className="px-6 py-3.5">Role</th>
              <th className="px-6 py-3.5">Status</th>
              <th className="px-6 py-3.5">Created At</th>
              <th className="px-6 py-3.5">Updated At</th>
              <th className="px-6 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm text-slate-900 dark:text-white">
            {users.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                  No users found
                </td>
              </tr>
            ) : (
              paginatedUsers.map((user) => {
                const isCurrentUser = user.id === currentUserId;
                const displayStatus = user.effectiveStatus;
                const isActuallyInactive = user.status === "INACTIVE";
                const targetIsSuperAdmin = user.userRoles.some((ur) => ur.role.name === "SUPER_ADMIN");
                const canEditThisUser = canUpdate && (!targetIsSuperAdmin || callerIsSuperAdmin);
                const canDeleteThisUser = canDelete && (!targetIsSuperAdmin || callerIsSuperAdmin);

                return (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-blue-600 text-white rounded-full flex items-center justify-center shrink-0 shadow-xs">
                          <span className="font-semibold text-xs">
                            {user.firstName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {user.firstName} {user.lastName}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1.5">
                        {user.userRoles.map((ur) => (
                          <span
                            key={ur.id}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60"
                          >
                            {ur.role.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold w-fit border ${
                            displayStatus === "ACTIVE"
                              ? "bg-green-50 dark:bg-green-950/60 text-green-700 dark:text-green-300 border-green-200/60 dark:border-green-800/60"
                              : "bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200/60 dark:border-red-800/60"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              displayStatus === "ACTIVE" ? "bg-green-600 dark:bg-green-400" : "bg-red-600 dark:bg-red-400"
                            }`}
                          />
                          {displayStatus}
                        </span>
                        {user.inactiveInfo && (
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {user.inactiveInfo}
                          </span>
                        )}
                        {isActuallyInactive && displayStatus === "ACTIVE" && (
                          <span className="text-xs text-slate-400 dark:text-slate-500 italic">
                            (Reactivated)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {new Date(user.createdAt).toLocaleDateString("id-ID")}
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {new Date(user.updatedAt).toLocaleDateString("id-ID")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-3">
                        {canEditThisUser && (
                          <EditUserDialog
                            user={user}
                            roles={roles}
                            isCurrentUser={isCurrentUser}
                            callerIsSuperAdmin={callerIsSuperAdmin}
                          />
                        )}
                        {canDeleteThisUser && (
                          <DeleteUserDialog
                            userId={user.id}
                            userName={`${user.firstName} ${user.lastName}`}
                            isCurrentUser={isCurrentUser}
                          />
                        )}
                      </div>
                    </td>
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
      totalItems={users.length}
      onPageChange={setCurrentPage}
      onPageSizeChange={(newSize) => {
        setPageSize(newSize);
        setCurrentPage(1);
      }}
    />
  </div>
  );
}
