import { getSessionWithPermissions, requirePasswordChanged } from "@/lib/auth";
import { PermissionProvider } from "@/app/components/PermissionProvider";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { notFound, redirect } from "next/navigation";
import { getGoodsReceiptDetail } from "@/lib/purchasing";
import GRDetailView from "./components/GRDetailView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Goods Receipt Details",
};

export default async function GoodsReceiptDetailPage({
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
    session.permissions.includes("GOODS_RECEIPT_VIEW") ||
    session.permissions.includes("goods_receipt.view");

  if (!canView) {
    redirect("/purchasing/receipts");
  }

  const { id } = await params;
  const receipt = await getGoodsReceiptDetail(id);

  if (!receipt) {
    notFound();
  }

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

        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
          <GRDetailView receipt={receipt} canConfirm={canConfirm} canCancel={canCancel} />
        </main>

        <Footer />
      </div>
    </PermissionProvider>
  );
}
