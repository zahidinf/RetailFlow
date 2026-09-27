import { getSessionWithPermissions, requirePasswordChanged } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/rbac";
import { getSalesList } from "@/lib/sales";
import { prisma } from "@/lib/prisma";
import { getRefundValidityPeriodConfig } from "@/lib/parameter-settings";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import SalesTable from "./components/SalesTable";
import { PermissionProvider } from "@/app/components/PermissionProvider";

export const metadata = {
  title: "Sales Transactions - RetailFlow",
};

export default async function SalesPage() {
  await requirePasswordChanged();
  const session = await getSessionWithPermissions();

  if (!session) {
    redirect("/login?expired=1");
  }

  const canViewAll =
    (await hasPermission(session.id, "SALES_VIEW_ALL")) ||
    (await hasPermission(session.id, "sales.view_all"));

  const canViewOwn =
    canViewAll ||
    (await hasPermission(session.id, "SALES_VIEW_OWN")) ||
    (await hasPermission(session.id, "sales.view_own")) ||
    (await hasPermission(session.id, "SALES_VIEW")) ||
    (await hasPermission(session.id, "sales.view"));

  if (!canViewOwn) {
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
                You do not have permission to view sales transactions. Please contact your manager or administrator.
              </p>
            </div>
          </main>
          <Footer />
        </div>
      </PermissionProvider>
    );
  }

  // Fetch sales scoped by server function
  const initialSales = await getSalesList();
  const validityConfig = await getRefundValidityPeriodConfig().catch(() => null);

  // If permitted to view all sales, provide cashier list for filtering
  let cashiers: { id: string; name: string }[] = [];
  if (canViewAll) {
    const cashierUsers = await prisma.user.findMany({
      where: {
        userRoles: {
          some: {
            role: {
              name: { in: ["CASHIER", "MANAGER", "ADMIN", "SUPER_ADMIN"] },
            },
          },
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
      orderBy: { firstName: "asc" },
    });

    cashiers = cashierUsers.map((u) => ({
      id: u.id,
      name: `${u.firstName} ${u.lastName}`,
    }));
  }

  return (
    <PermissionProvider permissions={session.permissions} isSuperAdmin={session.isSuperAdmin}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors">
        <Navbar userName={session.name} userRole={session.roleName} />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                Sales Transactions
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {canViewAll
                  ? "Monitor store-wide sales transactions, invoices, and cashier performance"
                  : "View your processed sales transactions and invoice records"}
              </p>
            </div>
            {canViewAll && (
              <a
                href="/sales/report"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors self-start sm:self-auto"
              >
                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Sales Report
              </a>
            )}
          </div>

          <SalesTable
            initialSales={initialSales}
            cashiers={cashiers}
            canViewAll={canViewAll}
            validityPeriodMs={validityConfig?.validityPeriodMs}
          />
        </main>

        <Footer />
      </div>
    </PermissionProvider>
  );
}
