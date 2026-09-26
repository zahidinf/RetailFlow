"use server";

import { requireSuperAdmin } from "@/lib/auth-guards";
import {
  getSessionSettings,
  updateSessionSettings,
  SessionSettings,
  ALLOWED_MAX_SESSIONS,
  ALLOWED_IDLE_TIMEOUT_MINUTES,
  AllowedMaxSessions,
  AllowedIdleTimeoutMinutes,
} from "@/lib/session-settings";
import { revalidatePath } from "next/cache";

export async function fetchSessionSettings(): Promise<{ success: boolean; data?: SessionSettings; error?: string }> {
  try {
    await requireSuperAdmin();
    const data = await getSessionSettings();
    return { success: true, data };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load session settings";
    return { success: false, error: message };
  }
}

export async function saveSessionSettings(params: {
  maxActiveSessions: number;
  idleTimeoutMinutes: number;
}): Promise<{ success: boolean; data?: SessionSettings; error?: string }> {
  try {
    const session = await requireSuperAdmin();

    const maxActiveSessions = Number(params.maxActiveSessions);
    const idleTimeoutMinutes = Number(params.idleTimeoutMinutes);

    if (
      !Number.isInteger(maxActiveSessions) ||
      !ALLOWED_MAX_SESSIONS.includes(maxActiveSessions as AllowedMaxSessions)
    ) {
      return {
        success: false,
        error: `Maximum Active Sessions must be one of: ${ALLOWED_MAX_SESSIONS.join(", ")}.`,
      };
    }

    if (
      !Number.isInteger(idleTimeoutMinutes) ||
      !ALLOWED_IDLE_TIMEOUT_MINUTES.includes(idleTimeoutMinutes as AllowedIdleTimeoutMinutes)
    ) {
      return {
        success: false,
        error: `Idle Timeout must be one of: ${ALLOWED_IDLE_TIMEOUT_MINUTES.join(", ")} minutes.`,
      };
    }

    const result = await updateSessionSettings(
      { maxActiveSessions, idleTimeoutMinutes },
      session.id
    );

    if (result.error) {
      return { success: false, error: result.error };
    }

    revalidatePath("/admin/sessions");
    revalidatePath("/");

    return {
      success: true,
      data: result.data,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to save session settings";
    return {
      success: false,
      error: message,
    };
  }
}
