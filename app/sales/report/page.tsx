import { getSessionWithPermissions, requirePasswordChanged } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/rbac";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { PermissionProvider } from "@/app/components/PermissionProvider";
import { getManagerDashboardData } from "@/lib/dashboard";
import Link from "next/link";
import SalesReportContent from "./components/SalesReportContent";

export const metadata = {
  title: "Sales Report - RetailFlow",
};

export default async function SalesReportPage() {
  await requirePasswordChanged();
  const session = await getSessionWithPermissions();

  if (!session) {
    redirect("/login?expired=1");
  }

  const canViewAll =
    (await hasPermission(session.id, "SALES_VIEW_ALL")) ||
    (await hasPermission(session.id, "sales.view_all"));

  const canView =
    canViewAll ||
    (await hasPermission(session.id, "SALES_VIEW")) ||
    (await hasPermission(session.id, "sales.view"));

  if (!canView) {
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
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                You do not have permission to view sales reports. Please contact your manager or administrator.
              </p>
            </div>
          </main>
          <Footer />
        </div>
      </PermissionProvider>
    );
  }

  const data = await getManagerDashboardData();

  return (
    <PermissionProvider permissions={session.permissions} isSuperAdmin={session.isSuperAdmin}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors">
        <Navbar userName={session.name} userRole={session.roleName} />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Link
                    href="/"
                    className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    Dashboard
                  </Link>
                  <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="text-xs font-semibold text-slate-900 dark:text-white">Sales Report</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Sales Report
                </h1>
                <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
                  Sales performance, trends, and category breakdown
                </p>
              </div>
              <Link
                href="/sales"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors self-start"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                View Transactions
              </Link>
            </div>
          </div>

          <SalesReportContent data={data} />
        </main>

        <Footer />
      </div>
    </PermissionProvider>
  );
}
