import { getSessionWithPermissions, requirePasswordChanged } from "@/lib/auth";
import { PermissionProvider } from "@/app/components/PermissionProvider";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { redirect } from "next/navigation";
import { getPromotionsList } from "@/lib/promotions";
import { prisma } from "@/lib/prisma";
import PromotionsTable from "./components/PromotionsTable";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Promotion Management",
};

export default async function PromotionsPage() {
  await requirePasswordChanged();
  const session = await getSessionWithPermissions();

  if (!session) {
    redirect("/login?expired=1");
  }

  const canView =
    session.permissions.includes("PROMOTION_VIEW") ||
    session.permissions.includes("promotion.view") ||
    session.permissions.includes("promotion_view");

  if (!canView) {
    redirect("/");
  }

  const promotions = await getPromotionsList();

  const products = await prisma.product.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      sku: true,
      name: true,
      sellingPrice: true,
    },
    orderBy: { name: "asc" },
  });

  const formattedProducts = products.map((p) => ({
    ...p,
    sellingPrice: Number(p.sellingPrice),
  }));

  const formattedPromotions = promotions.map((p) => ({
    ...p,
    minCartSubtotal: p.minCartSubtotal ? Number(p.minCartSubtotal) : null,
    specialPrice: p.specialPrice ? Number(p.specialPrice) : null,
    discountValue: p.discountValue ? Number(p.discountValue) : null,
    buyProduct: p.buyProduct
      ? { ...p.buyProduct, sellingPrice: Number(p.buyProduct.sellingPrice) }
      : null,
    rewardProduct: p.rewardProduct
      ? { ...p.rewardProduct, sellingPrice: Number(p.rewardProduct.sellingPrice) }
      : null,
  }));

  const canCreate =
    session.permissions.includes("PROMOTION_CREATE") ||
    session.permissions.includes("promotion.create") ||
    session.permissions.includes("promotion_create");

  const canEdit =
    session.permissions.includes("PROMOTION_EDIT") ||
    session.permissions.includes("promotion.edit") ||
    session.permissions.includes("promotion_edit");

  const canDelete =
    session.permissions.includes("PROMOTION_DELETE") ||
    session.permissions.includes("promotion.delete") ||
    session.permissions.includes("promotion_delete");

  const canActivate =
    session.permissions.includes("PROMOTION_ACTIVATE") ||
    session.permissions.includes("promotion.activate") ||
    session.permissions.includes("promotion_activate");

  const canDeactivate =
    session.permissions.includes("PROMOTION_DEACTIVATE") ||
    session.permissions.includes("promotion.deactivate") ||
    session.permissions.includes("promotion_deactivate");

  return (
    <PermissionProvider permissions={session.permissions} isSuperAdmin={session.isSuperAdmin}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors">
        <Navbar userName={session.name} userRole={session.roleName} />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Promotion Management
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Create and manage promotional discounts, Buy X Get Y bundles, and Tebus Murah thresholds.
            </p>
          </div>

          <PromotionsTable
            initialPromotions={formattedPromotions}
            products={formattedProducts}
            canCreate={canCreate}
            canEdit={canEdit}
            canDelete={canDelete}
            canActivate={canActivate}
            canDeactivate={canDeactivate}
          />
        </main>

        <Footer />
      </div>
    </PermissionProvider>
  );
}
