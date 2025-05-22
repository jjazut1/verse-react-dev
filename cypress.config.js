import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    setupNodeEvents(on, config) {
      // implement node event listeners here
      on('before:browser:launch', (browser, launchOptions) => {
        // This helps with Firebase auth in Cypress
        if (browser.name === 'chrome' && browser.isHeadless) {
          launchOptions.args.push('--disable-features=IsolateOrigins,site-per-process');
        }
        return launchOptions;
      });
    },
    // Increase timeouts for Firebase operations
    defaultCommandTimeout: 10000,
    requestTimeout: 15000,
    // Add environment variables for testing
    env: {
      // Firebase emulator settings if you're using them
      useEmulator: false,
      firestoreEmulatorHost: 'localhost:8080',
      authEmulatorHost: 'localhost:9099',
    },
  },
  // Configure viewports for responsive testing
  viewportWidth: 1280,
  viewportHeight: 720,
  // Retry failed tests
  retries: {
    runMode: 2,
    openMode: 0,
  },
  // Record video only on failure in CI
  video: false,
}); 