import { getSessionWithPermissions, requirePasswordChanged } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/rbac";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import PosTerminal from "./components/PosTerminal";
import { PermissionProvider } from "@/app/components/PermissionProvider";
import { prisma } from "@/lib/prisma";
import { getActivePromotionsForPos } from "@/lib/promotions";

export const metadata = {
  title: "Point of Sale (POS) - RetailFlow",
};

export default async function PosPage() {
  await requirePasswordChanged();
  const session = await getSessionWithPermissions();

  if (!session) {
    redirect("/login?expired=1");
  }

  const canAccessPos =
    (await hasPermission(session.id, "POS_ACCESS")) ||
    (await hasPermission(session.id, "pos.access"));

  if (!canAccessPos) {
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
                You do not have permission to access the Point of Sale terminal. Please contact your manager or system administrator.
              </p>
            </div>
          </main>
          <Footer />
        </div>
      </PermissionProvider>
    );
  }

  // Fetch active products with stock
  const products = await prisma.product.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    include: {
      category: { select: { name: true } },
      stock: { select: { currentStock: true } },
    },
  });

  const formattedProducts = products.map((p) => ({
    id: p.id,
    sku: p.sku,
    barcode: p.barcode,
    name: p.name,
    sellingPrice: Number(p.sellingPrice),
    unit: p.unit,
    categoryName: p.category.name,
    currentStock: p.stock?.currentStock ?? 0,
    image: p.image,
  }));

  // Fetch active promotions
  let initialPromotions: any[] = [];
  try {
    const rawPromos = await getActivePromotionsForPos();
    initialPromotions = rawPromos.map((p) => ({
      ...p,
      minCartSubtotal: p.minCartSubtotal ? Number(p.minCartSubtotal) : null,
      specialPrice: p.specialPrice ? Number(p.specialPrice) : null,
      discountValue: p.discountValue ? Number(p.discountValue) : null,
      buyProduct: p.buyProduct
        ? {
            ...p.buyProduct,
            sellingPrice: Number(p.buyProduct.sellingPrice),
            currentStock: p.buyProduct.stock?.currentStock ?? 0,
          }
        : null,
      rewardProduct: p.rewardProduct
        ? {
            ...p.rewardProduct,
            sellingPrice: Number(p.rewardProduct.sellingPrice),
            currentStock: p.rewardProduct.stock?.currentStock ?? 0,
          }
        : null,
    }));
  } catch {
    // If cashier doesn't have promo view permission yet, graceful fallback
  }

  return (
    <PermissionProvider permissions={session.permissions} isSuperAdmin={session.isSuperAdmin}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors">
        <Navbar userName={session.name} userRole={session.roleName} />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                Point of Sale
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Select products to process sales transactions and automatically deduct inventory
              </p>
            </div>
          </div>

          <PosTerminal
            products={formattedProducts}
            initialPromotions={initialPromotions}
          />
        </main>

        <Footer />
      </div>
    </PermissionProvider>
  );
}
