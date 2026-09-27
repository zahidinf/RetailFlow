import { NextRequest, NextResponse } from "next/server";
import { getSession, SESSION_COOKIE_NAME } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import {
  getSuperAdminDashboardData,
  getAdminDashboardData,
  getAccountantDashboardData,
  getAuditorDashboardData,
  getCashierDashboardData,
  getManagerDashboardData,
  getInventoryStaffDashboardData,
  getPurchasingDashboardData,
  getWarehouseDashboardData,
} from "@/lib/dashboard";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ role: string }> }
) {
  const token = request.cookies?.get?.(SESSION_COOKIE_NAME)?.value;
  const session = await getSession(token);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Base dashboard permission check
  const canViewDashboard = await hasPermission(session.id, "DASHBOARD_VIEW");
  if (!canViewDashboard) {
    return NextResponse.json({ error: "Forbidden: Missing DASHBOARD_VIEW" }, { status: 403 });
  }

  const { role } = await params;
  const target = role.toUpperCase();
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "today";

  // Check role-specific permission boundaries
  switch (target) {
    case "SUPER_ADMIN": {
      const allowed =
        (await hasPermission(session.id, "USER_VIEW")) &&
        (await hasPermission(session.id, "STOCK_VIEW")) &&
        (await hasPermission(session.id, "PURCHASE_ORDER_VIEW"));
      if (!allowed) {
        return NextResponse.json({ error: "Forbidden: Missing Super Admin dashboard permissions" }, { status: 403 });
      }
      const data = await getSuperAdminDashboardData(period);
      return NextResponse.json({ data });
    }

    case "ADMIN": {
      const allowed = await hasPermission(session.id, "USER_VIEW");
      if (!allowed) {
        return NextResponse.json({ error: "Forbidden: Missing USER_VIEW" }, { status: 403 });
      }
      const data = await getAdminDashboardData();
      return NextResponse.json({ data });
    }

    case "ACCOUNTANT": {
      const allowed =
        (await hasPermission(session.id, "REPORT_FINANCE_VIEW")) ||
        (await hasPermission(session.id, "DASHBOARD_FINANCE_VIEW"));
      if (!allowed) {
        return NextResponse.json({ error: "Forbidden: Missing Finance dashboard permission" }, { status: 403 });
      }
      const data = await getAccountantDashboardData(period);
      return NextResponse.json({ data });
    }

    case "AUDITOR": {
      const allowed =
        (await hasPermission(session.id, "REPORT_AUDIT_VIEW")) ||
        (await hasPermission(session.id, "DASHBOARD_AUDIT_VIEW"));
      if (!allowed) {
        return NextResponse.json({ error: "Forbidden: Missing Audit dashboard permission" }, { status: 403 });
      }
      const data = await getAuditorDashboardData();
      return NextResponse.json({ data });
    }

    case "CASHIER": {
      const allowed =
        (await hasPermission(session.id, "POS_ACCESS")) ||
        (await hasPermission(session.id, "SALES_VIEW_OWN")) ||
        (await hasPermission(session.id, "DASHBOARD_TRANSACTION_VIEW"));
      if (!allowed) {
        return NextResponse.json({ error: "Forbidden: Missing POS / Cashier dashboard permission" }, { status: 403 });
      }
      const data = await getCashierDashboardData(session.id);
      return NextResponse.json({ data });
    }

    case "INVENTORY":
    case "INVENTORY_STAFF": {
      const allowed =
        (await hasPermission(session.id, "STOCK_VIEW")) ||
        (await hasPermission(session.id, "DASHBOARD_INVENTORY_VIEW"));
      if (!allowed) {
        return NextResponse.json({ error: "Forbidden: Missing Inventory dashboard permission" }, { status: 403 });
      }
      const data = await getInventoryStaffDashboardData();
      return NextResponse.json({ data });
    }

    case "MANAGER": {
      const allowed =
        (await hasPermission(session.id, "SALES_VIEW_ALL")) ||
        (await hasPermission(session.id, "DASHBOARD_SALES_VIEW"));
      if (!allowed) {
        return NextResponse.json({ error: "Forbidden: Missing Manager dashboard permission" }, { status: 403 });
      }
      const data = await getManagerDashboardData();
      return NextResponse.json({ data });
    }

    case "PURCHASING": {
      const allowed =
        (await hasPermission(session.id, "PURCHASE_ORDER_VIEW")) ||
        (await hasPermission(session.id, "DASHBOARD_PURCHASE_VIEW"));
      if (!allowed) {
        return NextResponse.json({ error: "Forbidden: Missing Purchasing dashboard permission" }, { status: 403 });
      }
      const data = await getPurchasingDashboardData();
      return NextResponse.json({ data });
    }

    case "WAREHOUSE": {
      const allowed =
        (await hasPermission(session.id, "GOODS_RECEIPT_VIEW")) ||
        (await hasPermission(session.id, "DASHBOARD_RECEIVING_VIEW"));
      if (!allowed) {
        return NextResponse.json({ error: "Forbidden: Missing Warehouse dashboard permission" }, { status: 403 });
      }
      const data = await getWarehouseDashboardData();
      return NextResponse.json({ data });
    }

    default:
      return NextResponse.json({ error: `Unknown dashboard role: ${role}` }, { status: 400 });
  }
}
