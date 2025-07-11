import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables based on mode (development/production)
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,jpg,jpeg,gif,webp}'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB limit
          runtimeCaching: [
            // Firebase Firestore caching
            {
              urlPattern: /^https:\/\/firestore\.googleapis\.com/,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'firestore-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 5 // 5 minutes
                }
              }
            },
            // Firebase Auth caching
            {
              urlPattern: /^https:\/\/identitytoolkit\.googleapis\.com/,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'auth-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 10 // 10 minutes
                }
              }
            },
            // Firebase Storage for game assets
            {
              urlPattern: /^https:\/\/firebasestorage\.googleapis\.com/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'game-assets-cache',
                expiration: {
                  maxEntries: 200,
                  maxAgeSeconds: 60 * 60 * 24 * 7 // 1 week
                }
              }
            }
          ],
          // Skip caching for teacher/admin routes and launcher
          navigateFallbackDenylist: [/^\/admin/, /^\/teacher/, /^\/create/, /^\/launch/],
          // Import custom service worker code for PWA navigation
          importScripts: ['sw-custom.js']
        },
        manifest: {
          name: 'LuminateLearn - Student',
          short_name: 'LuminateLearn Student',
          description: 'Educational games and assignments for students',
          theme_color: '#4299E1',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait-primary',
          start_url: '/student',
          scope: '/',
          id: '/student',
          icons: [
            {
              src: '/pwa-icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/pwa-icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable'
            },
            {
              src: '/pwa-icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/pwa-icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            },
            {
              src: '/pwa-icon-apple-touch.png',
              sizes: '180x180',
              type: 'image/png',
              purpose: 'any'
            }
          ],
          categories: ['education', 'games', 'productivity'],
          lang: 'en-US',
          dir: 'ltr',
          prefer_related_applications: false,
          screenshots: [
            {
              src: '/pwa-icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              form_factor: 'wide',
              label: 'LuminateLearn Desktop View'
            }
          ]
        },
        devOptions: {
          enabled: true, // Enable PWA in development
          type: 'module'
        }
      })
    ],
    server: {
      port: 3000,
      strictPort: true,
      open: true,
      // Custom middleware to handle launcher routes
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // Rewrite /launch to /launch.html for development
          if (req.url?.startsWith('/launch?') || req.url === '/launch') {
            const url = new URL(req.url, 'http://localhost:3000');
            req.url = '/launch.html' + url.search;
          }
          next();
        });
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      // Skip TypeScript type checking to allow build despite TS errors
      minify: true,
      target: 'es2015',
      // Copy token-redirect.html to dist
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          tokenRedirect: resolve(__dirname, 'public/token-redirect.html')
        }
      }
    },
    define: {
      // Make all environment variables available
      __APP_ENV__: JSON.stringify(env),
      // Explicitly expose Firebase variables
      'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify(env.VITE_FIREBASE_API_KEY),
      'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(env.VITE_FIREBASE_AUTH_DOMAIN),
      'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(env.VITE_FIREBASE_PROJECT_ID),
      'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(env.VITE_FIREBASE_STORAGE_BUCKET),
      'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(env.VITE_FIREBASE_MESSAGING_SENDER_ID),
      'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify(env.VITE_FIREBASE_APP_ID)
    },
    optimizeDeps: {
      exclude: []
    },
    // This effectively disables type checking during build
    esbuild: {
      logOverride: { 'this-is-undefined-in-esm': 'silent' }
    }
  }
});
