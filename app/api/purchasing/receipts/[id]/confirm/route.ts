import { NextRequest, NextResponse } from "next/server";
import { getSession, SESSION_COOKIE_NAME } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import {
  confirmGoodsReceipt,
  PurchasingValidationError,
  PurchasingAuthorizationError,
} from "@/lib/purchasing";

/**
 * POST /api/purchasing/receipts/[id]/confirm
 * Authoritative check: GOODS_RECEIPT_CONFIRM
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.cookies?.get?.(SESSION_COOKIE_NAME)?.value;
  const session = await getSession(token);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canConfirm =
    (await hasPermission(session.id, "GOODS_RECEIPT_CONFIRM")) ||
    (await hasPermission(session.id, "goods_receipt.confirm")) ||
    (await hasPermission(session.id, "RECEIPT_GOODS_CONFIRM")) ||
    (await hasPermission(session.id, "receipt_goods.confirm"));

  if (!canConfirm) {
    return NextResponse.json(
      { error: "Forbidden: Missing required permission: GOODS_RECEIPT_CONFIRM" },
      { status: 403 }
    );
  }

  const { id } = await params;

  try {
    const receipt = await confirmGoodsReceipt(id);
    return NextResponse.json({ success: true, receipt });
  } catch (error: any) {
    if (error instanceof PurchasingAuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof PurchasingValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to confirm goods receipt" },
      { status: 500 }
    );
  }
}
