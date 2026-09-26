import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isUserSuperAdmin } from "@/lib/super-admin-validator";
import { getSessionSettings, updateSessionSettings } from "@/lib/session-settings";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isSuperAdmin = await isUserSuperAdmin(session.id);
  if (!isSuperAdmin) {
    return NextResponse.json(
      { error: "Forbidden: Super Admin access required" },
      { status: 403 }
    );
  }

  const settings = await getSessionSettings();
  return NextResponse.json(settings);
}

export async function PUT(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isSuperAdmin = await isUserSuperAdmin(session.id);
  if (!isSuperAdmin) {
    return NextResponse.json(
      { error: "Forbidden: Super Admin access required" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const maxActiveSessions = Number(body.maxActiveSessions);
    const idleTimeoutMinutes = Number(body.idleTimeoutMinutes);

    if (
      !Number.isInteger(maxActiveSessions) ||
      maxActiveSessions < 1 ||
      maxActiveSessions > 100
    ) {
      return NextResponse.json(
        { error: "Maximum Active Sessions must be an integer between 1 and 100." },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(idleTimeoutMinutes) ||
      idleTimeoutMinutes < 1 ||
      idleTimeoutMinutes > 1440
    ) {
      return NextResponse.json(
        { error: "Idle Timeout must be an integer between 1 and 1440 minutes." },
        { status: 400 }
      );
    }

    const result = await updateSessionSettings(
      { maxActiveSessions, idleTimeoutMinutes },
      session.id
    );

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("Failed to update session settings via API:", error);
    return NextResponse.json(
      { error: "Failed to update session settings" },
      { status: 500 }
    );
  }
}
