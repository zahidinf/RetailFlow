import { getStocks, getCategoriesForSelect } from "./actions";
import { getSessionWithPermissions, requirePasswordChanged } from "@/lib/auth";
import { PermissionProvider } from "@/app/components/PermissionProvider";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { redirect } from "next/navigation";
import StockTable from "./components/StockTable";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stock Management",
};

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; categoryId?: string; stockStatus?: string }>;
}) {
  await requirePasswordChanged();
  const session = await getSessionWithPermissions();

  if (!session) {
    redirect("/login?expired=1");
  }

  if (!session.permissions.includes("STOCK_VIEW")) {
    redirect("/");
  }

  const params = await searchParams;
  const [stocks, categories] = await Promise.all([
    getStocks(params.search, params.categoryId, params.stockStatus),
    getCategoriesForSelect(),
  ]);

  const canUpdate = session.permissions.includes("STOCK_UPDATE");
  const canViewMovements =
    session.isSuperAdmin ||
    session.permissions.includes("INVENTORY_MOVEMENT_VIEW") ||
    session.permissions.includes("inventory.movement.view");

  return (
    <PermissionProvider permissions={session.permissions} isSuperAdmin={session.isSuperAdmin}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors">
        <Navbar userName={session.name} userRole={session.roleName} />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Stock Management
                </h1>
                <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
                  Monitor inventory levels, status indicators, and adjust warehouse stock
                </p>
              </div>
            </div>
          </div>

          <StockTable
            stocks={stocks}
            categories={categories}
            canUpdate={canUpdate}
            canViewMovements={canViewMovements}
            currentSearch={params.search || ""}
            currentCategory={params.categoryId || ""}
            currentStatus={params.stockStatus || ""}
          />
        </main>
        <Footer />
      </div>
    </PermissionProvider>
  );
}
