import { getSessionWithPermissions, requirePasswordChanged } from "@/lib/auth";
import { PermissionProvider } from "@/app/components/PermissionProvider";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getEffectiveUserStatus, formatInactivePeriod } from "@/lib/user-status";
import AddUserDialog from "./components/AddUserDialog";
import UserTable from "./components/UserTable";
import { isUserSuperAdmin } from "@/lib/super-admin-validator";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "User Management",
};

export default async function UsersPage() {
  await requirePasswordChanged();
  const session = await getSessionWithPermissions();

  if (!session) {
    redirect("/login?expired=1");
  }

  // Check permission
  if (!session.permissions.includes("USER_VIEW")) {
    redirect("/");
  }

  const callerIsSuperAdmin = await isUserSuperAdmin(session.id);

  const users = await prisma.user.findMany({
    include: {
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

  const roles = await prisma.role.findMany({
    orderBy: { name: "asc" },
  });

  // Calculate effective status for each user
  const usersWithEffectiveStatus = users.map((user) => {
    const effectiveStatus = getEffectiveUserStatus(user);
    const inactiveInfo = formatInactivePeriod(user);
    return {
      ...user,
      effectiveStatus,
      inactiveInfo,
    };
  });

  const canCreate = session.permissions.includes("USER_CREATE");
  const canUpdate = session.permissions.includes("USER_UPDATE");
  const canDelete = session.permissions.includes("USER_DELETE");

  return (
    <PermissionProvider permissions={session.permissions} isSuperAdmin={session.isSuperAdmin}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors">
        <Navbar userName={session.name} userRole={session.roleName} />

        {/* Main Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                  User Management
                </h1>
                <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
                  Manage application users and their access roles
                </p>
              </div>

              {canCreate && (
                <AddUserDialog roles={roles} callerIsSuperAdmin={callerIsSuperAdmin} />
              )}
            </div>
          </div>

          <UserTable
            users={usersWithEffectiveStatus}
            currentUserId={session.id}
            roles={roles}
            canUpdate={canUpdate}
            canDelete={canDelete}
            callerIsSuperAdmin={callerIsSuperAdmin}
          />
        </main>
        <Footer />
      </div>
    </PermissionProvider>
  );
}
