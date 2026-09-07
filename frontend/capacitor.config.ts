import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'sv.gob.rnpn.suvt',
  appName: 'RNPN Trazabilidad',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;