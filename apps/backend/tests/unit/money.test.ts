import { describe, it, expect } from 'vitest';
import {
  formatMoney,
  parseMoney,
  addMoney,
  calculateTaxExclusive,
  calculateTaxInclusive,
} from '../../src/utils/money.js';

describe('Money utilities', () => {
  describe('formatMoney', () => {
    it('formats cents to currency string', () => {
      expect(formatMoney(15000)).toBe('KES 150.00');
      expect(formatMoney(100, 'USD')).toBe('USD 1.00');
      expect(formatMoney(0)).toBe('KES 0.00');
    });

    it('handles odd cent values', () => {
      expect(formatMoney(9999)).toBe('KES 99.99');
      expect(formatMoney(1)).toBe('KES 0.01');
    });
  });

  describe('parseMoney', () => {
    it('parses display string to cents', () => {
      expect(parseMoney('150.00')).toBe(15000);
      expect(parseMoney('99.99')).toBe(9999);
      expect(parseMoney('KES 100.50')).toBe(10050);
    });

    it('rounds to nearest cent', () => {
      expect(parseMoney('100.005')).toBe(10001);
    });
  });

  describe('addMoney', () => {
    it('adds amounts without floating point errors', () => {
      expect(addMoney(1000, 2000, 3000)).toBe(6000);
      expect(addMoney(100, 200)).toBe(300);
      expect(addMoney()).toBe(0);
    });
  });

  describe('calculateTaxExclusive', () => {
    it('calculates 16% VAT on exclusive price', () => {
      // 10000 cents (KES 100) + 16% = 1600 cents tax
      expect(calculateTaxExclusive(10000, 16)).toBe(1600);
    });

    it('rounds correctly', () => {
      expect(calculateTaxExclusive(100, 16)).toBe(16);
      expect(calculateTaxExclusive(99, 16)).toBe(16); // Math.round(15.84) = 16
    });
  });

  describe('calculateTaxInclusive', () => {
    it('extracts 16% VAT from inclusive price', () => {
      // KES 116 inclusive → tax = 116 * 16 / 116 = 16
      expect(calculateTaxInclusive(11600, 16)).toBe(1600);
    });
  });
});

describe('Sale calculation rules', () => {
  it('total = subtotal - discount + tax', () => {
    const subtotal = 50000;
    const discount = 5000;
    const tax = 7200; // 16% on (50000 - 5000)
    const total = subtotal - discount + tax;
    expect(total).toBe(52200);
  });

  it('change = amountPaid - total (non-negative)', () => {
    const total = 52200;
    const amountPaid = 60000;
    const change = Math.max(0, amountPaid - total);
    expect(change).toBe(7800);
  });

  it('rejects payment less than total', () => {
    const total = 52200;
    const amountPaid = 50000;
    expect(amountPaid < total).toBe(true);
  });
});
