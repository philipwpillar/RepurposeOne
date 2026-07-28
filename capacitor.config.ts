import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.voiceora.io',
  appName: 'Voiceora',
  webDir: 'public',
  server: {
    url: 'https://voiceora.io',
    cleartext: false,
  },
};

export default config;
