import { getSessionWithPermissions, requirePasswordChanged } from "@/lib/auth";
import { PermissionProvider } from "@/app/components/PermissionProvider";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { notFound, redirect } from "next/navigation";
import { getPurchaseOrderDetail } from "@/lib/purchasing";
import PODetailView from "./components/PODetailView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Purchase Order Details",
};

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
    redirect("/purchasing/orders");
  }

  const { id } = await params;
  const order = await getPurchaseOrderDetail(id);

  if (!order) {
    notFound();
  }

  const canSubmit =
    session.permissions.includes("PURCHASE_ORDER_SUBMIT") ||
    session.permissions.includes("purchase_order.submit");

  const canApprove =
    session.permissions.includes("PURCHASE_ORDER_APPROVE") ||
    session.permissions.includes("purchase_order.approve");

  const canCancel =
    session.permissions.includes("PURCHASE_ORDER_CANCEL") ||
    session.permissions.includes("purchase_order.cancel");

  const canCreateGR =
    session.permissions.includes("GOODS_RECEIPT_CREATE") ||
    session.permissions.includes("goods_receipt.create") ||
    session.permissions.includes("RECEIPT_GOODS") ||
    session.permissions.includes("receipt_goods");

  return (
    <PermissionProvider permissions={session.permissions} isSuperAdmin={session.isSuperAdmin}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors">
        <Navbar userName={session.name} userRole={session.roleName} />

        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
          <PODetailView
            order={order}
            canSubmit={canSubmit}
            canApprove={canApprove}
            canCancel={canCancel}
            canCreateGR={canCreateGR}
          />
        </main>

        <Footer />
      </div>
    </PermissionProvider>
  );
}
