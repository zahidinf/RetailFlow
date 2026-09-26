import { NextRequest, NextResponse } from "next/server";
import { getSession, SESSION_COOKIE_NAME, runWithSessionToken } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import {
  getPurchaseOrdersList,
  createPurchaseOrder,
  CreatePOInput,
  PurchasingValidationError,
} from "@/lib/purchasing";

/**
 * GET /api/purchasing/orders
 * Authoritative check: PURCHASE_ORDER_VIEW
 */
export async function GET(request: NextRequest) {
  const token = request.cookies?.get?.(SESSION_COOKIE_NAME)?.value;
  const session = await getSession(token);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canView =
    (await hasPermission(session.id, "PURCHASE_ORDER_VIEW")) ||
    (await hasPermission(session.id, "purchase_order.view")) ||
    (await hasPermission(session.id, "purchase_order_view")) ||
    (await hasPermission(session.id, "PURCHASE_VIEW"));

  if (!canView) {
    return NextResponse.json(
      { error: "Forbidden: Missing required permission: PURCHASE_ORDER_VIEW" },
      { status: 403 }
    );
  }

  try {
    const orders = token
      ? await runWithSessionToken(token, () => getPurchaseOrdersList())
      : await getPurchaseOrdersList();
    return NextResponse.json({ data: orders });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load purchase orders" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/purchasing/orders
 * Authoritative check: PURCHASE_ORDER_CREATE / PURCHASE
 */
export async function POST(request: NextRequest) {
  const token = request.cookies?.get?.(SESSION_COOKIE_NAME)?.value;
  const session = await getSession(token);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canCreate =
    (await hasPermission(session.id, "PURCHASE_ORDER_CREATE")) ||
    (await hasPermission(session.id, "purchase_order.create")) ||
    (await hasPermission(session.id, "PURCHASE")) ||
    (await hasPermission(session.id, "purchase"));

  if (!canCreate) {
    return NextResponse.json(
      { error: "Forbidden: Missing required permission: PURCHASE_ORDER_CREATE" },
      { status: 403 }
    );
  }

  try {
    const body = (await request.json()) as CreatePOInput;
    const order = token
      ? await runWithSessionToken(token, () => createPurchaseOrder(body))
      : await createPurchaseOrder(body);
    return NextResponse.json({ success: true, order }, { status: 201 });
  } catch (error: any) {
    if (error instanceof PurchasingValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to create purchase order" },
      { status: 500 }
    );
  }
}
