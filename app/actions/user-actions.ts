"use server";

import { requirePermission } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

export async function getUserList() {
  // Require USER_VIEW permission
  await requirePermission("USER_VIEW");

  const users = await prisma.user.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      createdAt: true,
      userRoles: {
        include: {
          role: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return users.map((user) => ({
    ...user,
    name: `${user.firstName} ${user.lastName}`,
    roles: user.userRoles.map((ur) => ur.role.name),
  }));
}

export async function createUser(_data: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}) {
  void _data;
  await requirePermission("USER_CREATE");

  // Implementation here
  throw new Error("Not implemented yet");
}

export async function updateUser(
  _userId: string,
  _data: { firstName?: string; lastName?: string; email?: string }
) {
  void _userId;
  void _data;
  await requirePermission("USER_UPDATE");

  // Implementation here
  throw new Error("Not implemented yet");
}

export async function deleteUser(_userId: string) {
  void _userId;
  await requirePermission("USER_DELETE");

  // Implementation here
  throw new Error("Not implemented yet");
}
