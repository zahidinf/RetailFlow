import { prisma } from "@/lib/prisma";
import { getEffectiveUserStatus } from "@/lib/user-status";

/**
 * Check if a user has SUPER_ADMIN role
 */
export async function isUserSuperAdmin(userId: string): Promise<boolean> {
  const count = await prisma.userRole.count({
    where: {
      userId,
      role: {
        name: "SUPER_ADMIN",
      },
    },
  });
  return count > 0;
}

/**
 * Check if a role ID corresponds to SUPER_ADMIN
 */
export async function isSuperAdminRole(roleId: string): Promise<boolean> {
  const role = await prisma.role.findUnique({
    where: { id: roleId },
  });
  return role?.name === "SUPER_ADMIN";
}

/**
 * Count active SUPER_ADMIN users
 * Considers effective status (accounts for temporary inactive periods)
 */
export async function countActiveSuperAdmins(): Promise<number> {
  const users = await prisma.user.findMany({
    where: {
      userRoles: {
        some: {
          role: {
            name: "SUPER_ADMIN",
          },
        },
      },
    },
    include: {
      userRoles: {
        include: {
          role: true,
        },
      },
    },
  });

  return users.filter((user) => {
    const effectiveStatus = getEffectiveUserStatus(user);
    return effectiveStatus === "ACTIVE";
  }).length;
}

/**
 * Validate that operation won't result in 0 active SUPER_ADMIN users
 * Used in transaction context for consistency
 */
export async function validateMinimumActiveSuperAdmin(): Promise<void> {
  const count = await countActiveSuperAdmins();
  if (count < 1) {
    throw new Error("At least one active Super Admin must remain in the system.");
  }
}

/**
 * Check if role change would violate SUPER_ADMIN constraint
 */
export async function validateRoleChange(
  userId: string,
  newRoleId: string
): Promise<{ valid: boolean; error?: string }> {
  // Get new role
  const newRole = await prisma.role.findUnique({
    where: { id: newRoleId },
  });

  if (!newRole) {
    return { valid: false, error: "Role not found" };
  }

  // If changing TO SUPER_ADMIN, always allowed
  if (newRole.name === "SUPER_ADMIN") {
    return { valid: true };
  }

  // If changing FROM SUPER_ADMIN, check if would violate constraint
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userRoles: {
        include: { role: true },
      },
    },
  });

  if (!user) {
    return { valid: false, error: "User not found" };
  }

  const isSuperAdmin = user.userRoles.some((ur) => ur.role.name === "SUPER_ADMIN");
  if (!isSuperAdmin) {
    // Not a SUPER_ADMIN, so no constraint
    return { valid: true };
  }

  const effectiveStatus = getEffectiveUserStatus(user);
  if (effectiveStatus !== "ACTIVE") {
    // Not active, so doesn't count, no constraint
    return { valid: true };
  }

  // Is active SUPER_ADMIN, check if would be only one
  const count = await countActiveSuperAdmins();
  if (count <= 1) {
    return {
      valid: false,
      error: "At least one active Super Admin must remain in the system.",
    };
  }

  return { valid: true };
}

/**
 * Check if status change would violate SUPER_ADMIN constraint
 */
export async function validateStatusChange(
  userId: string,
  newStatus: "ACTIVE" | "INACTIVE"
): Promise<{ valid: boolean; error?: string }> {
  if (newStatus === "ACTIVE") {
    // Changing TO ACTIVE always allowed
    return { valid: true };
  }

  // Changing TO INACTIVE, check constraint
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userRoles: {
        include: { role: true },
      },
    },
  });

  if (!user) {
    return { valid: false, error: "User not found" };
  }

  const isSuperAdmin = user.userRoles.some((ur) => ur.role.name === "SUPER_ADMIN");
  if (!isSuperAdmin) {
    return { valid: true };
  }

  const currentEffectiveStatus = getEffectiveUserStatus(user);
  if (currentEffectiveStatus !== "ACTIVE") {
    // Already inactive, no change to constraint
    return { valid: true };
  }

  // Is currently active SUPER_ADMIN, check if would be only one
  const count = await countActiveSuperAdmins();
  if (count <= 1) {
    return {
      valid: false,
      error: "At least one active Super Admin must remain in the system.",
    };
  }

  return { valid: true };
}

/**
 * Check if delete would violate SUPER_ADMIN constraint
 */
export async function validateDelete(
  userId: string
): Promise<{ valid: boolean; error?: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userRoles: {
        include: { role: true },
      },
    },
  });

  if (!user) {
    return { valid: false, error: "User not found" };
  }

  const isSuperAdmin = user.userRoles.some((ur) => ur.role.name === "SUPER_ADMIN");
  if (!isSuperAdmin) {
    return { valid: true };
  }

  const effectiveStatus = getEffectiveUserStatus(user);
  if (effectiveStatus !== "ACTIVE") {
    return { valid: true };
  }

  // Is active SUPER_ADMIN, check if would be only one
  const count = await countActiveSuperAdmins();
  if (count <= 1) {
    return {
      valid: false,
      error: "This user cannot be deleted because they are the last active Super Admin.",
    };
  }

  return { valid: true };
}
