import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { isUserSuperAdmin } from "@/lib/super-admin-validator";

export class UnauthorizedError extends Error {
  constructor(message: string = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message: string = "Forbidden: Insufficient permissions") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/**
 * Wrapper for server actions that require authentication
 */
export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    throw new UnauthorizedError("You must be logged in");
  }
  return session;
}

/**
 * Wrapper for server actions that require Super Admin role
 */
export async function requireSuperAdmin() {
  const session = await requireAuth();
  const isSuper = await isUserSuperAdmin(session.id);
  if (!isSuper) {
    throw new ForbiddenError("Super Admin access required");
  }
  return session;
}

/**
 * Wrapper for server actions that require specific permission
 */
export async function requirePermission(permission: string) {
  const session = await requireAuth();
  const has = await hasPermission(session.id, permission);
  
  if (!has) {
    throw new ForbiddenError(`Missing required permission: ${permission}`);
  }
  
  return session;
}

/**
 * Check if current user has permission (non-throwing version)
 */
export async function checkPermission(permission: string): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;
  
  return await hasPermission(session.id, permission);
}
