import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backend = env.VITE_SUPABASE_URL || 'http://localhost:8000';
  // The browser only talks to /api on this origin; the backend address stays server-side.
  const proxy = {
    '/api': {
      target: backend,
      changeOrigin: true,
      ws: true,
      rewrite: (p: string) => p.replace(/^\/api/, ''),
    },
  };

  return {
    root: '.',
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      proxy,
    },
    preview: {
      host: '0.0.0.0',
      port: 4173,
      strictPort: true,
      proxy,
    },

    build: {
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 500,

      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          dashboard: resolve(__dirname, 'dashboard.html'),
          track: resolve(__dirname, 'track.html'),
        },

        output: {
          manualChunks: {
            vendor: ['@supabase/supabase-js'],
          },
        },
      },
    },
  };
});
