import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { isUserSuperAdmin } from "@/lib/super-admin-validator";
import { prisma } from "@/lib/prisma";
import {
  getParameterSettings,
  validateParameterInput,
  ensureDefaultParameterSettings,
} from "@/lib/parameter-settings";
import { ParameterStatus } from "@prisma/client";

/**
 * GET /api/admin/parameter-settings
 * Requires PARAMETER_SETTINGS_VIEW permission or Super Admin
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isSuper = await isUserSuperAdmin(session.id);
  const canView = isSuper || (await hasPermission(session.id, "PARAMETER_SETTINGS_VIEW"));
  if (!canView) {
    return NextResponse.json(
      { error: "Forbidden: Missing PARAMETER_SETTINGS_VIEW permission" },
      { status: 403 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search") || undefined;
  const status = searchParams.get("status") || undefined;

  const parameters = await getParameterSettings(search, status);
  return NextResponse.json({ data: parameters });
}

/**
 * POST /api/admin/parameter-settings
 * Requires PARAMETER_SETTINGS_CREATE permission or Super Admin
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isSuper = await isUserSuperAdmin(session.id);
  const canCreate = isSuper || (await hasPermission(session.id, "PARAMETER_SETTINGS_CREATE"));
  if (!canCreate) {
    return NextResponse.json(
      { error: "Forbidden: Missing PARAMETER_SETTINGS_CREATE permission" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const code = (body.code as string)?.trim().toUpperCase();
    const name = (body.name as string)?.trim();
    const value = (body.value as string)?.trim();
    const unit = (body.unit as string)?.trim() || null;
    const description = (body.description as string)?.trim() || null;
    const status = body.status === "INACTIVE" ? ParameterStatus.INACTIVE : ParameterStatus.ACTIVE;

    if (!code) {
      return NextResponse.json({ error: "Parameter Code is required" }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ error: "Parameter Name is required" }, { status: 400 });
    }
    if (!value) {
      return NextResponse.json({ error: "Parameter Value is required" }, { status: 400 });
    }

    const validationError = validateParameterInput(code, value, unit);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    // Check duplicate code
    const existing = await prisma.parameterSetting.findUnique({
      where: { code },
    });
    if (existing) {
      return NextResponse.json(
        { error: `Parameter with code "${code}" already exists` },
        { status: 400 }
      );
    }

    const created = await prisma.parameterSetting.create({
      data: {
        code,
        name,
        value,
        unit,
        description,
        status,
      },
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to create parameter setting" },
      { status: 500 }
    );
  }
}
