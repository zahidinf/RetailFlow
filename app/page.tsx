import { getSessionWithPermissions, requirePasswordChanged } from "@/lib/auth";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { PermissionProvider } from "./components/PermissionProvider";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  getCashierDashboardData,
  getManagerDashboardData,
  getInventoryStaffDashboardData,
  getSuperAdminDashboardData,
  getAdminDashboardData,
  getAccountantDashboardData,
  getAuditorDashboardData,
  getPurchasingDashboardData,
  getWarehouseDashboardData,
} from "@/lib/dashboard";
import CashierDashboard from "./components/dashboard/CashierDashboard";
import ManagerDashboard from "./components/dashboard/ManagerDashboard";
import InventoryStaffDashboard from "./components/dashboard/InventoryStaffDashboard";
import SuperAdminDashboard from "./components/dashboard/SuperAdminDashboard";
import AdminDashboard from "./components/dashboard/AdminDashboard";
import AccountantDashboard from "./components/dashboard/AccountantDashboard";
import AuditorDashboard from "./components/dashboard/AuditorDashboard";
import PurchasingDashboard from "./components/dashboard/PurchasingDashboard";
import WarehouseDashboard from "./components/dashboard/WarehouseDashboard";
import { DashboardHeader } from "./components/dashboard/DashboardFramework";
import { DashboardDateFilter } from "./components/dashboard/DashboardDateFilter";

export const metadata: Metadata = {
  title: "Dashboard",
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ period?: string }>;
}) {
  await requirePasswordChanged();
  const session = await getSessionWithPermissions();

  if (!session) {
    redirect("/login?expired=1");
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const period = resolvedSearchParams.period || "today";

  const greeting = getGreeting();
  const rawRole = session.rawRole.toUpperCase();
  const perms = session.permissions;

  let dashboardComponent: React.ReactNode = null;
  let welcomeSubtitle = "Here is an overview of your system today.";
  let dateFilterNode: React.ReactNode = null;

  // Determine dashboard based on RBAC permissions and user role context
  if (rawRole === "SUPER_ADMIN" || (perms.includes("USER_VIEW") && perms.includes("STOCK_VIEW") && perms.includes("PURCHASE_ORDER_VIEW") && session.isSuperAdmin)) {
    const data = await getSuperAdminDashboardData(period);
    welcomeSubtitle = "Complete operational, financial, and system performance overview.";
    dateFilterNode = (
      <DashboardDateFilter
        periods={[
          { label: "Today", value: "today" },
          { label: "7 Days", value: "7d" },
          { label: "30 Days", value: "30d" },
          { label: "12 Months", value: "12m" },
        ]}
        currentPeriod={period}
      />
    );
    dashboardComponent = <SuperAdminDashboard data={data} userName={session.name} />;
  } else if (rawRole === "ADMIN" || perms.includes("USER_CREATE") || perms.includes("ROLE_MANAGE")) {
    const data = await getAdminDashboardData();
    welcomeSubtitle = "System administration, user access, and compliance activity.";
    dashboardComponent = <AdminDashboard data={data} userName={session.name} />;
  } else if (rawRole === "ACCOUNTANT" || perms.includes("REPORT_FINANCE_VIEW") || perms.includes("DASHBOARD_FINANCE_VIEW")) {
    const data = await getAccountantDashboardData(period);
    welcomeSubtitle = "Financial performance, revenue metrics, and tax summary.";
    dateFilterNode = (
      <DashboardDateFilter
        periods={[
          { label: "Today", value: "today" },
          { label: "Yesterday", value: "yesterday" },
          { label: "7 Days", value: "7d" },
          { label: "30 Days", value: "30d" },
          { label: "This Month", value: "month" },
        ]}
        currentPeriod={period}
      />
    );
    dashboardComponent = <AccountantDashboard data={data} userName={session.name} />;
  } else if (rawRole === "AUDITOR" || perms.includes("REPORT_AUDIT_VIEW") || perms.includes("DASHBOARD_AUDIT_VIEW")) {
    const data = await getAuditorDashboardData();
    welcomeSubtitle = "System traceability, compliance logs, and security monitoring.";
    dashboardComponent = <AuditorDashboard data={data} userName={session.name} />;
  } else if (rawRole === "PURCHASING" || perms.includes("PURCHASE_ORDER_CREATE") || perms.includes("DASHBOARD_PURCHASE_VIEW")) {
    const data = await getPurchasingDashboardData();
    welcomeSubtitle = "Procurement pipeline, purchase orders, and supplier overview.";
    dashboardComponent = <PurchasingDashboard data={data} userName={session.name} />;
  } else if (rawRole === "WAREHOUSE" || perms.includes("GOODS_RECEIPT_CONFIRM") || perms.includes("DASHBOARD_RECEIVING_VIEW")) {
    const data = await getWarehouseDashboardData();
    welcomeSubtitle = "Inbound shipments, goods receipts, and warehouse receiving operations.";
    dashboardComponent = <WarehouseDashboard data={data} userName={session.name} />;
  } else if (rawRole === "MANAGER" || perms.includes("SALES_VIEW_ALL") || perms.includes("DASHBOARD_SALES_VIEW")) {
    const data = await getManagerDashboardData();
    welcomeSubtitle = "Here's today's store performance and operational overview.";
    dashboardComponent = <ManagerDashboard data={data} userName={session.name} />;
  } else if (rawRole === "INVENTORY" || rawRole === "INVENTORY_STAFF" || perms.includes("STOCK_UPDATE") || perms.includes("DASHBOARD_INVENTORY_VIEW")) {
    const data = await getInventoryStaffDashboardData();
    welcomeSubtitle = "Here's your inventory status and stock health.";
    dashboardComponent = <InventoryStaffDashboard data={data} userName={session.name} />;
  } else if (rawRole === "CASHIER" || perms.includes("POS_ACCESS") || perms.includes("DASHBOARD_TRANSACTION_VIEW")) {
    const data = await getCashierDashboardData(session.id);
    welcomeSubtitle = "Here's your shift summary and POS activity for today.";
    dashboardComponent = <CashierDashboard data={data} userName={session.name} />;
  } else {
    // Default fallback: load minimal user dashboard
    const data = await getCashierDashboardData(session.id);
    dashboardComponent = <CashierDashboard data={data} userName={session.name} />;
  }

  return (
    <PermissionProvider permissions={session.permissions} isSuperAdmin={session.isSuperAdmin}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors">
        <Navbar userName={session.name} userRole={session.roleName} />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
          <DashboardHeader
            title={`${greeting}, ${session.firstName || session.name} 👋`}
            subtitle={welcomeSubtitle}
            roleName={session.roleName}
            userName={session.name}
            dateRangeComponent={dateFilterNode}
          />

          {dashboardComponent}
        </main>
        <Footer />
      </div>
    </PermissionProvider>
  );
}
