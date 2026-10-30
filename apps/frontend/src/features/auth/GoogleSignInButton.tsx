import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../../lib/api';
import { getOrCreateDeviceId } from '../../lib/utils';
import type { LoginResponse } from '@tally/shared-types';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          renderButton: (element: HTMLElement, options: Record<string, string>) => void;
        };
      };
    };
  }
}

interface GoogleSignInButtonProps {
  onSuccess: (response: GoogleSignInResult) => void;
}

export interface GoogleSignInResult extends Omit<LoginResponse, 'organization'> {
  organization: LoginResponse['organization'] & { onboardingStatus?: string };
  needsOnboarding: boolean;
}

export function GoogleSignInButton({ onSuccess }: GoogleSignInButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  useEffect(() => {
    if (!clientId || !buttonRef.current) return;

    let cancelled = false;
    const renderButton = () => {
      if (cancelled || !buttonRef.current || !window.google) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async ({ credential }) => {
          if (!credential || cancelled) return;
          setError(null);
          setIsSubmitting(true);
          try {
            const response = await api.post<GoogleSignInResult>('/auth/google', {
              idToken: credential,
              deviceId: getOrCreateDeviceId(),
              deviceType: 'web',
            });
            onSuccess(response);
          } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Google sign-in failed. Please try again.');
          } finally {
            setIsSubmitting(false);
          }
        },
      });
      window.google.accounts.id.renderButton(buttonRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        width: '360',
      });
    };

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]',
    );
    if (window.google) {
      renderButton();
    } else if (existingScript) {
      existingScript.addEventListener('load', renderButton, { once: true });
    } else {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = renderButton;
      script.onerror = () => setError('Google Sign-In could not load. Check your internet connection.');
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      existingScript?.removeEventListener('load', renderButton);
    };
  }, [clientId, onSuccess]);

  if (!clientId) {
    return (
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Google Sign-In needs VITE_GOOGLE_CLIENT_ID in apps/frontend/.env.
      </p>
    );
  }

  return (
    <div className="mt-5">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or continue with
        <span className="h-px flex-1 bg-border" />
      </div>
      <div className="mt-4 flex justify-center" ref={buttonRef} />
      {isSubmitting && <p className="mt-2 text-center text-xs text-muted-foreground">Signing in...</p>}
      {error && <p role="alert" className="mt-2 text-center text-xs text-destructive">{error}</p>}
    </div>
  );
}
