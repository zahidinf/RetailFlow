"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/auth-guards";
import { UserStatus } from "@prisma/client";
import bcrypt from "bcrypt";
import { revalidatePath } from "next/cache";
import {
  validateRoleChange,
  validateStatusChange,
  validateDelete,
  isUserSuperAdmin,
  isSuperAdminRole,
} from "@/lib/super-admin-validator";
import { isValidEmail } from "@/lib/validators";

export async function createUser(formData: FormData) {
  const session = await requirePermission("USER_CREATE");

  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const roleId = formData.get("roleId") as string;

  // Validation
  if (!firstName || !lastName || !email || !password || !roleId) {
    return { error: "First name, last name, email, password, and role are required" };
  }

  // Email format validation
  if (!isValidEmail(email)) {
    return { error: "Please enter a valid email address" };
  }

  // Non-SUPER_ADMIN cannot create user with SUPER_ADMIN role
  const callerIsSuperAdmin = await isUserSuperAdmin(session.id);
  const targetRoleIsSuperAdmin = await isSuperAdminRole(roleId);
  if (targetRoleIsSuperAdmin && !callerIsSuperAdmin) {
    return { error: "Only Super Admin can create users with Super Admin role" };
  }

  // Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return { error: "Email already exists" };
  }

  // Validate role change would maintain SUPER_ADMIN constraint
  // (For new user, always valid as they are initially inactive until created)
  // No validation needed here

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user - ALWAYS ACTIVE for new users
  const user = await prisma.user.create({
    data: {
      firstName,
      lastName,
      email,
      password: hashedPassword,
      status: "ACTIVE", // Force ACTIVE
      inactiveFrom: null,
      inactiveUntil: null,
    },
  });

  // Assign role
  await prisma.userRole.create({
    data: {
      userId: user.id,
      roleId,
    },
  });

  revalidatePath("/admin/users");
  return { success: true };
}

export async function updateUser(userId: string, formData: FormData) {
  const session = await requirePermission("USER_UPDATE");

  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const email = formData.get("email") as string;
  const roleId = formData.get("roleId") as string;
  const status = (formData.get("status") as UserStatus) || "ACTIVE";
  const inactiveType = formData.get("inactiveType") as string;
  const inactiveFrom = formData.get("inactiveFrom") as string;
  const inactiveUntil = formData.get("inactiveUntil") as string;

  // Validation
  if (!firstName || !lastName || !email || !roleId) {
    return { error: "First name, last name, email, and role are required" };
  }

  // Email format validation
  if (!isValidEmail(email)) {
    return { error: "Please enter a valid email address" };
  }

  // Check caller's SUPER_ADMIN status
  const callerIsSuperAdmin = await isUserSuperAdmin(session.id);

  // Check if target user is SUPER_ADMIN
  const targetIsSuperAdmin = await isUserSuperAdmin(userId);
  if (targetIsSuperAdmin && !callerIsSuperAdmin) {
    return { error: "Only Super Admin can modify users with Super Admin role" };
  }

  // Non-SUPER_ADMIN cannot assign SUPER_ADMIN role
  const targetRoleIsSuperAdmin = await isSuperAdminRole(roleId);
  if (targetRoleIsSuperAdmin && !callerIsSuperAdmin) {
    return { error: "Only Super Admin can assign Super Admin role" };
  }

  // Prevent self-deactivation
  if (session.id === userId && status === "INACTIVE") {
    return { error: "You cannot deactivate your own account" };
  }

  if (status === "INACTIVE") {
    if (!inactiveFrom) {
      return { error: "Inactive from date is required for inactive users" };
    }
    if (inactiveType === "temporary" && !inactiveUntil) {
      return { error: "Inactive until date is required for temporary inactive users" };
    }
    if (inactiveType === "temporary") {
      const fromDate = new Date(inactiveFrom);
      const untilDate = new Date(inactiveUntil);
      if (untilDate <= fromDate) {
        return { error: "Inactive until must be after inactive from" };
      }
    }
  }

  // Check if email already exists (excluding current user)
  const existingUser = await prisma.user.findFirst({
    where: {
      email,
      NOT: { id: userId },
    },
  });

  if (existingUser) {
    return { error: "Email already exists" };
  }

  // Get current user data for comparison
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userRoles: {
        include: { role: true },
      },
    },
  });

  if (!currentUser) {
    return { error: "User not found" };
  }

  const currentRoleName = currentUser.userRoles[0]?.role.name;
  const newRole = await prisma.role.findUnique({ where: { id: roleId } });
  const newRoleName = newRole?.name;

  const isRoleChanging = currentRoleName !== newRoleName;
  const isStatusChanging = currentUser.status !== status;

  // Validate SUPER_ADMIN constraint for role change
  if (isRoleChanging && newRoleName !== "SUPER_ADMIN") {
    const validation = await validateRoleChange(userId, roleId);
    if (!validation.valid) {
      return { error: validation.error };
    }
  }

  // Validate SUPER_ADMIN constraint for status change
  if (isStatusChanging && status === "INACTIVE") {
    const validation = await validateStatusChange(userId, status);
    if (!validation.valid) {
      return { error: validation.error };
    }
  }

  // Use transaction for atomic update
  await prisma.$transaction(async (tx) => {
    // Update user
    await tx.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
        email,
        status,
        inactiveFrom: status === "INACTIVE" && inactiveFrom ? new Date(inactiveFrom) : null,
        inactiveUntil:
          status === "INACTIVE" && inactiveType === "temporary" && inactiveUntil
            ? new Date(inactiveUntil)
            : null,
      },
    });

    // Update role (remove old, add new)
    await tx.userRole.deleteMany({
      where: { userId },
    });

    await tx.userRole.create({
      data: {
        userId,
        roleId,
      },
    });
  });

  revalidatePath("/admin/users");
  return { success: true };
}

export async function deleteUser(userId: string) {
  const session = await requirePermission("USER_DELETE");

  // Prevent self-deletion
  if (session.id === userId) {
    return { error: "You cannot delete your own account" };
  }

  // Check if target user is SUPER_ADMIN
  const targetIsSuperAdmin = await isUserSuperAdmin(userId);
  if (targetIsSuperAdmin) {
    // Only SUPER_ADMIN can delete SUPER_ADMIN
    const callerIsSuperAdmin = await isUserSuperAdmin(session.id);
    if (!callerIsSuperAdmin) {
      return { error: "Only Super Admin can delete users with Super Admin role" };
    }
  }

  // Validate SUPER_ADMIN constraint (must keep at least 1 active)
  const validation = await validateDelete(userId);
  if (!validation.valid) {
    return { error: validation.error };
  }

  // Delete user (cascade will delete userRoles)
  await prisma.user.delete({
    where: { id: userId },
  });

  revalidatePath("/admin/users");
  return { success: true };
}

export async function toggleUserStatus(userId: string, newStatus: UserStatus) {
  const session = await requirePermission("USER_UPDATE");

  // Prevent self-deactivation
  if (session.id === userId && newStatus === "INACTIVE") {
    return { error: "You cannot deactivate your own account" };
  }

  // Non-SUPER_ADMIN cannot change status of SUPER_ADMIN users
  const targetIsSuperAdmin = await isUserSuperAdmin(userId);
  if (targetIsSuperAdmin) {
    const callerIsSuperAdmin = await isUserSuperAdmin(session.id);
    if (!callerIsSuperAdmin) {
      return { error: "Only Super Admin can modify users with Super Admin role" };
    }
  }

  // Validate SUPER_ADMIN constraint for deactivation
  if (newStatus === "INACTIVE") {
    const validation = await validateStatusChange(userId, newStatus);
    if (!validation.valid) {
      return { error: validation.error };
    }
  }

  if (newStatus === "ACTIVE") {
    // Reset inactive fields
    await prisma.user.update({
      where: { id: userId },
      data: {
        status: "ACTIVE",
        inactiveFrom: null,
        inactiveUntil: null,
      },
    });
  } else {
    // Set to permanent inactive
    await prisma.user.update({
      where: { id: userId },
      data: {
        status: "INACTIVE",
        inactiveFrom: new Date(),
        inactiveUntil: null,
      },
    });
  }

  revalidatePath("/admin/users");
  return { success: true };
}

export async function getRoles() {
  const session = await getSession();
  if (!session) {
    return [];
  }

  const roles = await prisma.role.findMany({
    orderBy: { name: "asc" },
  });

  return roles;
}
