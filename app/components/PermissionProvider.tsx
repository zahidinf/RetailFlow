"use client";

import { createContext, useContext, ReactNode } from "react";

interface PermissionContextType {
  permissions: string[];
  isSuperAdmin: boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
}

const PermissionContext = createContext<PermissionContextType | null>(null);

export function PermissionProvider({
  children,
  permissions,
  isSuperAdmin = false,
}: {
  children: ReactNode;
  permissions: string[];
  isSuperAdmin?: boolean;
}) {
  const hasPermission = (permission: string) => {
    const trimmed = permission.trim();
    return (
      permissions.includes(trimmed) ||
      permissions.includes(trimmed.toUpperCase()) ||
      permissions.includes(trimmed.toLowerCase())
    );
  };

  const hasAnyPermission = (perms: string[]) => {
    return perms.some((p) => hasPermission(p));
  };

  const hasAllPermissions = (perms: string[]) => {
    return perms.every((p) => hasPermission(p));
  };

  return (
    <PermissionContext.Provider
      value={{
        permissions,
        isSuperAdmin,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error("usePermissions must be used within PermissionProvider");
  }
  return context;
}

export function Can({
  permission,
  children,
  fallback,
}: {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { hasPermission } = usePermissions();

  if (hasPermission(permission)) {
    return <>{children}</>;
  }

  return fallback ? <>{fallback}</> : null;
}
