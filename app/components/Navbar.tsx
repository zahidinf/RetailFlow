"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import AdminMenu from "./AdminMenu";
import ProductManagementMenu from "./ProductManagementMenu";
import PurchasingMenu from "./PurchasingMenu";
import ReportMenu from "./ReportMenu";
import UserMenu from "./UserMenu";
import { usePermissions } from "./PermissionProvider";
import { logout } from "../actions";

interface NavbarProps {
  userName: string;
  userRole?: string;
}

export default function Navbar({ userName, userRole }: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProductSubmenuOpen, setIsProductSubmenuOpen] = useState(true);
  const [isAdminSubmenuOpen, setIsAdminSubmenuOpen] = useState(true);
  const pathname = usePathname();
  const { hasPermission, isSuperAdmin } = usePermissions();
  const navRef = useRef<HTMLElement>(null);

  const canViewUsers = hasPermission("USER_VIEW") || isSuperAdmin;
  const canManageRoles = hasPermission("ROLE_MANAGE") || isSuperAdmin;
  const canViewParameters = hasPermission("PARAMETER_SETTINGS_VIEW") || isSuperAdmin;
  const canViewPromotions =
    hasPermission("PROMOTION_VIEW") ||
    hasPermission("promotion.view") ||
    hasPermission("promotion_view") ||
    isSuperAdmin;
  const isAdmin = canViewUsers || canManageRoles || canViewParameters || canViewPromotions || isSuperAdmin;

  const canViewCategories = hasPermission("CATEGORY_VIEW") || isSuperAdmin;
  const canViewProducts = hasPermission("PRODUCT_VIEW") || isSuperAdmin;
  const canViewStock = hasPermission("STOCK_VIEW") || isSuperAdmin;
  const canViewMovements = hasPermission("INVENTORY_MOVEMENT_VIEW") || isSuperAdmin;
  const hasProductManagement = canViewCategories || canViewProducts || canViewStock || canViewMovements;

  const canViewSuppliers = hasPermission("SUPPLIER_VIEW");
  const canViewOrders = hasPermission("PURCHASE_ORDER_VIEW");
  const canViewReceipts = hasPermission("GOODS_RECEIPT_VIEW");
  const hasPurchasing = canViewSuppliers || canViewOrders || canViewReceipts;
  const [isPurchasingSubmenuOpen, setIsPurchasingSubmenuOpen] = useState(true);

  const canAccessPos =
    hasPermission("POS_ACCESS") || hasPermission("pos.access");
  const canViewSales =
    hasPermission("SALES_VIEW") ||
    hasPermission("SALES_VIEW_OWN") ||
    hasPermission("SALES_VIEW_ALL") ||
    hasPermission("sales.view") ||
    hasPermission("sales.view_own") ||
    hasPermission("sales.view_all");

  const canViewReports = hasPermission("REPORT_VIEW");
  const canViewSalesReports = hasPermission("REPORT_SALES_VIEW");
  const canViewInventoryReports = hasPermission("REPORT_INVENTORY_VIEW");
  const canViewPurchasingReports = hasPermission("REPORT_PURCHASING_VIEW");
  const canViewWarehouseReports = hasPermission("REPORT_WAREHOUSE_VIEW");
  const canViewFinanceReports = hasPermission("REPORT_FINANCE_VIEW");
  const canViewCashierReports = hasPermission("REPORT_CASHIER_VIEW");
  const canViewAuditReports = hasPermission("REPORT_AUDIT_VIEW");

  const hasReports =
    canViewReports &&
    (canViewSalesReports ||
      canViewInventoryReports ||
      canViewPurchasingReports ||
      canViewWarehouseReports ||
      canViewFinanceReports ||
      canViewCashierReports ||
      canViewAuditReports);

  // Close mobile menu when pressing Escape
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
      }
    }

    if (isMobileMenuOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileMenuOpen]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    }

    if (isMobileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  async function handleLogout() {
    setIsMobileMenuOpen(false);
    await logout();
  }

  const isHomeActive = pathname === "/";
  const isProfileActive = pathname === "/profile";
  const isUsersActive = pathname === "/admin/users";
  const isRolesActive = pathname === "/admin/roles";
  const isCategoriesActive = pathname === "/admin/categories";
  const isProductsActive = pathname === "/admin/products";
  const isStockActive = pathname === "/admin/stock";
  const isSessionsActive = pathname === "/admin/sessions";

  return (
    <nav ref={navRef} className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo / Brand */}
          <Link href="/" className="flex items-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg">
            {/* Compact logo icon for mobile */}
            <Image
              src="/branding/logo-icon.svg"
              alt="RetailFlow"
              width={36}
              height={36}
              className="h-9 w-9 sm:hidden object-contain"
              priority
            />
            {/* Full logo for sm and desktop (light mode) */}
            <Image
              src="/branding/logo.svg"
              alt="RetailFlow"
              width={170}
              height={41}
              className="h-10 w-auto hidden sm:block dark:hidden object-contain"
              priority
            />
            {/* Full logo for sm and desktop (dark mode) */}
            <Image
              src="/branding/logo-dark.svg"
              alt="RetailFlow"
              width={170}
              height={41}
              className="h-10 w-auto hidden dark:sm:block object-contain"
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className={`text-sm font-medium transition-colors ${
                isHomeActive
                  ? "text-blue-600 dark:text-blue-400 font-semibold"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Dashboard
            </Link>
            {canAccessPos && (
              <Link
                href="/pos"
                className={`text-sm font-medium transition-colors ${
                  pathname === "/pos"
                    ? "text-blue-600 dark:text-blue-400 font-semibold"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                POS
              </Link>
            )}
            {canViewSales && (
              <Link
                href="/sales"
                className={`text-sm font-medium transition-colors ${
                  pathname.startsWith("/sales")
                    ? "text-blue-600 dark:text-blue-400 font-semibold"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Sales
              </Link>
            )}
            <ProductManagementMenu />
            <PurchasingMenu />
            <ReportMenu />
            <AdminMenu />
            <div className="flex items-center gap-4 pl-4 border-l border-slate-200 dark:border-slate-800">
              <UserMenu userName={userName} userRole={userRole} />
            </div>
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex items-center md:hidden">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-lg text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              aria-controls="mobile-menu"
              aria-expanded={isMobileMenuOpen}
              aria-label={isMobileMenuOpen ? "Close main menu" : "Open main menu"}
            >
              {isMobileMenuOpen ? (
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 top-16 bg-slate-950/60 z-30 md:hidden transition-opacity"
          aria-hidden="true"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Navigation Panel - Dark Enterprise Sidebar Theme */}
      {isMobileMenuOpen && (
        <div
          id="mobile-menu"
          className="md:hidden relative z-40 bg-[#0F172A] border-b border-slate-800 shadow-xl max-h-[calc(100vh-4rem)] overflow-y-auto"
        >
          {/* Mobile Drawer Brand Header */}
          <div className="px-4 py-3 bg-[#0B1120] border-b border-slate-800/80 flex items-center justify-between">
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-2"
            >
              <Image
                src="/branding/logo-dark.svg"
                alt="RetailFlow"
                width={133}
                height={32}
                className="h-8 w-auto object-contain"
              />
            </Link>
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              Menu
            </span>
          </div>

          {/* User Info Header */}
          <div className="px-4 py-3 bg-[#1E293B] border-b border-slate-700/60 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-xs">
              <span className="text-white text-base font-semibold">
                {userName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{userName}</p>
              {userRole ? (
                <span className="inline-block mt-0.5 px-2 py-0.5 text-[11px] font-semibold bg-blue-600/20 text-blue-300 rounded border border-blue-500/30">
                  {userRole}
                </span>
              ) : (
                <p className="text-xs text-slate-400">Signed in</p>
              )}
            </div>
          </div>

          <div className="px-3 py-3 space-y-1">
            {/* Dashboard Link */}
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isHomeActive
                  ? "bg-blue-600 text-white font-semibold"
                  : "text-[#CBD5E1] hover:bg-[#1E293B] hover:text-white"
              }`}
            >
              <svg
                className={`w-5 h-5 ${isHomeActive ? "text-white" : "text-[#94A3B8]"}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              Dashboard
            </Link>

            {/* POS Link */}
            {canAccessPos && (
              <Link
                href="/pos"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  pathname === "/pos"
                    ? "bg-blue-600 text-white font-semibold"
                    : "text-[#CBD5E1] hover:bg-[#1E293B] hover:text-white"
                }`}
              >
                <svg
                  className={`w-5 h-5 ${pathname === "/pos" ? "text-white" : "text-[#94A3B8]"}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
                Point of Sale (POS)
              </Link>
            )}

            {/* Sales Link */}
            {canViewSales && (
              <Link
                href="/sales"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  pathname.startsWith("/sales")
                    ? "bg-blue-600 text-white font-semibold"
                    : "text-[#CBD5E1] hover:bg-[#1E293B] hover:text-white"
                }`}
              >
                <svg
                  className={`w-5 h-5 ${pathname.startsWith("/sales") ? "text-white" : "text-[#94A3B8]"}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                  />
                </svg>
                Sales Transactions
              </Link>
            )}

            {/* Product Management Section */}
            {hasProductManagement && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsProductSubmenuOpen(!isProductSubmenuOpen)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-200"
                >
                  <span>Product Management</span>
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${
                      isProductSubmenuOpen ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {isProductSubmenuOpen && (
                  <div className="space-y-1 mt-1 pl-2">
                    {canViewCategories && (
                      <Link
                        href="/admin/categories"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                          isCategoriesActive
                            ? "bg-blue-600 text-white font-medium"
                            : "text-[#94A3B8] hover:bg-[#1E293B] hover:text-white"
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                          />
                        </svg>
                        Categories
                      </Link>
                    )}

                    {canViewProducts && (
                      <Link
                        href="/admin/products"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                          isProductsActive
                            ? "bg-blue-600 text-white font-medium"
                            : "text-[#94A3B8] hover:bg-[#1E293B] hover:text-white"
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                          />
                        </svg>
                        Products
                      </Link>
                    )}

                    {canViewStock && (
                      <Link
                        href="/admin/stock"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                          isStockActive
                            ? "bg-blue-600 text-white font-medium"
                            : "text-[#94A3B8] hover:bg-[#1E293B] hover:text-white"
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                          />
                        </svg>
                        Stock Management
                      </Link>
                    )}

                    {canViewMovements && (
                      <Link
                        href="/inventory/movements"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                          pathname === "/inventory/movements"
                            ? "bg-blue-600 text-white font-medium"
                            : "text-[#94A3B8] hover:bg-[#1E293B] hover:text-white"
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        Stock Movements
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Purchasing Section */}
            {hasPurchasing && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsPurchasingSubmenuOpen(!isPurchasingSubmenuOpen)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-200"
                >
                  <span>Purchasing</span>
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${
                      isPurchasingSubmenuOpen ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {isPurchasingSubmenuOpen && (
                  <div className="space-y-1 mt-1 pl-2">
                    {canViewSuppliers && (
                      <Link
                        href="/purchasing/suppliers"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                          pathname.startsWith("/purchasing/suppliers")
                            ? "bg-blue-600 text-white font-medium"
                            : "text-[#94A3B8] hover:bg-[#1E293B] hover:text-white"
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                          />
                        </svg>
                        Suppliers
                      </Link>
                    )}

                    {canViewOrders && (
                      <Link
                        href="/purchasing/orders"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                          pathname.startsWith("/purchasing/orders")
                            ? "bg-blue-600 text-white font-medium"
                            : "text-[#94A3B8] hover:bg-[#1E293B] hover:text-white"
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        Purchase Orders
                      </Link>
                    )}

                    {canViewReceipts && (
                      <Link
                        href="/purchasing/receipts"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                          pathname.startsWith("/purchasing/receipts")
                            ? "bg-blue-600 text-white font-medium"
                            : "text-[#94A3B8] hover:bg-[#1E293B] hover:text-white"
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                          />
                        </svg>
                        Goods Receipts
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Reports Link */}
            {hasReports && (
              <Link
                href="/reports"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  pathname.startsWith("/reports")
                    ? "bg-blue-600 text-white font-semibold"
                    : "text-[#CBD5E1] hover:bg-[#1E293B] hover:text-white"
                }`}
              >
                <svg
                  className={`w-5 h-5 ${pathname.startsWith("/reports") ? "text-white" : "text-[#94A3B8]"}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                Reports
              </Link>
            )}

            {/* Admin Section */}
            {isAdmin && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdminSubmenuOpen(!isAdminSubmenuOpen)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-200"
                >
                  <span>Administration</span>
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${
                      isAdminSubmenuOpen ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {isAdminSubmenuOpen && (
                  <div className="space-y-1 mt-1 pl-2">
                    {canViewUsers && (
                      <Link
                        href="/admin/users"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                          isUsersActive
                            ? "bg-blue-600 text-white font-medium"
                            : "text-[#94A3B8] hover:bg-[#1E293B] hover:text-white"
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"
                          />
                          <circle cx="9" cy="7" r="4" strokeWidth={2} />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
                          />
                        </svg>
                        User Management
                      </Link>
                    )}

                    {canManageRoles && (
                      <Link
                        href="/admin/roles"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                          isRolesActive
                            ? "bg-blue-600 text-white font-medium"
                            : "text-[#94A3B8] hover:bg-[#1E293B] hover:text-white"
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4"
                          />
                        </svg>
                        Role Management
                      </Link>
                    )}

                    {canViewParameters && (
                      <Link
                        href="/admin/parameter-settings"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                          pathname.startsWith("/admin/parameter-settings") || pathname.startsWith("/administration/parameter-settings")
                            ? "bg-blue-600 text-white font-medium"
                            : "text-[#94A3B8] hover:bg-[#1E293B] hover:text-white"
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        Parameter Settings
                      </Link>
                    )}
                    {canViewPromotions && (
                      <Link
                        href="/admin/promotions"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                          pathname.startsWith("/admin/promotions")
                            ? "bg-blue-600 text-white font-medium"
                            : "text-[#94A3B8] hover:bg-[#1E293B] hover:text-white"
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                          />
                        </svg>
                        Promotion Management
                      </Link>
                    )}
                    {isSuperAdmin && (
                      <Link
                        href="/admin/sessions"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                          isSessionsActive
                            ? "bg-blue-600 text-white font-medium"
                            : "text-[#94A3B8] hover:bg-[#1E293B] hover:text-white"
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                          />
                        </svg>
                        Session Policy
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Profile Link */}
            <div className="pt-2 border-t border-slate-800">
              <Link
                href="/profile"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isProfileActive
                    ? "bg-blue-600 text-white font-semibold"
                    : "text-[#CBD5E1] hover:bg-[#1E293B] hover:text-white"
                }`}
              >
                <svg
                  className={`w-5 h-5 ${isProfileActive ? "text-white" : "text-[#94A3B8]"}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                My Profile
              </Link>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-[#1E293B] hover:text-red-300 transition-colors mt-1"
              >
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
