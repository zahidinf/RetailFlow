"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { revalidatePath } from "next/cache";
import { clearAllPermissionCaches } from "@/lib/rbac";

export async function getRoles() {
  await requirePermission("ROLE_MANAGE");

  const roles = await prisma.role.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          userRoles: true,
        },
      },
      rolePermissions: {
        include: {
          permission: true,
        },
      },
    },
  });

  return roles;
}

export async function getPermissions() {
  await requirePermission("ROLE_MANAGE");

  const permissions = await prisma.permission.findMany({
    orderBy: { name: "asc" },
  });

  return permissions;
}

export async function createRole(formData: FormData) {
  await requirePermission("ROLE_MANAGE");

  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim();
  const permissionIds = formData.get("permissionIds") as string; // JSON array

  // Validation
  if (!name) {
    return { error: "Role name is required" };
  }

  if (name.length < 2) {
    return { error: "Role name must be at least 2 characters" };
  }

  // Validate permissions
  let parsedPermissionIds: string[] = [];
  if (permissionIds) {
    try {
      parsedPermissionIds = JSON.parse(permissionIds);
    } catch {
      return { error: "Invalid permission data" };
    }
  }

  if (parsedPermissionIds.length === 0) {
    return { error: "At least one permission must be assigned to the role" };
  }

  // Check duplicate (case-insensitive)
  const existing = await prisma.role.findFirst({
    where: {
      name: {
        equals: name,
        mode: "insensitive",
      },
    },
  });

  if (existing) {
    return { error: "A role with this name already exists" };
  }

  // Create role with permissions in transaction
  await prisma.$transaction(async (tx) => {
    const role = await tx.role.create({
      data: {
        name,
        description: description || undefined,
      },
    });

    // Create role permissions
    for (const permissionId of parsedPermissionIds) {
      await tx.rolePermission.create({
        data: {
          roleId: role.id,
          permissionId,
        },
      });
    }
  });

  revalidatePath("/admin/roles");
  clearAllPermissionCaches();
  return { success: true };
}

export async function updateRole(roleId: string, formData: FormData) {
  await requirePermission("ROLE_MANAGE");

  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim();
  const permissionIds = formData.get("permissionIds") as string; // JSON array

  // Validation
  if (!name) {
    return { error: "Role name is required" };
  }

  if (name.length < 2) {
    return { error: "Role name must be at least 2 characters" };
  }

  // Validate permissions
  let parsedPermissionIds: string[] = [];
  if (permissionIds) {
    try {
      parsedPermissionIds = JSON.parse(permissionIds);
    } catch {
      return { error: "Invalid permission data" };
    }
  }

  if (parsedPermissionIds.length === 0) {
    return { error: "At least one permission must be assigned to the role" };
  }

  // Find existing role
  const existingRole = await prisma.role.findUnique({
    where: { id: roleId },
  });

  if (!existingRole) {
    return { error: "Role not found" };
  }

  // Check duplicate name (exclude current role)
  if (name !== existingRole.name) {
    const duplicate = await prisma.role.findFirst({
      where: {
        name: {
          equals: name,
          mode: "insensitive",
        },
        id: {
          not: roleId,
        },
      },
    });

    if (duplicate) {
      return { error: "A role with this name already exists" };
    }
  }

  // Update role and permissions in transaction
  await prisma.$transaction(async (tx) => {
    // Update role
    await tx.role.update({
      where: { id: roleId },
      data: {
        name,
        description: description === "" ? null : (description || null),
      },
    });

    // Delete existing permissions
    await tx.rolePermission.deleteMany({
      where: { roleId },
    });

    // Create new permissions
    for (const permissionId of parsedPermissionIds) {
      await tx.rolePermission.create({
        data: {
          roleId,
          permissionId,
        },
      });
    }
  });

  revalidatePath("/admin/roles");
  clearAllPermissionCaches();
  return { success: true };
}

export async function deleteRole(roleId: string) {
  await requirePermission("ROLE_MANAGE");

  // Find role
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    include: {
      _count: {
        select: {
          userRoles: true,
        },
      },
    },
  });

  if (!role) {
    return { error: "Role not found" };
  }

  // Check if role is SUPER_ADMIN (protected)
  if (role.name === "SUPER_ADMIN") {
    return { error: "The SUPER_ADMIN role cannot be deleted" };
  }

  // Check if role has assigned users
  if (role._count.userRoles > 0) {
    return {
      error: `This role cannot be deleted because it is assigned to ${role._count.userRoles} user${role._count.userRoles === 1 ? "" : "s"}.`,
    };
  }

  // Delete role
  await prisma.role.delete({
    where: { id: roleId },
  });

  revalidatePath("/admin/roles");
  clearAllPermissionCaches();
  return { success: true };
}
