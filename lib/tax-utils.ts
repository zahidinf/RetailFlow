/**
 * Reverse tax calculation utilities for tax-inclusive pricing with PPN 11%.
 * The displayed product price already includes 11% PPN.
 * Pre-tax price = Tax-inclusive price / 1.11
 * PPN 11% = Tax-inclusive price - Pre-tax price
 */

export interface TaxBreakdown {
  totalAmount: number;
  preTaxAmount: number;
  taxAmount: number;
}

export function calculateReverseTax(taxInclusiveAmount: number): TaxBreakdown {
  const totalAmount = Math.round(taxInclusiveAmount);
  const preTaxAmount = Math.round(totalAmount / 1.11);
  const taxAmount = totalAmount - preTaxAmount;

  return {
    totalAmount,
    preTaxAmount,
    taxAmount,
  };
}

export function formatRupiah(amount: number): string {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}
