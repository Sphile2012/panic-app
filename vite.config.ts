import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
  },

  build: {
    outDir:        'dist',
    sourcemap:     false,          // no sourcemaps in production build
    chunkSizeWarningLimit: 500,    // kB — suppress false alarms on Supabase bundle

    rollupOptions: {
      input: {
        main:      resolve(__dirname, 'index.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
      },

      output: {
        // Split Supabase into its own chunk so it can be cached separately
        manualChunks: {
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },

});
