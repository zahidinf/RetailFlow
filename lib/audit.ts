import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { headers } from "next/headers";
import { Prisma } from "@prisma/client";

export type AuditAction = "CREATE" | "UPDATE" | "DELETE" | string;
export type AuditModule = "Administration" | "Product Management" | "Purchasing" | string;

export interface CreateAuditLogParams {
  userId?: string | null;
  username?: string | null;
  action: AuditAction;
  module: AuditModule;
  entity: string;
  recordId?: string | null;
  recordIdentifier?: string | null;
  description?: string | null;
  previousValue?: Record<string, any> | null;
  newValue?: Record<string, any> | null;
  status?: "SUCCESS" | "FAILED" | string;
  details?: Record<string, any> | string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  tx?: Prisma.TransactionClient;
}

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /apiKey/i,
  /api_key/i,
  /authorization/i,
  /cookie/i,
  /hash/i,
];

/**
 * Recursively sanitize objects to redact sensitive data (passwords, tokens, keys).
 */
export function sanitizeAuditData(data: any): any {
  if (data === null || data === undefined) {
    return null;
  }

  // Primitive types
  if (typeof data !== "object") {
    return data;
  }

  // Dates
  if (data instanceof Date) {
    return data.toISOString();
  }

  // Prisma Decimal or custom objects with toNumber
  if (typeof data.toNumber === "function") {
    return data.toNumber();
  }

  // Arrays
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeAuditData(item));
  }

  // Plain objects
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    const isSensitive = SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
    if (isSensitive) {
      sanitized[key] = "[REDACTED]";
    } else {
      sanitized[key] = sanitizeAuditData(value);
    }
  }

  return sanitized;
}

/**
 * Safely extracts client IP and User-Agent from next/headers if called in a request context.
 */
export async function getClientRequestContext(): Promise<{
  ipAddress: string | null;
  userAgent: string | null;
}> {
  try {
    const headerList = await headers();
    const forwardedFor = headerList.get("x-forwarded-for");
    const realIp = headerList.get("x-real-ip");
    const ipAddress = forwardedFor ? forwardedFor.split(",")[0].trim() : realIp || null;
    const userAgent = headerList.get("user-agent") || null;
    return { ipAddress, userAgent };
  } catch {
    return { ipAddress: null, userAgent: null };
  }
}

/**
 * Safely extracts authenticated user context.
 */
export async function getAuthenticatedUserContext(): Promise<{
  userId: string | null;
  username: string | null;
}> {
  try {
    const session = await getSession();
    if (!session) {
      return { userId: null, username: null };
    }
    const fullName = `${session.firstName || ""} ${session.lastName || ""}`.trim();
    const username = fullName ? `${fullName} (${session.email})` : session.email || session.id;
    return {
      userId: session.id,
      username,
    };
  } catch {
    return { userId: null, username: null };
  }
}

/**
 * Computes changed fields between previous and new snapshots.
 */
export function computeFieldDiff(
  before: Record<string, any> | null | undefined,
  after: Record<string, any> | null | undefined
): Record<string, { before: any; after: any }> {
  const diff: Record<string, { before: any; after: any }> = {};
  if (!before && !after) return diff;

  const b = before || {};
  const a = after || {};
  const allKeys = Array.from(new Set([...Object.keys(b), ...Object.keys(a)]));

  for (const key of allKeys) {
    const valBefore = b[key];
    const valAfter = a[key];
    // Simple comparison
    const strBefore = JSON.stringify(valBefore);
    const strAfter = JSON.stringify(valAfter);
    if (strBefore !== strAfter) {
      diff[key] = {
        before: valBefore === undefined ? null : valBefore,
        after: valAfter === undefined ? null : valAfter,
      };
    }
  }

  return diff;
}

/**
 * Authoritative backend function to create an audit log record.
 * Supports transactional execution when tx is passed.
 */
export async function recordAuditLog(params: CreateAuditLogParams) {
  // Resolve user info if not provided
  let userId = params.userId;
  let username = params.username;

  if (!userId || !username) {
    const authCtx = await getAuthenticatedUserContext();
    if (!userId) userId = authCtx.userId;
    if (!username) username = authCtx.username;
  }

  // If userId exists but username is missing, fetch user details
  if (userId && !username) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true, email: true },
      });
      if (user) {
        const fullName = `${user.firstName} ${user.lastName}`.trim();
        username = fullName ? `${fullName} (${user.email})` : user.email;
      }
    } catch {
      // Continue with null username
    }
  }

  // Resolve request network metadata if not provided
  let ipAddress = params.ipAddress ?? null;
  let userAgent = params.userAgent ?? null;
  if (!ipAddress || !userAgent) {
    const reqCtx = await getClientRequestContext();
    if (!ipAddress) ipAddress = reqCtx.ipAddress;
    if (!userAgent) userAgent = reqCtx.userAgent;
  }

  // Sanitize snapshots
  const sanitizedBefore = params.previousValue !== undefined ? sanitizeAuditData(params.previousValue) : null;
  const sanitizedAfter = params.newValue !== undefined ? sanitizeAuditData(params.newValue) : null;

  // Generate readable description if missing
  let description = params.description;
  if (!description) {
    const target = params.recordIdentifier
      ? `"${params.recordIdentifier}"`
      : params.recordId
      ? `ID: ${params.recordId}`
      : "";
    description = `${params.action} ${params.entity} ${target}`.trim();
  }

  // Format details column for backward compatibility
  let detailsStr: string | null = null;
  if (params.details) {
    detailsStr = typeof params.details === "string" ? params.details : JSON.stringify(params.details);
  } else if (sanitizedBefore || sanitizedAfter) {
    detailsStr = JSON.stringify({
      previousValue: sanitizedBefore,
      newValue: sanitizedAfter,
      identifier: params.recordIdentifier,
    });
  }

  const client = params.tx || prisma;

  return await client.auditLog.create({
    data: {
      userId: userId || null,
      username: username || null,
      action: params.action,
      module: params.module,
      entity: params.entity,
      recordId: params.recordId || null,
      recordIdentifier: params.recordIdentifier || null,
      description,
      previousValue: sanitizedBefore ?? Prisma.DbNull,
      newValue: sanitizedAfter ?? Prisma.DbNull,
      status: params.status || "SUCCESS",
      ipAddress,
      userAgent,
      details: detailsStr,
    },
  });
}
