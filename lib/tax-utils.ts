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
 * Generates practical, rounded payment amount suggestions above the Grand Total.
 * Examples for Grand Total:
 * - Exact Grand Total (e.g. Rp 52.500)
 * - Next round 10.000 / 20.000 / 50.000 / 100.000 denominations
 */
export function generatePaymentSuggestions(grandTotal: number): number[] {
  const total = Math.round(grandTotal);
  if (total <= 0) return [];

  const suggestions = new Set<number>();

  // 1. Exact amount is always the first suggestion
  suggestions.add(total);

  // Determine appropriate rounding increments based on size of total
  const candidates: number[] = [];

  // Round up to nearest 5.000 if total > 5.000
  if (total % 5000 !== 0) {
    candidates.push(Math.ceil(total / 5000) * 5000);
  }

  // Round up to nearest 10.000
  if (total % 10000 !== 0 || total < 10000) {
    candidates.push(Math.ceil(total / 10000) * 10000);
  }

  // Round up to nearest 20.000
  candidates.push(Math.ceil(total / 20000) * 20000);

  // Round up to nearest 50.000
  candidates.push(Math.ceil(total / 50000) * 50000);

  // Round up to nearest 100.000
  candidates.push(Math.ceil(total / 100000) * 100000);

  // Indonesian bank notes: 10k, 20k, 50k, 100k, multiple 100k
  const bankNotes = [10000, 20000, 50000, 100000, 200000, 300000, 500000];
  for (const note of bankNotes) {
    if (note >= total) {
      candidates.push(note);
    }
  }

  // Add next round multiplier if total is large
  if (total > 100000) {
    const nextHundred = Math.ceil(total / 100000) * 100000;
    candidates.push(nextHundred);
    candidates.push(nextHundred + 50000);
    candidates.push(nextHundred + 100000);
  }

  // Sort and pick clean suggestions strictly > total (plus the exact total already added)
  const sortedAbove = Array.from(new Set(candidates))
    .filter((amt) => amt > total)
    .sort((a, b) => a - b);

  for (const amt of sortedAbove) {
    suggestions.add(amt);
    if (suggestions.size >= 5) break; // Max 5 suggestion chips
  }

  return Array.from(suggestions);
}
