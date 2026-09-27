/**
 * Reverse tax calculation utilities for tax-inclusive pricing.
 *
 * Configurable Tax Rate:
 * Selling prices are tax-inclusive:
 *   Pre-Tax Amount = Price After Discount / (1 + Tax Rate)
 *   Tax = Price After Discount - Pre-Tax Amount
 *   Total After Tax = Pre-Tax Amount + Tax
 *
 * Configured tax rate defaults to 11% (PPN 0.11), or can be passed dynamically.
 */

const envTaxRate =
  typeof process !== "undefined" &&
  (process.env.NEXT_PUBLIC_TAX_RATE || process.env.TAX_RATE);

export const DEFAULT_TAX_RATE = envTaxRate && !isNaN(Number(envTaxRate)) ? Number(envTaxRate) : 0.11; // 11% PPN default

export interface TaxBreakdown {
  totalAmount: number;
  preTaxAmount: number;
  taxAmount: number;
  taxRate: number;
}

/**
 * Calculates reverse tax from tax-inclusive final amount.
 * Guarantees reconciliation:
 * Total After Tax = preTaxAmount + taxAmount === Math.round(taxInclusiveAmount)
 */
export function calculateReverseTax(
  taxInclusiveAmount: number,
  taxRate: number = DEFAULT_TAX_RATE
): TaxBreakdown {
  const totalAmount = Math.round(taxInclusiveAmount);
  if (totalAmount <= 0) {
    return {
      totalAmount: 0,
      preTaxAmount: 0,
      taxAmount: 0,
      taxRate,
    };
  }

  // Pre-tax price = Price After Discount / (1 + Tax Rate)
  const preTaxAmount = Math.round(totalAmount / (1 + taxRate));
  // Tax = Price After Discount - Pre-Tax Amount
  const taxAmount = totalAmount - preTaxAmount;

  return {
    totalAmount,
    preTaxAmount,
    taxAmount,
    taxRate,
  };
}

/**
 * Formats a currency number in Indonesian Rupiah standard format
 */
export function formatRupiah(amount: number): string {
  return `Rp ${Math.round(amount).toLocaleString("id-ID")}`;
}

/**
 * Computes customer-facing receipt summary with single consolidated Discount:
 *
 *   Normal Price
 *   Discount
 *   Price After Discount
 *   Pre-Tax Amount
 *   Tax
 *   Total After Tax
 *
 * Reconciles strictly:
 *   Price After Discount = Normal Price - Discount
 *   Total After Tax = Pre-Tax Amount + Tax
 *   Total After Tax = Actual Grand Total
 */
export interface ReceiptFinancialSummary {
  normalPrice: number;
  discount: number;
  priceAfterDiscount: number;
  preTaxAmount: number;
  tax: number;
  totalAfterTax: number;
  taxRate: number;
}

export function computeReceiptFinancialSummary(
  items: {
    unitPrice: number;
    quantity: number;
    totalPrice: number;
    discount?: number;
    isFreeReward?: boolean;
    product?: { sellingPrice?: number };
  }[],
  actualTotalAmount: number,
  taxRate: number = DEFAULT_TAX_RATE
): ReceiptFinancialSummary {
  // Compute Normal Price = sum(product.sellingPrice or unitPrice * quantity)
  let normalPrice = 0;
  for (const item of items) {
    const originalSellingPrice =
      item.product?.sellingPrice !== undefined && Number(item.product.sellingPrice) > 0
        ? Number(item.product.sellingPrice)
        : Number(item.unitPrice);

    normalPrice += originalSellingPrice * item.quantity;
  }
  normalPrice = Math.round(normalPrice);

  const priceAfterDiscount = Math.round(actualTotalAmount);
  // Single consolidated discount combining promotions, Buy X Get Y, Tebus Murah, and item discounts
  const discount = Math.max(0, normalPrice - priceAfterDiscount);

  const { preTaxAmount, taxAmount } = calculateReverseTax(priceAfterDiscount, taxRate);

  return {
    normalPrice,
    discount,
    priceAfterDiscount,
    preTaxAmount,
    tax: taxAmount,
    totalAfterTax: priceAfterDiscount,
    taxRate,
  };
}

/**
 * Generates practical, rounded payment amount suggestions equal to or higher than the Grand Total.
 * Suggestions are dynamically calculated using practical currency rounding increments.
 *
 * For example:
 * - Grand Total = Rp 87,500 -> Rp 90,000, Rp 100,000, Rp 110,000
 * - Grand Total = Rp 102,500 -> Rp 105,000, Rp 110,000, Rp 120,000
 * - Grand Total = Rp 100,000 -> Rp 100,000, Rp 110,000, Rp 120,000
 */
export function generatePaymentSuggestions(grandTotal: number): number[] {
  const total = Math.round(grandTotal);
  if (total <= 0) return [];

  const candidates = new Set<number>();

  // If total is already a practical round denomination (multiple of 5,000 or 10,000), it can be a suggestion
  if (total % 5000 === 0) {
    candidates.add(total);
  }

  // Next round 5.000 increment
  candidates.add(Math.ceil(total / 5000) * 5000);

  // Next round 10.000 increment
  candidates.add(Math.ceil(total / 10000) * 10000);

  // Next round 20.000 increment
  candidates.add(Math.ceil(total / 20000) * 20000);

  // Next round 50.000 increment
  candidates.add(Math.ceil(total / 50000) * 50000);

  // Next round 100.000 increment
  candidates.add(Math.ceil(total / 100000) * 100000);

  // Common stepping bills above nearest 10k/50k
  const base10k = Math.ceil(total / 10000) * 10000;
  candidates.add(base10k + 10000);
  candidates.add(base10k + 20000);

  if (total >= 100000) {
    const base50k = Math.ceil(total / 50000) * 50000;
    candidates.add(base50k + 50000);
    const base100k = Math.ceil(total / 100000) * 100000;
    candidates.add(base100k + 50000);
    candidates.add(base100k + 100000);
  }

  // Filter only practical rounded amounts >= total
  const sorted = Array.from(candidates)
    .filter((amt) => amt >= total)
    .sort((a, b) => a - b);

  return sorted.slice(0, 4);
}
