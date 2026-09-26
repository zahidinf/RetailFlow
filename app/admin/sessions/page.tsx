import { getSessionWithPermissions, requirePasswordChanged } from "@/lib/auth";
import { PermissionProvider } from "@/app/components/PermissionProvider";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { redirect } from "next/navigation";
import { isUserSuperAdmin } from "@/lib/super-admin-validator";
import { getSessionSettings } from "@/lib/session-settings";
import SessionSettingsForm from "./components/SessionSettingsForm";

export const metadata = {
  title: "Session Management",
};

export default async function SessionManagementPage() {
  await requirePasswordChanged();
  const session = await getSessionWithPermissions();

  if (!session) {
    redirect("/login?expired=1");
  }

  // Authorization: Only Super Admin can access Session Management
  const isSuperAdmin = await isUserSuperAdmin(session.id);
  if (!isSuperAdmin) {
    redirect("/");
  }

  const initialSettings = await getSessionSettings();

  return (
    <PermissionProvider
      permissions={session.permissions}
      isSuperAdmin={session.isSuperAdmin}
    >
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors">
        <Navbar userName={session.name} userRole={session.roleName} />

        {/* Main Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Session Management
            </h1>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
              Configure session enforcement limits and inactivity timeout policies
            </p>
          </div>

          <SessionSettingsForm initialSettings={initialSettings} />
        </main>
        <Footer />
      </div>
    </PermissionProvider>
  );
}
