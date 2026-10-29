import { useEffect, useRef } from 'react';
import { useSyncStore } from '../stores/syncStore';
import { useAuthStore } from '../stores/authStore';
import { getDatabase } from '../lib/rxdb/database';
import { pullFromServer, scheduleProcessor } from '../lib/rxdb/outbox';

/**
 * Mount this hook once in the authenticated app shell.
 * Initialises RxDB, runs an initial pull, then kicks the outbox processor.
 * Reconnects automatically when going back online.
 */
export function useSync() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isOnline = useSyncStore((s) => s.isOnline);
  const setStatus = useSyncStore((s) => s.setStatus);
  const initialised = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (initialised.current) return;
    initialised.current = true;

    void (async () => {
      try {
        // Warm up IndexedDB
        await getDatabase();

        if (isOnline) {
          // Pull latest products/categories from server
          setStatus('syncing');
          await pullFromServer(['products', 'categories']);
          // Process any queued outbox items from a previous offline session
          scheduleProcessor(1_000);
        }
      } catch (err) {
        console.warn('[useSync] Init error:', err);
        setStatus('error');
      }
    })();
  }, [isAuthenticated]);

  // When coming back online: pull then flush outbox
  useEffect(() => {
    if (!isAuthenticated || !isOnline) return;

    void pullFromServer(['products', 'categories']).then(() => {
      scheduleProcessor(500);
    });
  }, [isOnline, isAuthenticated]);
}
