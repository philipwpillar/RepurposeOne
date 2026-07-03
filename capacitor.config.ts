import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.voiceora.app',
  appName: 'Voiceora',
  webDir: 'public',
  server: {
    url: 'https://repurpose-one-seven.vercel.app',
    cleartext: false,
  },
};

export default config;
