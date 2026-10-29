/**
 * Capacitor bridge utilities.
 * Isolated so the web/desktop builds continue working unchanged.
 */

export const isCapacitor = (): boolean =>
  typeof window !== 'undefined' && 'Capacitor' in window;

export const isNativeMobile = (): boolean => {
  if (!isCapacitor()) return false;
  // @ts-expect-error Capacitor global
  const platform = window.Capacitor?.getPlatform?.() as string | undefined;
  return platform === 'android' || platform === 'ios';
};

/** Monitor network connectivity via Capacitor Network plugin (mobile only) */
export async function initNetworkListener(
  onOnline: () => void,
  onOffline: () => void,
): Promise<(() => void) | null> {
  if (!isCapacitor()) return null;

  const { Network } = await import('@capacitor/network');
  const status = await Network.getStatus();

  if (!status.connected) onOffline();
  else onOnline();

  const handle = await Network.addListener('networkStatusChange', (s) => {
    if (s.connected) onOnline();
    else onOffline();
  });

  return () => void handle.remove();
}

/** Request camera permission and scan a barcode (Android/iOS only) */
export async function scanBarcode(): Promise<string | null> {
  if (!isNativeMobile()) {
    // On web, fall back to text input — real scanner sends keyboard events
    return null;
  }

  try {
    // Use Camera plugin to capture image, then pass to a JS barcode decoder
    const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
    const photo = await Camera.getPhoto({
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
      quality: 90,
      allowEditing: false,
    });

    // Decode barcode from the captured image using ZXing (loaded on demand)
    if (!photo.dataUrl) return null;
    // @ts-expect-error - @zxing/browser is an optional dependency loaded at runtime
    const { BrowserMultiFormatReader } = await import('@zxing/browser');
    const reader = new (BrowserMultiFormatReader as new () => { decodeFromImageElement: (img: HTMLImageElement) => Promise<{ getText: () => string }> })();
    const img = new Image();
    img.src = photo.dataUrl;
    await new Promise((resolve) => { img.onload = resolve; });
    const result = await reader.decodeFromImageElement(img);
    return result.getText();
  } catch {
    return null;
  }
}
