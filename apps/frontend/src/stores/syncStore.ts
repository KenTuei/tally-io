import { create } from 'zustand';
import type { SyncStatus } from '@tally/shared-types';

interface SyncState {
  status: SyncStatus;
  lastSyncedAt: string | null;
  pendingCount: number;
  failedCount: number;
  conflictCount: number;
  isOnline: boolean;

  setStatus: (status: SyncStatus) => void;
  setOnline: (online: boolean) => void;
  setPendingCount: (count: number) => void;
  setLastSyncedAt: (time: string) => void;
  incrementFailed: () => void;
  incrementConflict: () => void;
  resetCounts: () => void;
}

export const useSyncStore = create<SyncState>()((set) => ({
  status: 'synced',
  lastSyncedAt: null,
  pendingCount: 0,
  failedCount: 0,
  conflictCount: 0,
  isOnline: navigator.onLine,

  setStatus: (status) => set({ status }),
  setOnline: (isOnline) => set({ isOnline }),
  setPendingCount: (pendingCount) => set({ pendingCount }),
  setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),
  incrementFailed: () => set((s) => ({ failedCount: s.failedCount + 1 })),
  incrementConflict: () => set((s) => ({ conflictCount: s.conflictCount + 1 })),
  resetCounts: () => set({ pendingCount: 0, failedCount: 0, conflictCount: 0 }),
}));

// Set up online/offline listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useSyncStore.getState().setOnline(true);
    useSyncStore.getState().setStatus('syncing');
  });

  window.addEventListener('offline', () => {
    useSyncStore.getState().setOnline(false);
    useSyncStore.getState().setStatus('offline');
  });
}
