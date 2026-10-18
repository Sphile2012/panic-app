import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backend = env.SUPABASE_URL || 'http://localhost:8000';
  const anonKey = env.SUPABASE_ANON_KEY;
  const proxyApiKey = 'panic-ring-public-proxy-key';
  const serverProxy = {
    '/api/what3words': {
      target: 'https://api.what3words.com',
      changeOrigin: true,
      rewrite: (path: string) => path.replace(/^\/api\/what3words/, '/v3/convert-to-3wa'),
      configure: (server: any) => {
        server.on('proxyReq', (proxyReq, req) => {
          const requestUrl = new URL(req.url ?? '/', 'http://localhost');
          if (env.WHAT3WORDS_API_KEY)
            requestUrl.searchParams.set('key', env.WHAT3WORDS_API_KEY);
          proxyReq.path = `/v3/convert-to-3wa${requestUrl.search}`;
        });
      },
    },
    '/api': {
      target: backend,
      changeOrigin: true,
      ws: true,
      rewrite: (path: string) => path.replace(/^\/api/, ''),
      configure: (server: any) => {
        server.on('proxyReq', (proxyReq, req) => {
          if (!anonKey)
            return;
          proxyReq.setHeader('apikey', anonKey);
          if (proxyReq.getHeader('authorization') === `Bearer ${proxyApiKey}`)
            proxyReq.setHeader('authorization', `Bearer ${anonKey}`);
        });
      },
    },
  };

  return {
    root: '.',
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      proxy: serverProxy,
    },
    preview: {
      host: '0.0.0.0',
      port: 4173,
      strictPort: true,
      proxy: serverProxy,
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
