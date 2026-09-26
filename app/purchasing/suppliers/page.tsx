import { getSessionWithPermissions, requirePasswordChanged } from "@/lib/auth";
import { PermissionProvider } from "@/app/components/PermissionProvider";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { redirect } from "next/navigation";
import { getSuppliersList } from "@/lib/purchasing";
import SuppliersTable from "./components/SuppliersTable";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Supplier Management",
};

export default async function SuppliersPage() {
  await requirePasswordChanged();
  const session = await getSessionWithPermissions();

  if (!session) {
    redirect("/login?expired=1");
  }

  const canView =
    session.permissions.includes("SUPPLIER_VIEW") ||
    session.permissions.includes("supplier.view");

  if (!canView) {
    redirect("/");
  }

  const suppliers = await getSuppliersList();

  const canCreate =
    session.permissions.includes("SUPPLIER_CREATE") ||
    session.permissions.includes("supplier.create");

  const canUpdate =
    session.permissions.includes("SUPPLIER_UPDATE") ||
    session.permissions.includes("supplier.update");

  const canDelete =
    session.permissions.includes("SUPPLIER_DELETE") ||
    session.permissions.includes("supplier.delete");

  return (
    <PermissionProvider permissions={session.permissions} isSuperAdmin={session.isSuperAdmin}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors">
        <Navbar userName={session.name} userRole={session.roleName} />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Suppliers
            </h1>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
              Manage vendors, supplier profiles, and procurement contacts
            </p>
          </div>

          <SuppliersTable
            initialSuppliers={suppliers}
            canCreate={canCreate}
            canUpdate={canUpdate}
            canDelete={canDelete}
          />
        </main>

        <Footer />
      </div>
    </PermissionProvider>
  );
}
