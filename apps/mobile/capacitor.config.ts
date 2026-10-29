import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.tally.app',
  appName: 'Tally.io',
  webDir: '../frontend/dist',
  server: {
    // In development, point to the Vite dev server
    // Comment this out for production builds
    url: process.env['CAPACITOR_DEV_SERVER'] ?? undefined,
    cleartext: true,
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    },
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: process.env['NODE_ENV'] !== 'production',
  },
  plugins: {
    Camera: {
      // Camera used for barcode scanning
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#3730a3',
      sound: 'beep',
    },
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
