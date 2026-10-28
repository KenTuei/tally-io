import { z } from 'zod';

/** Integer monetary amount (smallest currency unit, e.g. KES cents × 100). Never a float. */
export const moneySchema = z
  .number()
  .int('Monetary amounts must be integers (smallest currency unit)')
  .nonnegative('Monetary amounts cannot be negative')
  .max(999_999_99999, 'Monetary amount is too large');

/** Monetary amount that can be zero or negative (for adjustments) */
export const signedMoneySchema = z
  .number()
  .int('Monetary amounts must be integers (smallest currency unit)')
  .min(-999_999_99999)
  .max(999_999_99999);

/** Format cents to display string: 15000 → "KES 150.00" */
export function formatMoney(cents: number, currency = 'KES'): string {
  const amount = cents / 100;
  return `${currency} ${amount.toFixed(2)}`;
}

/** Parse display string to cents: "150.50" → 15050 */
export function parseMoney(display: string): number {
  const cleaned = display.replace(/[^0-9.]/g, '');
  const float = parseFloat(cleaned);
  if (isNaN(float)) throw new Error(`Cannot parse monetary value: ${display}`);
  return Math.round(float * 100);
}

/** Safe addition of money amounts */
export function addMoney(...amounts: number[]): number {
  return amounts.reduce((sum, a) => sum + a, 0);
}

/** Calculate tax amount from price (exclusive) */
export function calculateTaxExclusive(priceExcl: number, ratePercent: number): number {
  return Math.round(priceExcl * ratePercent / 100);
}

/** Calculate tax amount from price (inclusive) */
export function calculateTaxInclusive(priceIncl: number, ratePercent: number): number {
  return Math.round(priceIncl * ratePercent / (100 + ratePercent));
}
