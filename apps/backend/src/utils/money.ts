/** Format cents to display string: 15000 → "KES 150.00" */
export function formatMoney(cents: number, currency = 'KES'): string {
  return `${currency} ${(cents / 100).toFixed(2)}`;
}

/** Parse display string to cents: "KES 150.50" → 15050 */
export function parseMoney(display: string): number {
  const cleaned = display.replace(/[^0-9.]/g, '');
  const float = parseFloat(cleaned);
  if (isNaN(float)) throw new Error(`Cannot parse monetary value: ${display}`);
  return Math.round(float * 100);
}

/** Safe integer addition of money amounts */
export function addMoney(...amounts: number[]): number {
  return amounts.reduce((sum, a) => sum + a, 0);
}

/** Tax on exclusive price */
export function calculateTaxExclusive(priceExcl: number, ratePercent: number): number {
  return Math.round((priceExcl * ratePercent) / 100);
}

/** Extract tax from inclusive price */
export function calculateTaxInclusive(priceIncl: number, ratePercent: number): number {
  return Math.round((priceIncl * ratePercent) / (100 + ratePercent));
}
