import { getSessionWithPermissions, requirePasswordChanged } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/rbac";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { PermissionProvider } from "@/app/components/PermissionProvider";
import ReportsDashboard from "./components/ReportsDashboard";

export const metadata = {
  title: "Reports & Analytics - RetailFlow",
};

export default async function ReportsPage() {
  await requirePasswordChanged();
  const session = await getSessionWithPermissions();

  if (!session) {
    redirect("/login?expired=1");
  }

  // Base permission check
  const canViewReports = await hasPermission(session.id, "REPORT_VIEW");
  if (!canViewReports) {
    return (
      <PermissionProvider permissions={session.permissions} isSuperAdmin={session.isSuperAdmin}>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors">
          <Navbar userName={session.name} userRole={session.roleName} />
          <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-2xl max-w-md mx-auto shadow-sm">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                You do not have permission to view Reports. Please contact your manager or administrator.
              </p>
            </div>
          </main>
          <Footer />
        </div>
      </PermissionProvider>
    );
  }

  return (
    <PermissionProvider permissions={session.permissions} isSuperAdmin={session.isSuperAdmin}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors">
        <Navbar userName={session.name} userRole={session.roleName} />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <ReportsDashboard />
        </main>

        <Footer />
      </div>
    </PermissionProvider>
  );
}
