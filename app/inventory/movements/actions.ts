"use server";

import { getStockMovements, getMovementUsers, StockMovementsFilter } from "@/lib/movements";

export async function fetchStockMovementsAction(filter: StockMovementsFilter = {}) {
  try {
    const movements = await getStockMovements(filter);
    return { success: true, movements };
  } catch (error: any) {
    return { error: error.message || "Failed to load stock movements" };
  }
}

export async function fetchMovementUsersAction() {
  try {
    const users = await getMovementUsers();
    return { success: true, users };
  } catch (error: any) {
    return { error: error.message || "Failed to load users" };
  }
}
