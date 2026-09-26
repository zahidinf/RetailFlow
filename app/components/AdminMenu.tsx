"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePermissions } from "./PermissionProvider";

export default function AdminMenu() {
  const { hasPermission, isSuperAdmin } = usePermissions();
  const pathname = usePathname();

  const canViewUsers = hasPermission("USER_VIEW") || isSuperAdmin;
  const canManageRoles = hasPermission("ROLE_MANAGE") || isSuperAdmin;
  const canViewParameters = hasPermission("PARAMETER_SETTINGS_VIEW") || isSuperAdmin;
  const isAdmin = canViewUsers || canManageRoles || canViewParameters || isSuperAdmin;

  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isActive =
    pathname.startsWith("/admin/users") ||
    pathname.startsWith("/admin/roles") ||
    pathname.startsWith("/admin/sessions") ||
    pathname.startsWith("/admin/parameter-settings") ||
    pathname.startsWith("/administration/parameter-settings");

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  if (!isAdmin) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`text-sm font-medium transition-colors flex items-center gap-1.5 focus:outline-none ${
          isActive
            ? "text-blue-600 dark:text-blue-400 font-semibold"
            : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
        }`}
      >
        <span>Administration</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""} ${
            isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500"
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 py-1.5 z-50 transition-colors">
          {canViewUsers && (
            <Link
              href="/admin/users"
              className={`block px-4 py-2.5 text-sm transition-colors ${
                pathname === "/admin/users"
                  ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-medium"
                  : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
              }`}
              onClick={() => setIsOpen(false)}
            >
              <div className="flex items-center gap-2.5">
                <svg
                  className="w-4 h-4 text-slate-400 dark:text-slate-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"
                  />
                  <circle cx="9" cy="7" r="4" strokeWidth={2} />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
                  />
                </svg>
                <span>User Management</span>
              </div>
            </Link>
          )}
          {canManageRoles && (
            <Link
              href="/admin/roles"
              className={`block px-4 py-2.5 text-sm transition-colors ${
                pathname === "/admin/roles"
                  ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-medium"
                  : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
              }`}
              onClick={() => setIsOpen(false)}
            >
              <div className="flex items-center gap-2.5">
                <svg
                  className="w-4 h-4 text-slate-400 dark:text-slate-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4"
                  />
                </svg>
                <span>Role Management</span>
              </div>
            </Link>
          )}
          {canViewParameters && (
            <Link
              href="/admin/parameter-settings"
              className={`block px-4 py-2.5 text-sm transition-colors ${
                pathname === "/admin/parameter-settings" || pathname === "/administration/parameter-settings"
                  ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-medium"
                  : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
              }`}
              onClick={() => setIsOpen(false)}
            >
              <div className="flex items-center gap-2.5">
                <svg
                  className="w-4 h-4 text-slate-400 dark:text-slate-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span>Parameter Settings</span>
              </div>
            </Link>
          )}
          {isSuperAdmin && (
            <Link
              href="/admin/sessions"
              className={`block px-4 py-2.5 text-sm transition-colors ${
                pathname === "/admin/sessions"
                  ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-medium"
                  : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
              }`}
              onClick={() => setIsOpen(false)}
            >
              <div className="flex items-center gap-2.5">
                <svg
                  className="w-4 h-4 text-slate-400 dark:text-slate-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                <span>Session Policy</span>
              </div>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
