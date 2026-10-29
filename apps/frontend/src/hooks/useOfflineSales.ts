import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../lib/rxdb/database';
import { enqueueOperation } from '../lib/rxdb/outbox';
import { useAuthStore } from '../stores/authStore';
import type { CartItem } from '@tally/shared-types';

interface SalePayload {
  branchId: string;
  registerId: string;
  shiftId: string;
  customerId?: string;
  items: CartItem[];
  payments: Array<{ method: string; amount: number }>;
  notes?: string;
}

/**
 * Hook for completing a sale offline-first.
 * Writes to RxDB BEFORE returning success.
 * When online, the outbox processor syncs to the server.
 * When offline, the sale is safely stored locally and will sync on reconnect.
 */
export function useOfflineSales() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const user = useAuthStore((s) => s.user);
  const organization = useAuthStore((s) => s.organization);

  const completeSale = useCallback(
    async (payload: SalePayload): Promise<{ offlineId: string; receiptNumber: string }> => {
      if (!user || !organization) throw new Error('Not authenticated');

      setIsProcessing(true);
      setError(null);

      try {
        const offlineId = uuidv4();
        const deviceId = localStorage.getItem('tally-device-id') ?? 'unknown';
        const clientTimestamp = new Date().toISOString();

        const subtotal = payload.items.reduce((s, i) => s + i.lineTotal, 0);
        const taxAmount = payload.items.reduce((s, i) => s + i.taxAmount, 0);
        const discountAmount = payload.items.reduce((s, i) => s + i.discountAmount, 0);
        const total = subtotal + taxAmount;
        const amountPaid = payload.payments.reduce((s, p) => s + p.amount, 0);
        const change = Math.max(0, amountPaid - total);

        // Generate a local receipt number (will be replaced by server receipt number on sync)
        const now = new Date();
        const receiptNumber = `LOCAL-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Date.now().toString().slice(-6)}`;

        const db = await getDatabase();

        // 1. Write to RxDB FIRST — this is the durable local record
        await db.local_sales.insert({
          id: offlineId,
          organizationId: organization.id,
          branchId: payload.branchId,
          registerId: payload.registerId,
          shiftId: payload.shiftId,
          customerId: payload.customerId,
          cashierId: user.id,
          items: payload.items,
          payments: payload.payments,
          subtotal,
          discountAmount,
          taxAmount,
          total,
          amountPaid,
          change,
          notes: payload.notes,
          receiptNumber,
          status: 'local',
          offlineId,
          deviceId,
          clientTimestamp,
          createdAt: clientTimestamp,
          updatedAt: clientTimestamp,
        });

        // 2. Add to outbox for server sync
        await enqueueOperation('SALE_COMPLETED', {
          offlineId,
          organizationId: organization.id,
          branchId: payload.branchId,
          registerId: payload.registerId,
          shiftId: payload.shiftId,
          customerId: payload.customerId,
          items: payload.items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            quantity: i.quantity,
            discountAmount: i.discountAmount,
          })),
          payments: payload.payments,
          notes: payload.notes,
          deviceId,
          clientTimestamp,
        });

        return { offlineId, receiptNumber };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to record sale';
        setError(msg);
        throw err;
      } finally {
        setIsProcessing(false);
      }
    },
    [user, organization],
  );

  return { completeSale, isProcessing, error };
}
