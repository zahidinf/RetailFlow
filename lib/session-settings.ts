import { prisma } from "./prisma";
import { Prisma } from "@prisma/client";

export const DEFAULT_MAX_ACTIVE_SESSIONS = 1;
export const DEFAULT_IDLE_TIMEOUT_MINUTES = 30;

export const ALLOWED_MAX_SESSIONS = [1, 2, 3, 4, 5] as const;
export const ALLOWED_IDLE_TIMEOUT_MINUTES = [5, 10, 15, 30, 60, 120] as const;

export type AllowedMaxSessions = (typeof ALLOWED_MAX_SESSIONS)[number];
export type AllowedIdleTimeoutMinutes = (typeof ALLOWED_IDLE_TIMEOUT_MINUTES)[number];

export const SETTING_KEY_MAX_SESSIONS = "SESSION_MAX_ACTIVE_SESSIONS";
export const SETTING_KEY_IDLE_TIMEOUT = "SESSION_IDLE_TIMEOUT_MINUTES";

export interface SessionSettings {
  maxActiveSessions: number;
  idleTimeoutMinutes: number;
}

/**
 * Retrieve session settings from database with safe defaults.
 */
export async function getSessionSettings(): Promise<SessionSettings> {
  try {
    const settings = await prisma.systemSetting.findMany({
      where: {
        key: {
          in: [SETTING_KEY_MAX_SESSIONS, SETTING_KEY_IDLE_TIMEOUT],
        },
      },
    });

    const map = new Map(settings.map((s) => [s.key, s.value]));

    const rawMax = map.get(SETTING_KEY_MAX_SESSIONS);
    const rawTimeout = map.get(SETTING_KEY_IDLE_TIMEOUT);

    const maxActiveSessions = rawMax ? parseInt(rawMax, 10) : DEFAULT_MAX_ACTIVE_SESSIONS;
    const idleTimeoutMinutes = rawTimeout ? parseInt(rawTimeout, 10) : DEFAULT_IDLE_TIMEOUT_MINUTES;

    return {
      maxActiveSessions: isNaN(maxActiveSessions) || maxActiveSessions < 1 ? DEFAULT_MAX_ACTIVE_SESSIONS : maxActiveSessions,
      idleTimeoutMinutes: isNaN(idleTimeoutMinutes) || idleTimeoutMinutes < 1 ? DEFAULT_IDLE_TIMEOUT_MINUTES : idleTimeoutMinutes,
    };
  } catch (error) {
    console.error("Error fetching session settings, falling back to defaults:", error);
    return {
      maxActiveSessions: DEFAULT_MAX_ACTIVE_SESSIONS,
      idleTimeoutMinutes: DEFAULT_IDLE_TIMEOUT_MINUTES,
    };
  }
}

/**
 * Reconcile existing sessions when maxActiveSessions is decreased.
 * Preserves the most recently active sessions up to limit, revokes older ones.
 */
export async function reconcileActiveSessions(
  maxSessions: number,
  tx: Prisma.TransactionClient = prisma
): Promise<number> {
  const usersWithSessions = await tx.session.groupBy({
    by: ["userId"],
    _count: {
      id: true,
    },
    having: {
      id: {
        _count: {
          gt: maxSessions,
        },
      },
    },
  });

  let revokedTotal = 0;

  for (const group of usersWithSessions) {
    const excessCount = group._count.id - maxSessions;
    if (excessCount <= 0) continue;

    // Get the oldest sessions for this user to revoke
    const sessionsToRevoke = await tx.session.findMany({
      where: { userId: group.userId },
      orderBy: { lastActivity: "asc" },
      take: excessCount,
      select: { id: true },
    });

    const idsToRevoke = sessionsToRevoke.map((s: { id: string }) => s.id);
    if (idsToRevoke.length > 0) {
      await tx.session.deleteMany({
        where: { id: { in: idsToRevoke } },
      });
      revokedTotal += idsToRevoke.length;
    }
  }

  return revokedTotal;
}

/**
 * Update session settings, audit log changes, and reconcile existing sessions.
 */
export async function updateSessionSettings(
  params: { maxActiveSessions: number; idleTimeoutMinutes: number },
  adminUserId: string
): Promise<{ success: boolean; data?: SessionSettings; error?: string }> {
  const { maxActiveSessions, idleTimeoutMinutes } = params;

  // Validate Maximum Active Sessions
  if (
    !Number.isInteger(maxActiveSessions) ||
    !ALLOWED_MAX_SESSIONS.includes(maxActiveSessions as AllowedMaxSessions)
  ) {
    return {
      success: false,
      error: `Maximum Active Sessions must be one of: ${ALLOWED_MAX_SESSIONS.join(", ")}.`,
    };
  }

  // Validate Idle Timeout
  if (
    !Number.isInteger(idleTimeoutMinutes) ||
    !ALLOWED_IDLE_TIMEOUT_MINUTES.includes(idleTimeoutMinutes as AllowedIdleTimeoutMinutes)
  ) {
    return {
      success: false,
      error: `Idle Timeout must be one of: ${ALLOWED_IDLE_TIMEOUT_MINUTES.join(", ")} minutes.`,
    };
  }

  const current = await getSessionSettings();

  return await prisma.$transaction(async (tx) => {
    // Upsert max active sessions
    await tx.systemSetting.upsert({
      where: { key: SETTING_KEY_MAX_SESSIONS },
      update: { value: String(maxActiveSessions) },
      create: { key: SETTING_KEY_MAX_SESSIONS, value: String(maxActiveSessions) },
    });

    // Upsert idle timeout
    await tx.systemSetting.upsert({
      where: { key: SETTING_KEY_IDLE_TIMEOUT },
      update: { value: String(idleTimeoutMinutes) },
      create: { key: SETTING_KEY_IDLE_TIMEOUT, value: String(idleTimeoutMinutes) },
    });

    // Audit log if changed
    const now = new Date();

    if (current.maxActiveSessions !== maxActiveSessions) {
      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: "UPDATE_SESSION_SETTING",
          entity: SETTING_KEY_MAX_SESSIONS,
          details: JSON.stringify({
            setting: "Maximum Active Sessions",
            previousValue: current.maxActiveSessions,
            newValue: maxActiveSessions,
            changedBy: adminUserId,
            timestamp: now.toISOString(),
          }),
          createdAt: now,
        },
      });

      // Reconcile existing sessions if limit lowered
      if (maxActiveSessions < current.maxActiveSessions) {
        await reconcileActiveSessions(maxActiveSessions, tx);
      }
    }

    if (current.idleTimeoutMinutes !== idleTimeoutMinutes) {
      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: "UPDATE_SESSION_SETTING",
          entity: SETTING_KEY_IDLE_TIMEOUT,
          details: JSON.stringify({
            setting: "Session Idle Timeout",
            previousValue: current.idleTimeoutMinutes,
            newValue: idleTimeoutMinutes,
            changedBy: adminUserId,
            timestamp: now.toISOString(),
          }),
          createdAt: now,
        },
      });
    }

    return {
      success: true,
      data: {
        maxActiveSessions,
        idleTimeoutMinutes,
      },
    };
  });
}
