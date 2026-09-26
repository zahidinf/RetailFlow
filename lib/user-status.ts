import { UserStatus } from "@prisma/client";

export interface UserWithStatus {
  status: UserStatus;
  inactiveFrom: Date | null;
  inactiveUntil: Date | null;
}

/**
 * Calculate effective status for a user.
 * Temporary inactive users become ACTIVE after inactiveUntil date passes.
 */
export function getEffectiveUserStatus(
  user: UserWithStatus,
  now: Date = new Date()
): UserStatus {
  if (user.status === "ACTIVE") {
    return "ACTIVE";
  }

  // If permanent inactive (inactiveUntil is null), remain inactive
  if (user.inactiveUntil === null) {
    return "INACTIVE";
  }

  // Temporary inactive: check if period has passed
  // inactiveUntil is exclusive (user becomes active AFTER this date)
  if (now > user.inactiveUntil) {
    return "ACTIVE";
  }

  return "INACTIVE";
}

/**
 * Format inactive period for display
 */
export function formatInactivePeriod(
  user: UserWithStatus,
  now: Date = new Date()
): string | null {
  if (user.status === "ACTIVE") {
    return null;
  }

  if (!user.inactiveFrom) {
    return null;
  }

  if (user.inactiveUntil === null) {
    return "Inactive permanently";
  }

  const effectiveStatus = getEffectiveUserStatus(user, now);
  if (effectiveStatus === "ACTIVE") {
    return null; // Period has passed
  }

  return `Inactive until ${user.inactiveUntil.toLocaleDateString("id-ID")}`;
}
