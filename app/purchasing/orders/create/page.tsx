import { getSessionWithPermissions, requirePasswordChanged } from "@/lib/auth";
import { PermissionProvider } from "@/app/components/PermissionProvider";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSuppliersList } from "@/lib/purchasing";
import POCreateForm from "./components/POCreateForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Purchase Order",
};

export default async function CreatePOPage() {
  await requirePasswordChanged();
  const session = await getSessionWithPermissions();

  if (!session) {
    redirect("/login?expired=1");
  }

  const canCreate =
    session.permissions.includes("PURCHASE_ORDER_CREATE") ||
    session.permissions.includes("purchase_order.create") ||
    session.permissions.includes("PURCHASE") ||
    session.permissions.includes("purchase");

  if (!canCreate) {
    redirect("/purchasing/orders");
  }

  const [suppliers, products] = await Promise.all([
    getSuppliersList({ status: "ACTIVE" }),
    prisma.product.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        sku: true,
        name: true,
        unit: true,
        costPrice: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <PermissionProvider permissions={session.permissions} isSuperAdmin={session.isSuperAdmin}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors">
        <Navbar userName={session.name} userRole={session.roleName} />

        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Create Purchase Order
            </h1>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
              Draft a new purchase order for supplier procurement
            </p>
          </div>

          <POCreateForm
            suppliers={suppliers}
            products={products.map((p) => ({
              ...p,
              costPrice: Number(p.costPrice),
            }))}
          />
        </main>

        <Footer />
      </div>
    </PermissionProvider>
  );
}
