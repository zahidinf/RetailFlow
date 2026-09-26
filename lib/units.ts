import { ProductUnit } from "@prisma/client";

export type UnitType = "PRODUCT" | "TIME";

export interface MasterUnitOption {
  value: string;
  label: string;
  type?: UnitType;
}

export interface TimeUnitOption {
  code: string;
  name: string;
}

export interface ProductUnitOption {
  code: ProductUnit;
  name: string;
}

/**
 * Logical Time Unit Master
 * Exclusively used by time-based configuration (e.g. Refund Validity Period, timeouts, session settings).
 */
export const TIME_UNITS: readonly TimeUnitOption[] = [
  { code: "seconds", name: "Seconds" },
  { code: "minutes", name: "Minutes" },
  { code: "hours", name: "Hours" },
  { code: "days", name: "Days" },
] as const;

/**
 * Logical Product Unit Master
 * Exclusively used by Product Management (inventory, stock, catalog).
 * Explicitly does not include any time units.
 */
export const PRODUCT_UNITS: readonly ProductUnitOption[] = [
  { code: ProductUnit.PCS, name: "Pieces (PCS)" },
  { code: ProductUnit.BOX, name: "Box (BOX)" },
  { code: ProductUnit.PACK, name: "Pack (PACK)" },
  { code: ProductUnit.KG, name: "Kilogram (KG)" },
  { code: ProductUnit.LITER, name: "Liter (LITER)" },
  { code: ProductUnit.BOTTLE, name: "Bottle (BOTTLE)" },
  { code: ProductUnit.SET, name: "Set (SET)" },
] as const;

/**
 * Legacy compatibility alias for Product Units.
 */
export const MASTER_UNITS: readonly { value: ProductUnit; label: string }[] = PRODUCT_UNITS.map(
  (u) => ({
    value: u.code,
    label: u.name,
  })
);

const TIME_UNIT_CODES = new Set<string>(TIME_UNITS.map((u) => u.code.toLowerCase()));
const TIME_UNIT_NAMES = new Set<string>(TIME_UNITS.map((u) => u.name.toLowerCase()));
const PRODUCT_UNIT_CODES = new Set<string>(Object.values(ProductUnit).map((u) => u.toUpperCase()));

/**
 * Check if a unit string is a valid Time Unit (matches code or display name, case-insensitive).
 */
export function isValidTimeUnit(unit: string | null | undefined): boolean {
  if (!unit) return false;
  const lower = unit.trim().toLowerCase();
  return TIME_UNIT_CODES.has(lower) || TIME_UNIT_NAMES.has(lower);
}

/**
 * Normalize time unit to its canonical code ('seconds' | 'minutes' | 'hours' | 'days').
 */
export function normalizeTimeUnit(unit: string | null | undefined): string | null {
  if (!unit) return null;
  const lower = unit.trim().toLowerCase();
  const match = TIME_UNITS.find(
    (u) => u.code.toLowerCase() === lower || u.name.toLowerCase() === lower
  );
  return match ? match.code : null;
}

/**
 * Check if a unit is a valid Product Unit (matches ProductUnit enum, case-insensitive).
 * Explicitly rejects Time Units (seconds, minutes, hours, days).
 */
export function isValidProductUnit(unit: string | null | undefined): unit is ProductUnit {
  if (!unit) return false;
  const trimmed = unit.trim();
  if (isValidTimeUnit(trimmed)) {
    return false;
  }
  return PRODUCT_UNIT_CODES.has(trimmed.toUpperCase());
}

/**
 * Legacy alias for checking Product Units.
 */
export function isValidMasterUnit(unit: string | null | undefined): boolean {
  return isValidProductUnit(unit);
}

/**
 * Reusable parameter registry declaring unit type for Parameter Settings.
 * Future parameter settings can declare unitType: "TIME" to automatically
 * use the Time Unit Master.
 */
export interface ParameterUnitDeclaration {
  unitType: UnitType;
}

export const PARAMETER_UNIT_REGISTRY: Record<string, ParameterUnitDeclaration> = {
  REFUND_VALIDITY_PERIOD: { unitType: "TIME" },
};

/**
 * Get the declared unit type for a parameter setting code.
 */
export function getParameterUnitType(code: string | null | undefined): UnitType | null {
  if (!code) return null;
  const decl = PARAMETER_UNIT_REGISTRY[code.trim().toUpperCase()];
  return decl ? decl.unitType : null;
}

/**
 * Convert time duration value to hours based on time unit.
 */
export function convertTimeToHours(value: number, unit?: string | null): number {
  const normUnit = normalizeTimeUnit(unit) || "hours";
  switch (normUnit) {
    case "seconds":
      return value / 3600;
    case "minutes":
      return value / 60;
    case "hours":
      return value;
    case "days":
      return value * 24;
    default:
      return value;
  }
}
