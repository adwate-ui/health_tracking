import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.totalmacro',
  appName: 'TotalMacro',
  webDir: 'dist',
  server: {
    // Use https scheme on Android to avoid mixed-content issues with Supabase
    androidScheme: 'https',
  },
  plugins: {
    // SplashScreen: remove default delay so the PWA loading screen shows immediately
    SplashScreen: {
      launchShowDuration: 0,
    },
  },
};

export default config;
