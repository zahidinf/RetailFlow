import { getCategories } from "./actions";
import { getSessionWithPermissions, requirePasswordChanged } from "@/lib/auth";
import { PermissionProvider } from "@/app/components/PermissionProvider";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { redirect } from "next/navigation";
import AddCategoryDialog from "./components/AddCategoryDialog";
import CategoryTable from "./components/CategoryTable";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Category Management",
};

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string }>;
}) {
  await requirePasswordChanged();
  const session = await getSessionWithPermissions();

  if (!session) {
    redirect("/login?expired=1");
  }

  if (!session.permissions.includes("CATEGORY_VIEW")) {
    redirect("/");
  }

  const params = await searchParams;
  const categories = await getCategories(params.search, params.status);

  const canCreate = session.permissions.includes("CATEGORY_CREATE");
  const canUpdate = session.permissions.includes("CATEGORY_UPDATE");
  const canDelete = session.permissions.includes("CATEGORY_DELETE");

  return (
    <PermissionProvider permissions={session.permissions} isSuperAdmin={session.isSuperAdmin}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors">
        <Navbar userName={session.name} userRole={session.roleName} />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Categories
                </h1>
                <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
                  Manage product categories
                </p>
              </div>

              {canCreate && <AddCategoryDialog />}
            </div>
          </div>

          <CategoryTable
            categories={categories}
            canUpdate={canUpdate}
            canDelete={canDelete}
            currentSearch={params.search || ""}
            currentStatus={params.status || ""}
          />
        </main>
        <Footer />
      </div>
    </PermissionProvider>
  );
}
