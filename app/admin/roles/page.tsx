import { getRoles, getPermissions } from "./actions";
import { getSessionWithPermissions, requirePasswordChanged } from "@/lib/auth";
import { PermissionProvider } from "@/app/components/PermissionProvider";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { redirect } from "next/navigation";
import AddRoleDialog from "./components/AddRoleDialog";
import RoleTable from "./components/RoleTable";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Role Management",
};

export default async function RolesPage() {
  await requirePasswordChanged();
  const session = await getSessionWithPermissions();
  
  if (!session) {
    redirect("/login?expired=1");
  }

  if (!session.permissions.includes("ROLE_MANAGE")) {
    redirect("/");
  }

  const [roles, permissions] = await Promise.all([
    getRoles(),
    getPermissions(),
  ]);

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
                  Role Management
                </h1>
                <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
                  Manage application roles and access privileges
                </p>
              </div>
              <AddRoleDialog permissions={permissions} />
            </div>
          </div>

          <RoleTable roles={roles} permissions={permissions} />
        </main>
        <Footer />
      </div>
    </PermissionProvider>
  );
}
