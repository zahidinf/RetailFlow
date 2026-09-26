import { NextResponse } from "next/server";
import { getSessionSettings } from "@/lib/session-settings";

export async function GET() {
  const settings = await getSessionSettings();
  return NextResponse.json({
    idleTimeoutMinutes: settings.idleTimeoutMinutes,
  });
}
