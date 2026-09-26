import { getSessionWithPermissions, requirePasswordChanged, formatRoleName } from "@/lib/auth";
import { getSessionSettings } from "@/lib/session-settings";
import { prisma } from "@/lib/prisma";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { PermissionProvider } from "./components/PermissionProvider";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  getCashierDashboardData,
  getManagerDashboardData,
  getInventoryStaffDashboardData,
} from "@/lib/dashboard";
import CashierDashboard from "./components/dashboard/CashierDashboard";
import ManagerDashboard from "./components/dashboard/ManagerDashboard";
import InventoryStaffDashboard from "./components/dashboard/InventoryStaffDashboard";

export const metadata: Metadata = {
  title: "Dashboard",
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 18) return "Good afternoon";
  return "Good evening";
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));
  if (diffInSeconds < 60) return "Just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function DashboardPage() {
  await requirePasswordChanged();
  const session = await getSessionWithPermissions();

  if (!session) {
    redirect("/login?expired=1");
  }

  const sessionSettings = await getSessionSettings();

  // ========================================================
  // Role-specific dashboards for Cashier, Manager, Inventory Staff
  // Admin / Super Admin continue to the original dashboard below
  // ========================================================
  const isRoleDashboard = ["CASHIER", "MANAGER", "INVENTORY_STAFF"].includes(session.rawRole);

  if (isRoleDashboard) {
    const greeting = getGreeting();
    const currentDateFormatted = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date());

    let roleDashboardContent: React.ReactNode = null;
    let welcomeSubtitle = "Here is an overview of your system today.";

    if (session.rawRole === "CASHIER") {
      const data = await getCashierDashboardData(session.id);
      welcomeSubtitle = "Here's your shift summary and POS activity for today.";
      roleDashboardContent = <CashierDashboard data={data} userName={session.name} />;
    } else if (session.rawRole === "MANAGER") {
      const data = await getManagerDashboardData();
      welcomeSubtitle = "Here's today's store performance and operational overview.";
      roleDashboardContent = <ManagerDashboard data={data} userName={session.name} />;
    } else if (session.rawRole === "INVENTORY_STAFF") {
      const data = await getInventoryStaffDashboardData();
      welcomeSubtitle = "Here's your inventory status and pending tasks.";
      roleDashboardContent = <InventoryStaffDashboard data={data} userName={session.name} />;
    }

    return (
      <PermissionProvider permissions={session.permissions} isSuperAdmin={session.isSuperAdmin}>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors">
          <Navbar userName={session.name} userRole={session.roleName} />

          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
            {/* Welcome Header */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                      {session.roleName}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 dark:bg-green-950/60 text-green-700 dark:text-green-300 border border-green-200/60 dark:border-green-800/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-600 dark:bg-green-400 animate-pulse" />
                      System Active
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                    {greeting}, {session.firstName || session.name} 👋
                  </h1>
                  <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
                    {welcomeSubtitle}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2 rounded-lg self-start sm:self-auto">
                  <svg
                    className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span>{currentDateFormatted}</span>
                </div>
              </div>
            </div>

            {/* Role-specific dashboard content */}
            {roleDashboardContent}
          </main>
          <Footer />
        </div>
      </PermissionProvider>
    );
  }

  // ========================================================
  // Original Admin / Super Admin Dashboard (UNTOUCHED below)
  // ========================================================

  const canViewUsers = session.permissions.includes("USER_VIEW");
  const canCreateUser = session.permissions.includes("USER_CREATE");
  const canManageRoles = session.permissions.includes("ROLE_MANAGE");
  const canViewRoles = session.permissions.includes("ROLE_VIEW") || canManageRoles;
  const canViewCategories = session.permissions.includes("CATEGORY_VIEW");
  const canViewProducts = session.permissions.includes("PRODUCT_VIEW");
  const canCreateProduct = session.permissions.includes("PRODUCT_CREATE");
  const canViewStock = session.permissions.includes("STOCK_VIEW");

  let totalCategories: number | null = null;
  let totalProducts: number | null = null;
  let lowStockCount: number | null = null;
  let outOfStockCount: number | null = null;

  let totalUsers: number | null = null;
  let activeUsers: number | null = null;
  let inactiveUsers: number | null = null;
  let newUsersLast7Days: number | null = null;
  let recentUsers: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    status: string;
    createdAt: Date;
    lastLoginAt: Date | null;
    roleName: string;
  }> = [];

  let totalRoles: number | null = null;
  let rolesSummary: Array<{
    id: string;
    name: string;
    description: string | null;
    userCount: number;
  }> = [];

  // Fetch Inventory overview if user has any product management permission
  if (canViewCategories || canViewProducts || canViewStock) {
    const promises: Promise<unknown>[] = [];

    if (canViewCategories) {
      promises.push(prisma.category.count());
    } else {
      promises.push(Promise.resolve(null));
    }

    if (canViewProducts) {
      promises.push(prisma.product.count());
    } else {
      promises.push(Promise.resolve(null));
    }

    if (canViewStock) {
      promises.push(
        prisma.$queryRaw<Array<{ low_stock: bigint; out_of_stock: bigint }>>`
          SELECT 
            COUNT(CASE WHEN s."currentStock" > 0 AND s."currentStock" <= p."minimumStock" THEN 1 END) as low_stock,
            COUNT(CASE WHEN s."currentStock" <= 0 THEN 1 END) as out_of_stock
          FROM "Stock" s
          JOIN "Product" p ON s."productId" = p."id"
        `
      );
    } else {
      promises.push(Promise.resolve(null));
    }

    const [catCount, prodCount, stockCounts] = await Promise.all(promises);
    totalCategories = catCount as number | null;
    totalProducts = prodCount as number | null;

    if (stockCounts && Array.isArray(stockCounts) && stockCounts.length > 0) {
      lowStockCount = Number(stockCounts[0].low_stock);
      outOfStockCount = Number(stockCounts[0].out_of_stock);
    }
  }

  // Fetch metrics based on permissions
  if (canViewUsers) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [total, active, inactive, newUsers, recent] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: "ACTIVE" } }),
      prisma.user.count({ where: { status: { not: "ACTIVE" } } }),
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.user.findMany({
        take: 5,
        orderBy: [{ lastLoginAt: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          status: true,
          createdAt: true,
          lastLoginAt: true,
          userRoles: {
            take: 1,
            select: {
              role: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      }),
    ]);

    totalUsers = total;
    activeUsers = active;
    inactiveUsers = inactive;
    newUsersLast7Days = newUsers;
    recentUsers = recent.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      status: u.status,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
      roleName: u.userRoles[0]?.role?.name ? formatRoleName(u.userRoles[0].role.name) : "User",
    }));
  }

  if (canViewRoles) {
    const [rolesCount, allRoles] = await Promise.all([
      prisma.role.count(),
      prisma.role.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          _count: {
            select: {
              userRoles: true,
            },
          },
        },
        orderBy: {
          userRoles: {
            _count: "desc",
          },
        },
      }),
    ]);

    totalRoles = rolesCount;
    rolesSummary = allRoles.map((r) => ({
      id: r.id,
      name: formatRoleName(r.name),
      description: r.description,
      userCount: r._count.userRoles,
    }));
  }

  const greeting = getGreeting();
  const currentDateFormatted = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());

  const activeRate =
    totalUsers && totalUsers > 0 && activeUsers !== null
      ? Math.round((activeUsers / totalUsers) * 100)
      : 100;

  return (
    <PermissionProvider permissions={session.permissions} isSuperAdmin={session.isSuperAdmin}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors">
        <Navbar userName={session.name} userRole={session.roleName} />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
          {/* Welcome Header Section */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                    {session.roleName}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 dark:bg-green-950/60 text-green-700 dark:text-green-300 border border-green-200/60 dark:border-green-800/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-600 dark:bg-green-400 animate-pulse" />
                    System Active
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {greeting}, {session.firstName || session.name} 👋
                </h1>
                <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
                  Here is an overview of your system today.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2 rounded-lg self-start sm:self-auto">
                <svg
                  className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span>{currentDateFormatted}</span>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          {(canViewUsers || canViewRoles) ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {canViewUsers && (
                <>
                  {/* Total Users */}
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Users</p>
                      <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4.354a4 4 0 110 8.646 4 4 0 010-8.646M19 12a7 7 0 11-14 0 7 7 0 0114 0z"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="mt-3">
                      <h3 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                        {totalUsers ?? 0}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                        <span className="font-semibold text-blue-600 dark:text-blue-400">
                          +{newUsersLast7Days ?? 0}
                        </span>{" "}
                        joined in last 7 days
                      </p>
                    </div>
                  </div>

                  {/* Active Users */}
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Active Users</p>
                      <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-950/60 text-green-600 dark:text-green-400 flex items-center justify-center">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="mt-3">
                      <h3 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                        {activeUsers ?? 0}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                        <span className="font-semibold text-green-600 dark:text-green-400">{activeRate}%</span>{" "}
                        active rate
                      </p>
                    </div>
                  </div>

                  {/* Inactive Users */}
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Inactive Users</p>
                      <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="mt-3">
                      <h3 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                        {inactiveUsers ?? 0}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {(inactiveUsers ?? 0) === 0
                          ? "All accounts in good standing"
                          : "Temporary or permanent inactive"}
                      </p>
                    </div>
                  </div>
                </>
              )}

              {canViewRoles && (
                /* Total Roles */
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Roles</p>
                    <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                        />
                      </svg>
                    </div>
                  </div>
                  <div className="mt-3">
                    <h3 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                      {totalRoles ?? 0}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Configured access roles</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Non-admin standard summary card */
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs transition-colors">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Account Status
                </p>
                <p className="mt-2 text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-600 dark:bg-green-400" />
                  Active
                </p>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs transition-colors">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Your Role
                </p>
                <p className="mt-2 text-xl font-bold text-slate-900 dark:text-white">{session.roleName}</p>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs transition-colors">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Session Security
                </p>
                <p className="mt-2 text-xl font-bold text-slate-900 dark:text-white">Protected</p>
              </div>
            </div>
          )}

          {/* Inventory Summary Cards */}
          {(canViewCategories || canViewProducts || canViewStock) && (
            <div className="space-y-3">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Product & Inventory Overview
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {canViewCategories && (
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Categories</p>
                      <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                      </div>
                    </div>
                    <div className="mt-3">
                      <h3 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                        {totalCategories ?? 0}
                      </h3>
                      <Link href="/admin/categories" className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 mt-1 inline-flex items-center gap-1">
                        Manage categories &rarr;
                      </Link>
                    </div>
                  </div>
                )}

                {canViewProducts && (
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Products</p>
                      <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                    </div>
                    <div className="mt-3">
                      <h3 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                        {totalProducts ?? 0}
                      </h3>
                      <Link href="/admin/products" className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mt-1 inline-flex items-center gap-1">
                        View all products &rarr;
                      </Link>
                    </div>
                  </div>
                )}

                {canViewStock && (
                  <>
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Low Stock Alerts</p>
                        <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </div>
                      </div>
                      <div className="mt-3">
                        <h3 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                          {lowStockCount ?? 0}
                        </h3>
                        <Link href="/admin/stock?stockStatus=LOW_STOCK" className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 mt-1 inline-flex items-center gap-1">
                          View low stock items &rarr;
                        </Link>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Out of Stock</p>
                        <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      </div>
                      <div className="mt-3">
                        <h3 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                          {outOfStockCount ?? 0}
                        </h3>
                        <Link href="/admin/stock?stockStatus=OUT_OF_STOCK" className="text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 mt-1 inline-flex items-center gap-1">
                          View out of stock items &rarr;
                        </Link>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {canCreateUser && (
                <Link
                  href="/admin/users"
                  className="group bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500/60 dark:hover:border-blue-500/60 p-4 shadow-xs hover:shadow-sm transition-all flex items-center gap-3.5"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                      />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                      Add New User
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Create a new user account</p>
                  </div>
                </Link>
              )}

              {canViewUsers && (
                <Link
                  href="/admin/users"
                  className="group bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500/60 dark:hover:border-blue-500/60 p-4 shadow-xs hover:shadow-sm transition-all flex items-center gap-3.5"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                      Manage Users
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">View and edit user list</p>
                  </div>
                </Link>
              )}

              {canManageRoles && (
                <Link
                  href="/admin/roles"
                  className="group bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500/60 dark:hover:border-blue-500/60 p-4 shadow-xs hover:shadow-sm transition-all flex items-center gap-3.5"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                      Manage Roles
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Permissions & access levels</p>
                  </div>
                </Link>
              )}

              {canCreateProduct && (
                <Link
                  href="/admin/products"
                  className="group bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500/60 dark:hover:border-blue-500/60 p-4 shadow-xs hover:shadow-sm transition-all flex items-center gap-3.5"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                      Add Product
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Create a new product</p>
                  </div>
                </Link>
              )}

              {canViewStock && (
                <Link
                  href="/admin/stock"
                  className="group bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500/60 dark:hover:border-blue-500/60 p-4 shadow-xs hover:shadow-sm transition-all flex items-center gap-3.5"
                >
                  <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 group-hover:bg-amber-600 group-hover:text-white transition-colors flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                      />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                      Stock Management
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Monitor and adjust stock</p>
                  </div>
                </Link>
              )}

              <Link
                href="/profile"
                className="group bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500/60 dark:hover:border-blue-500/60 p-4 shadow-xs hover:shadow-sm transition-all flex items-center gap-3.5"
              >
                <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:bg-slate-800 dark:group-hover:bg-slate-700 group-hover:text-white transition-colors flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                    My Profile
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Update account settings</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Overview Grid (2 Columns on large screens) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Left 2 Cols: Recent Activity / Users */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                    {canViewUsers ? "Recent Users" : "System Activity"}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    {canViewUsers
                      ? "Recently logged in users"
                      : "Overview of your system status"}
                  </p>
                </div>
                {canViewUsers && (
                  <Link
                    href="/admin/users"
                    className="text-xs sm:text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 transition-colors"
                  >
                    View all users
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Link>
                )}
              </div>

              {canViewUsers ? (
                recentUsers.length > 0 ? (
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs divide-y divide-slate-100 dark:divide-slate-800 transition-colors">
                    {recentUsers.map((user) => (
                      <div
                        key={user.id}
                        className="p-4 sm:px-6 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-semibold text-sm flex items-center justify-center shrink-0 shadow-xs">
                            {user.firstName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {user.roleName}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                              user.status === "ACTIVE"
                                ? "bg-green-50 dark:bg-green-950/60 text-green-700 dark:text-green-300 border-green-200/60 dark:border-green-800/60"
                                : "bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200/60 dark:border-red-800/60"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                user.status === "ACTIVE" ? "bg-green-600 dark:bg-green-400" : "bg-red-600 dark:bg-red-400"
                              }`}
                            />
                            {user.status === "ACTIVE" ? "Active" : "Inactive"}
                          </span>
                          <span className="text-xs text-slate-400 dark:text-slate-500 hidden md:inline-block w-20 text-right">
                            {user.lastLoginAt ? formatRelativeTime(user.lastLoginAt) : "Never"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Empty state */
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 sm:p-12 text-center shadow-xs transition-colors">
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto mb-3">
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4.354a4 4 0 110 8.646 4 4 0 010-8.646M19 12a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">No recent users</h3>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                      There are no registered users to display.
                    </p>
                  </div>
                )
              ) : (
                /* Non-admin access info */
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4 transition-colors">
                  <div className="flex items-center gap-3 text-green-800 dark:text-green-300 bg-green-50 dark:bg-green-950/60 border border-green-200 dark:border-green-800/60 p-3.5 rounded-lg text-sm">
                    <svg className="w-5 h-5 shrink-0 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                    <span>Your account is fully authenticated with standard member privileges.</span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    You can manage your personal details and password through your profile. If you require higher administrative privileges, please request access from your system administrator.
                  </p>
                </div>
              )}
            </div>

            {/* Right 1 Col: Roles Overview & System Health */}
            <div className="space-y-6">
              {canViewRoles && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                        Roles
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Access role distribution</p>
                    </div>
                    {canManageRoles && (
                      <Link
                        href="/admin/roles"
                        className="text-xs sm:text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 transition-colors"
                      >
                        Manage
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </Link>
                    )}
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden transition-colors">
                    {rolesSummary.length > 0 ? (
                      rolesSummary.map((role) => (
                        <div
                          key={role.id}
                          className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                              {role.name}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {role.description || "No description provided"}
                            </p>
                          </div>
                          <span className="shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {role.userCount} {role.userCount === 1 ? "user" : "users"}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                        No roles configured.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Security & System Info */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Security Overview
                </h3>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3.5 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">
                        {sessionSettings.maxActiveSessions === 1
                          ? "Single Session Enforcement"
                          : "Concurrent Session Enforcement"}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {sessionSettings.maxActiveSessions === 1
                          ? "Active. Only 1 concurrent session per user allowed."
                          : `Active. Up to ${sessionSettings.maxActiveSessions} concurrent sessions per user allowed.`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-950/60 text-green-600 dark:text-green-400 flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">Session Idle Timeout</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Active. Auto expires after {sessionSettings.idleTimeoutMinutes} minutes of inactivity.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">Role-Based Access Control</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Enforced at API, database, and navigation levels.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </PermissionProvider>
  );
}
