import { prisma } from "./prisma";
import { ParameterStatus } from "@prisma/client";
import {
  isValidProductUnit,
  isValidTimeUnit,
  getParameterUnitType,
  convertTimeToHours,
} from "./units";

export const PARAM_REFUND_VALIDITY_PERIOD = "REFUND_VALIDITY_PERIOD";

export interface ParameterSettingData {
  id: string;
  code: string;
  name: string;
  value: string;
  unit: string | null;
  description: string | null;
  status: ParameterStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpsertParameterInput {
  code: string;
  name: string;
  value: string;
  unit?: string | null;
  description?: string | null;
  status?: ParameterStatus;
}

/**
 * Validate parameter values according to code-specific business rules.
 */
export function validateParameterInput(
  code: string,
  value: string,
  unit?: string | null,
  existingUnit?: string | null
): string | null {
  const trimmedCode = code.trim().toUpperCase();
  const trimmedValue = value.trim();

  if (!trimmedCode) {
    return "Parameter Code is required";
  }

  if (!trimmedValue) {
    return "Parameter Value is required";
  }

  const unitType = getParameterUnitType(trimmedCode);

  if (trimmedCode === PARAM_REFUND_VALIDITY_PERIOD) {
    const num = Number(trimmedValue);
    if (isNaN(num)) {
      return "Refund Validity Period must be a numeric value";
    }
    if (num <= 0) {
      return "Refund Validity Period must be greater than zero";
    }
  }

  if (unitType === "TIME") {
    if (trimmedCode === PARAM_REFUND_VALIDITY_PERIOD && (!unit || unit.trim() === "")) {
      return "Time Unit is required for Refund Validity Period";
    }
    if (unit && unit.trim() !== "") {
      const trimmedUnit = unit.trim();
      if (!isValidTimeUnit(trimmedUnit)) {
        return "Invalid unit for Refund Validity Period. Must be a Time Unit (seconds, minutes, hours, days)";
      }
    }
    return null;
  }

  if (unit && unit.trim() !== "") {
    const trimmedUnit = unit.trim();
    const matchesExisting =
      existingUnit !== undefined &&
      existingUnit !== null &&
      trimmedUnit.toLowerCase() === existingUnit.trim().toLowerCase();

    if (!isValidProductUnit(trimmedUnit) && !isValidTimeUnit(trimmedUnit) && !matchesExisting) {
      return "Unit must be selected from the valid master units";
    }
  }

  return null;
}

/**
 * Ensure default system parameter settings exist in database.
 */
export async function ensureDefaultParameterSettings(): Promise<void> {
  await prisma.parameterSetting.upsert({
    where: { code: PARAM_REFUND_VALIDITY_PERIOD },
    update: {},
    create: {
      code: PARAM_REFUND_VALIDITY_PERIOD,
      name: "Refund Validity Period",
      value: "24",
      unit: "Hours",
      description: "Maximum number of hours after transaction creation during which a transaction can be refunded.",
      status: ParameterStatus.ACTIVE,
    },
  });
}

/**
 * Retrieve all parameter settings with optional search/filter.
 */
export async function getParameterSettings(search?: string, status?: string): Promise<ParameterSettingData[]> {
  await ensureDefaultParameterSettings();

  const where: any = {};
  if (search && search.trim()) {
    const term = search.trim();
    where.OR = [
      { code: { contains: term, mode: "insensitive" } },
      { name: { contains: term, mode: "insensitive" } },
      { description: { contains: term, mode: "insensitive" } },
    ];
  }

  if (status && (status === "ACTIVE" || status === "INACTIVE")) {
    where.status = status as ParameterStatus;
  }

  return await prisma.parameterSetting.findMany({
    where,
    orderBy: { code: "asc" },
  });
}

/**
 * Retrieve a single parameter setting by code.
 */
export async function getParameterSettingByCode(code: string): Promise<ParameterSettingData | null> {
  await ensureDefaultParameterSettings();

  return await prisma.parameterSetting.findUnique({
    where: { code: code.trim().toUpperCase() },
  });
}

/**
 * Retrieve refund validity period in hours from Parameter Settings.
 * Fails safely if missing or invalid; never silently falls back to a hardcoded value.
 */
export async function getRefundValidityPeriodHours(): Promise<number> {
  const setting = await getParameterSettingByCode(PARAM_REFUND_VALIDITY_PERIOD);

  if (!setting) {
    throw new Error(
      `Configuration error: Parameter "${PARAM_REFUND_VALIDITY_PERIOD}" is missing from Parameter Settings.`
    );
  }

  if (setting.status !== ParameterStatus.ACTIVE) {
    throw new Error(
      `Configuration error: Parameter "${PARAM_REFUND_VALIDITY_PERIOD}" is inactive. Refunds are currently disabled.`
    );
  }

  const raw = Number(setting.value);
  if (isNaN(raw) || raw <= 0) {
    throw new Error(
      `Configuration error: Parameter "${PARAM_REFUND_VALIDITY_PERIOD}" has invalid non-positive value "${setting.value}".`
    );
  }

  return convertTimeToHours(raw, setting.unit);
}
