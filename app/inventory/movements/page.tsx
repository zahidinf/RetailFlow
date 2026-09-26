import { getSessionWithPermissions, requirePasswordChanged } from "@/lib/auth";
import { PermissionProvider } from "@/app/components/PermissionProvider";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { redirect } from "next/navigation";
import { getStockMovements, getMovementUsers } from "@/lib/movements";
import MovementsTable from "./components/MovementsTable";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stock Movements Ledger",
};

export default async function StockMovementsPage() {
  await requirePasswordChanged();
  const session = await getSessionWithPermissions();

  if (!session) {
    redirect("/login?expired=1");
  }

  const canView =
    session.isSuperAdmin ||
    session.permissions.includes("INVENTORY_MOVEMENT_VIEW") ||
    session.permissions.includes("inventory.movement.view");

  if (!canView) {
    redirect("/");
  }

  const [movements, users] = await Promise.all([
    getStockMovements(),
    getMovementUsers(),
  ]);

  return (
    <PermissionProvider permissions={session.permissions} isSuperAdmin={session.isSuperAdmin}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors">
        <Navbar userName={session.name} userRole={session.roleName} />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                Stock Movements Ledger
              </h1>
              <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
                Complete audit trail of all inventory deductions, receipts, refunds, and adjustments
              </p>
            </div>
          </div>

          <MovementsTable initialMovements={movements} users={users} />
        </main>

        <Footer />
      </div>
    </PermissionProvider>
  );
}
