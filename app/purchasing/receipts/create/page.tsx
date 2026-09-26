import { getSessionWithPermissions, requirePasswordChanged } from "@/lib/auth";
import { PermissionProvider } from "@/app/components/PermissionProvider";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { redirect } from "next/navigation";
import { getEligiblePOsForReceiving } from "@/lib/purchasing";
import GRCreateForm from "./components/GRCreateForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Receive Goods (Create Goods Receipt)",
};

export default async function CreateGoodsReceiptPage({
  searchParams,
}: {
  searchParams: Promise<{ poId?: string }>;
}) {
  await requirePasswordChanged();
  const session = await getSessionWithPermissions();

  if (!session) {
    redirect("/login?expired=1");
  }

  const canCreate =
    session.permissions.includes("GOODS_RECEIPT_CREATE") ||
    session.permissions.includes("goods_receipt.create") ||
    session.permissions.includes("RECEIPT_GOODS") ||
    session.permissions.includes("receipt_goods");

  if (!canCreate) {
    redirect("/purchasing/receipts");
  }

  const params = await searchParams;
  const eligibleOrders = await getEligiblePOsForReceiving();

  return (
    <PermissionProvider permissions={session.permissions} isSuperAdmin={session.isSuperAdmin}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors">
        <Navbar userName={session.name} userRole={session.roleName} />

        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Create Goods Receipt
            </h1>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
              Record physical items received from supplier delivery based on approved Purchase Order
            </p>
          </div>

          <GRCreateForm eligibleOrders={eligibleOrders} defaultPoId={params.poId} />
        </main>

        <Footer />
      </div>
    </PermissionProvider>
  );
}
