import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({ command }) => {
  // Production builds ALWAYS use .env.production (never .env), no matter
  // which --mode flag is passed. Real process env still wins over file values.
  if (command === 'build') {
    const prod = loadEnv('production', process.cwd());
    for (const [k, v] of Object.entries(prod)) {
      if (process.env[k] === undefined && v !== undefined) process.env[k] = v;
    }
  }
  return {
    plugins: [react(), tailwindcss()],
    // IMPORTANT: @vitejs/plugin-react injects its preamble as
    // `import ... from "<base>@react-refresh"` and only resolves the
    // absolute path "/@react-refresh". A relative base ('./') rewrites the
    // preamble to "./@react-refresh", which fails to resolve, so
    // window.$RefreshReg$ is never set and every transformed file throws
    // "@vitejs/plugin-react can't detect preamble. Something is wrong."
    // Use '/' in dev (serve) and only './' for the production build
    // (Electron file:// + portable dist needs relative assets).
    base: command === 'build' ? './' : '/',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      allowedHosts: ['openpost.hyvercode.com'],
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify - file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api': {
          target: process.env.VITE_API_URL || 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  };
});
