import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ourhome.dashboard',
  appName: 'Our Home',
  webDir: 'dist',
  backgroundColor: '#f6f1e8',
  server: {
    // The tablet opens the published site so a Pages deploy updates the kitchen
    // without a new APK. allowNavigation keeps that host, and the local error
    // page, inside the app instead of handing them to Chrome.
    url: 'https://siansari11.github.io/home-assistant/',
    androidScheme: 'https',
    allowNavigation: ['siansari11.github.io', 'localhost'],
    errorPath: 'offline.html',
  },
  android: {
    backgroundColor: '#f6f1e8',
    captureInput: true,
  },
};

export default config;
