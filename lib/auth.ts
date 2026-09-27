import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { getUserPermissions } from "./rbac";
import { redirect } from "next/navigation";
import crypto from "crypto";
import { getSessionSettings } from "./session-settings";
import { AsyncLocalStorage } from "async_hooks";

export const SESSION_COOKIE_NAME = "session_token";

const sessionTokenStorage = new AsyncLocalStorage<string>();

export function runWithSessionToken<T>(token: string, fn: () => T): T {
  return sessionTokenStorage.run(token, fn);
}

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Create a new server-side session.
 * Enforces configured maximum active sessions per user using atomic transaction.
 * Revokes oldest active session if limit reached.
 * Cookie has no maxAge so it expires when browser closes.
 */
export async function createSession(userId: string) {
  const settings = await getSessionSettings();
  const maxSessions = settings.maxActiveSessions;
  const idleTimeoutMs = settings.idleTimeoutMinutes * 60 * 1000;
  const now = new Date();
  const idleThreshold = new Date(now.getTime() - idleTimeoutMs);

  const token = generateToken();

  await prisma.$transaction(async (tx) => {
    // 1. Delete idle-expired sessions for this user
    await tx.session.deleteMany({
      where: {
        userId,
        lastActivity: { lt: idleThreshold },
      },
    });

    // 2. Query remaining active sessions for this user
    const activeSessions = await tx.session.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    // 3. If at or above maxSessions, revoke oldest to make room for new session
    if (activeSessions.length >= maxSessions) {
      const excessCount = activeSessions.length - maxSessions + 1;
      const toDelete = activeSessions.slice(0, excessCount).map((s) => s.id);
      await tx.session.deleteMany({
        where: { id: { in: toDelete } },
      });
    }

    // 4. Create new session
    await tx.session.create({
      data: {
        token,
        userId,
        lastActivity: now,
      },
    });

    // 5. Record user last login time
    await tx.user.update({
      where: { id: userId },
      data: { lastLoginAt: now },
    });
  });

  try {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      // No maxAge — cookie expires when browser closes
      path: "/",
    });
  } catch {
    // Graceful fallback when invoked outside HTTP request context (e.g. tests or scripts)
  }

  return token;
}

export function formatRoleName(roleName: string): string {
  if (!roleName) return "User";
  if (roleName === "SUPER_ADMIN") return "Super Admin";
  if (roleName === "ADMIN") return "Admin";
  if (roleName === "MANAGER") return "Manager";
  if (roleName === "CASHIER") return "Cashier";
  if (roleName === "INVENTORY" || roleName === "INVENTORY_STAFF") return "Inventory";
  if (roleName === "PURCHASING") return "Purchasing";
  if (roleName === "WAREHOUSE") return "Warehouse";
  if (roleName === "ACCOUNTANT") return "Accountant";
  if (roleName === "AUDITOR") return "Auditor";
  return roleName
    .split(/[_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Get current session. Validates token exists in DB and is not idle-expired.
 * Updates lastActivity on every valid access.
 */
export async function getSession(tokenOverride?: string) {
  let token = tokenOverride || sessionTokenStorage.getStore();
  if (!token) {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    } catch {
      return null;
    }
  }

  if (!token) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          status: true,
          mustChangePassword: true,
          inactiveFrom: true,
          inactiveUntil: true,
          userRoles: {
            include: {
              role: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!session) {
    // Token not found in DB — stale session
    return null;
  }

  // Check idle timeout
  const settings = await getSessionSettings();
  const idleTimeoutSeconds = settings.idleTimeoutMinutes * 60;
  const now = new Date();
  const elapsed = (now.getTime() - session.lastActivity.getTime()) / 1000;

  if (elapsed > idleTimeoutSeconds) {
    // Session expired — delete from DB
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }

  // Update lastActivity (touch session)
  await prisma.session.update({
    where: { id: session.id },
    data: { lastActivity: now },
  });

  const user = session.user;
  const primaryRole = user.userRoles[0]?.role.name;
  const isSuperAdmin = user.userRoles.some((ur) => ur.role.name === "SUPER_ADMIN");
  return user
    ? {
        ...user,
        name: `${user.firstName} ${user.lastName}`,
        roleName: primaryRole ? formatRoleName(primaryRole) : "User",
        rawRole: primaryRole || "USER",
        isSuperAdmin,
      }
    : null;
}

export async function getSessionWithPermissions() {
  const user = await getSession();

  if (!user) {
    return null;
  }

  const permissions = await getUserPermissions(user.id);

  return {
    ...user,
    permissions,
  };
}

/**
 * Delete current session from DB and clear cookie.
 */
export async function deleteSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (sessionCookie?.value) {
    await prisma.session.deleteMany({
      where: { token: sessionCookie.value },
    });
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Delete all sessions for a specific user (force logout everywhere).
 */
export async function deleteAllUserSessions(userId: string) {
  await prisma.session.deleteMany({
    where: { userId },
  });
}

/**
 * Check if user must change password. If so, redirect to /change-password.
 */
export async function requirePasswordChanged() {
  const session = await getSession();
  if (session?.mustChangePassword) {
    redirect("/change-password");
  }
  return session;
}
