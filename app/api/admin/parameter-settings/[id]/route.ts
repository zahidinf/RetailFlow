import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { isUserSuperAdmin } from "@/lib/super-admin-validator";
import { prisma } from "@/lib/prisma";
import { validateParameterInput, PARAM_REFUND_VALIDITY_PERIOD } from "@/lib/parameter-settings";
import { ParameterStatus } from "@prisma/client";

/**
 * Helper to check permission
 */
async function checkAuth(permission: string) {
  const session = await getSession();
  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const isSuper = await isUserSuperAdmin(session.id);
  const allowed = isSuper || (await hasPermission(session.id, permission));
  if (!allowed) {
    return {
      error: NextResponse.json(
        { error: `Forbidden: Missing ${permission} permission` },
        { status: 403 }
      ),
    };
  }

  return { session };
}

/**
 * PUT / PATCH: Update parameter setting
 * Requires PARAMETER_SETTINGS_UPDATE permission or Super Admin
 */
async function handleUpdate(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await checkAuth("PARAMETER_SETTINGS_UPDATE");
  if (auth.error) return auth.error;

  const { id } = await params;

  try {
    const existing = await prisma.parameterSetting.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Parameter setting not found" }, { status: 404 });
    }

    const body = await request.json();
    const name = body.name !== undefined ? (body.name as string)?.trim() : existing.name;
    const value = body.value !== undefined ? (body.value as string)?.trim() : existing.value;
    const unit = body.unit !== undefined ? (body.unit as string)?.trim() || null : existing.unit;
    const description =
      body.description !== undefined
        ? (body.description as string)?.trim() || null
        : existing.description;
    const status =
      body.status !== undefined
        ? body.status === "INACTIVE"
          ? ParameterStatus.INACTIVE
          : ParameterStatus.ACTIVE
        : existing.status;

    if (!name) {
      return NextResponse.json({ error: "Parameter Name cannot be empty" }, { status: 400 });
    }
    if (!value) {
      return NextResponse.json({ error: "Parameter Value cannot be empty" }, { status: 400 });
    }

    const validationError = validateParameterInput(existing.code, value, unit, existing.unit);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const updated = await prisma.parameterSetting.update({
      where: { id },
      data: {
        name,
        value,
        unit,
        description,
        status,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update parameter setting" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handleUpdate(request, context);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handleUpdate(request, context);
}

/**
 * DELETE /api/admin/parameter-settings/[id]
 * Requires PARAMETER_SETTINGS_DELETE permission or Super Admin
 */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await checkAuth("PARAMETER_SETTINGS_DELETE");
  if (auth.error) return auth.error;

  const { id } = await params;

  try {
    const existing = await prisma.parameterSetting.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Parameter setting not found" }, { status: 404 });
    }

    // Protect essential system parameter
    if (existing.code === PARAM_REFUND_VALIDITY_PERIOD) {
      return NextResponse.json(
        { error: "Cannot delete required core system parameter REFUND_VALIDITY_PERIOD" },
        { status: 400 }
      );
    }

    await prisma.parameterSetting.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Parameter setting deleted" });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to delete parameter setting" },
      { status: 500 }
    );
  }
}
