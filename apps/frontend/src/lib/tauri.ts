/**
 * Tauri bridge utilities.
 * All Tauri-specific code is isolated here so the web build
 * continues to work unchanged when not running inside Tauri.
 */

/** True when running inside the Tauri desktop shell */
export const isTauri = (): boolean =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

/** Call a Tauri command. No-ops gracefully in the browser. */
export async function tauriInvoke<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T | null> {
  if (!isTauri()) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { invoke } = await import('@tauri-apps/api/core' as any);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  return (invoke as (cmd: string, a?: Record<string, unknown>) => Promise<T>)(command, args);
}

/** Open a URL in the system browser (Tauri only) */
export async function openExternal(url: string): Promise<void> {
  if (!isTauri()) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { open } = await import('@tauri-apps/plugin-shell' as any);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  await (open as (u: string) => Promise<void>)(url);
}

/** Get the app version */
export async function getAppVersion(): Promise<string> {
  if (!isTauri()) return import.meta.env.VITE_APP_VERSION ?? '0.1.0';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { getVersion } = await import('@tauri-apps/api/app' as any);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  return (getVersion as () => Promise<string>)();
}
