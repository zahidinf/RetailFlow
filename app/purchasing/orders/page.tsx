import { getSessionWithPermissions, requirePasswordChanged } from "@/lib/auth";
import { PermissionProvider } from "@/app/components/PermissionProvider";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { redirect } from "next/navigation";
import { getPurchaseOrdersList, getSuppliersList } from "@/lib/purchasing";
import POTable from "./components/POTable";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Purchase Orders",
};

export default async function PurchaseOrdersPage() {
  await requirePasswordChanged();
  const session = await getSessionWithPermissions();

  if (!session) {
    redirect("/login?expired=1");
  }

  const canView =
    session.permissions.includes("PURCHASE_ORDER_VIEW") ||
    session.permissions.includes("purchase_order.view") ||
    session.permissions.includes("purchase_order_view") ||
    session.permissions.includes("purchase.view") ||
    session.permissions.includes("purchase_view") ||
    session.permissions.includes("PURCHASE_VIEW");

  if (!canView) {
    redirect("/");
  }

  const [orders, suppliers] = await Promise.all([
    getPurchaseOrdersList(),
    getSuppliersList().catch(() => []),
  ]);

  const canCreate =
    session.permissions.includes("PURCHASE_ORDER_CREATE") ||
    session.permissions.includes("purchase_order.create") ||
    session.permissions.includes("PURCHASE") ||
    session.permissions.includes("purchase");

  const canSubmit =
    session.permissions.includes("PURCHASE_ORDER_SUBMIT") ||
    session.permissions.includes("purchase_order.submit");

  const canApprove =
    session.permissions.includes("PURCHASE_ORDER_APPROVE") ||
    session.permissions.includes("purchase_order.approve");

  const canCancel =
    session.permissions.includes("PURCHASE_ORDER_CANCEL") ||
    session.permissions.includes("purchase_order.cancel");

  return (
    <PermissionProvider permissions={session.permissions} isSuperAdmin={session.isSuperAdmin}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors">
        <Navbar userName={session.name} userRole={session.roleName} />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Purchase Orders
            </h1>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
              Procurement orders, approval tracking, and supplier deliveries
            </p>
          </div>

          <POTable
            initialOrders={orders}
            suppliers={suppliers}
            canCreate={canCreate}
            canSubmit={canSubmit}
            canApprove={canApprove}
            canCancel={canCancel}
          />
        </main>

        <Footer />
      </div>
    </PermissionProvider>
  );
}
