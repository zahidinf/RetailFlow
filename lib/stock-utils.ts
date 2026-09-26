export type StockStatusType = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

export function getStockStatus(currentStock: number, minimumStock: number): StockStatusType {
  if (currentStock <= 0) {
    return "OUT_OF_STOCK";
  }
  if (currentStock <= minimumStock) {
    return "LOW_STOCK";
  }
  return "IN_STOCK";
}

export function formatStockStatus(status: StockStatusType): string {
  switch (status) {
    case "IN_STOCK":
      return "IN STOCK";
    case "LOW_STOCK":
      return "LOW STOCK";
    case "OUT_OF_STOCK":
      return "OUT OF STOCK";
  }
}

export interface StockStatusBadgeStyles {
  badge: string;
  dot: string;
  label: string;
}

export function getStockStatusBadgeStyles(status: StockStatusType): StockStatusBadgeStyles {
  switch (status) {
    case "IN_STOCK":
      return {
        badge: "bg-green-50 dark:bg-green-950/60 text-green-700 dark:text-green-300 border-green-200/60 dark:border-green-800/60",
        dot: "bg-green-600 dark:bg-green-400",
        label: "IN STOCK",
      };
    case "LOW_STOCK":
      return {
        badge: "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/60",
        dot: "bg-amber-600 dark:bg-amber-400",
        label: "LOW STOCK",
      };
    case "OUT_OF_STOCK":
      return {
        badge: "bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200/60 dark:border-red-800/60",
        dot: "bg-red-600 dark:bg-red-400",
        label: "OUT OF STOCK",
      };
  }
}
