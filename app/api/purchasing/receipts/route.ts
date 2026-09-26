import { NextRequest, NextResponse } from "next/server";
import { getSession, SESSION_COOKIE_NAME } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import {
  getGoodsReceiptsList,
  createGoodsReceipt,
  CreateGRInput,
  PurchasingValidationError,
} from "@/lib/purchasing";

/**
 * GET /api/purchasing/receipts
 * Authoritative check: GOODS_RECEIPT_VIEW
 */
export async function GET(request: NextRequest) {
  const token = request.cookies?.get?.(SESSION_COOKIE_NAME)?.value;
  const session = await getSession(token);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canView =
    (await hasPermission(session.id, "GOODS_RECEIPT_VIEW")) ||
    (await hasPermission(session.id, "goods_receipt.view")) ||
    (await hasPermission(session.id, "RECEIPT_GOODS_VIEW"));

  if (!canView) {
    return NextResponse.json(
      { error: "Forbidden: Missing required permission: GOODS_RECEIPT_VIEW" },
      { status: 403 }
    );
  }

  try {
    const receipts = await getGoodsReceiptsList();
    return NextResponse.json({ data: receipts });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load goods receipts" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/purchasing/receipts
 * Authoritative check: GOODS_RECEIPT_CREATE / RECEIPT_GOODS
 */
export async function POST(request: NextRequest) {
  const token = request.cookies?.get?.(SESSION_COOKIE_NAME)?.value;
  const session = await getSession(token);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canCreate =
    (await hasPermission(session.id, "GOODS_RECEIPT_CREATE")) ||
    (await hasPermission(session.id, "goods_receipt.create")) ||
    (await hasPermission(session.id, "RECEIPT_GOODS")) ||
    (await hasPermission(session.id, "receipt_goods"));

  if (!canCreate) {
    return NextResponse.json(
      { error: "Forbidden: Missing required permission: GOODS_RECEIPT_CREATE" },
      { status: 403 }
    );
  }

  try {
    const body = (await request.json()) as CreateGRInput;
    const receipt = await createGoodsReceipt(body);
    return NextResponse.json({ success: true, receipt }, { status: 201 });
  } catch (error: any) {
    if (error instanceof PurchasingValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to create goods receipt" },
      { status: 500 }
    );
  }
}
