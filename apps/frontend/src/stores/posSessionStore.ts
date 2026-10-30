/**
 * POS session store — tracks active branch, register, and shift.
 * The POS requires these to be set before completing a sale.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface POSSession {
  branchId: string | null;
  branchName: string | null;
  registerId: string | null;
  registerName: string | null;
  shiftId: string | null;
  isOpen: boolean;

  setSession: (data: {
    branchId: string;
    branchName: string;
    registerId: string;
    registerName: string;
    shiftId: string;
  }) => void;
  clearSession: () => void;
}

export const usePOSSessionStore = create<POSSession>()(
  persist(
    (set) => ({
      branchId: null,
      branchName: null,
      registerId: null,
      registerName: null,
      shiftId: null,
      isOpen: false,

      setSession: ({ branchId, branchName, registerId, registerName, shiftId }) =>
        set({ branchId, branchName, registerId, registerName, shiftId, isOpen: true }),

      clearSession: () =>
        set({ branchId: null, branchName: null, registerId: null, registerName: null, shiftId: null, isOpen: false }),
    }),
    {
      name: 'tally-pos-session',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
