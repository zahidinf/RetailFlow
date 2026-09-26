import { getSessionWithPermissions, requirePasswordChanged } from "@/lib/auth";
import { PermissionProvider } from "@/app/components/PermissionProvider";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { redirect } from "next/navigation";
import { getGoodsReceiptsList } from "@/lib/purchasing";
import GRTable from "./components/GRTable";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Goods Receipts",
};

export default async function GoodsReceiptsPage() {
  await requirePasswordChanged();
  const session = await getSessionWithPermissions();

  if (!session) {
    redirect("/login?expired=1");
  }

  const canView =
    session.permissions.includes("GOODS_RECEIPT_VIEW") ||
    session.permissions.includes("goods_receipt.view");

  if (!canView) {
    redirect("/");
  }

  const receipts = await getGoodsReceiptsList();

  const canCreate =
    session.permissions.includes("GOODS_RECEIPT_CREATE") ||
    session.permissions.includes("goods_receipt.create") ||
    session.permissions.includes("RECEIPT_GOODS") ||
    session.permissions.includes("receipt_goods");

  const canConfirm =
    session.permissions.includes("GOODS_RECEIPT_CONFIRM") ||
    session.permissions.includes("goods_receipt.confirm") ||
    session.permissions.includes("RECEIPT_GOODS_CONFIRM") ||
    session.permissions.includes("receipt_goods.confirm");

  const canCancel =
    session.permissions.includes("GOODS_RECEIPT_CANCEL") ||
    session.permissions.includes("goods_receipt.cancel");

  return (
    <PermissionProvider permissions={session.permissions} isSuperAdmin={session.isSuperAdmin}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors">
        <Navbar userName={session.name} userRole={session.roleName} />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Goods Receipts
            </h1>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
              Physical receiving of supplier shipments, inspection, and stock increments
            </p>
          </div>

          <GRTable
            initialReceipts={receipts}
            canCreate={canCreate}
            canConfirm={canConfirm}
            canCancel={canCancel}
          />
        </main>

        <Footer />
      </div>
    </PermissionProvider>
  );
}
