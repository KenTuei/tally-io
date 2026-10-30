import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { UserProfile } from '@tally/shared-types';

interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  organization: {
    id: string;
    name: string;
    businessType: string;
    currency: string;
    country: string;
    onboardingStatus?: 'pending' | 'in_progress' | 'complete';
  } | null;
  accessToken: string | null;
  refreshToken: string | null;

  setAuth: (data: {
    user: UserProfile;
    organization: AuthState['organization'];
    accessToken: string;
    refreshToken: string;
  }) => void;
  clearAuth: () => void;
  setAccessToken: (token: string) => void;
  updateOrganization: (organization: Partial<NonNullable<AuthState['organization']>>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      organization: null,
      accessToken: null,
      refreshToken: null,

      setAuth: ({ user, organization, accessToken, refreshToken }) => {
        set({
          isAuthenticated: true,
          user,
          organization,
          accessToken,
          refreshToken,
        });
      },

      clearAuth: () => {
        set({
          isAuthenticated: false,
          user: null,
          organization: null,
          accessToken: null,
          refreshToken: null,
        });
      },

      setAccessToken: (token) => {
        set({ accessToken: token });
      },

      updateOrganization: (organization) => {
        set((state) => ({
          organization: state.organization ? { ...state.organization, ...organization } : null,
        }));
      },
    }),
    {
      name: 'tally-auth',
      storage: createJSONStorage(() => localStorage),
      // Only persist tokens and user — not computed state
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        organization: state.organization,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    },
  ),
);
