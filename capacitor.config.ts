import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lumino.learning',
  appName: 'Lumino Learning',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#4299E1",
      showSpinner: false
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: "#4299E1"
    },
    Keyboard: {
      resize: 'body'
    }
  },
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
    backgroundColor: '#ffffff'
  }
};

export default config; 